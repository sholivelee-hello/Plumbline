"use client";

import type { Event } from "@/types/database";

interface EventsStripProps {
  weekDates: string[];
  events: Event[];
  onEventClick: (event: Event) => void;
}

interface Lane {
  rows: Array<{ event: Event; startCol: number; span: number }>;
}

/**
 * Arrange events into non-overlapping lanes for the 7-day grid.
 * Each event clipped to the visible week (weekDates[0]..weekDates[6]).
 */
function arrangeLanes(weekDates: string[], events: Event[]): Lane[] {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const clipped = events
    .filter((e) => e.end_date >= weekStart && e.start_date <= weekEnd)
    .map((e) => {
      const from = e.start_date < weekStart ? weekStart : e.start_date;
      const to = e.end_date > weekEnd ? weekEnd : e.end_date;
      return {
        event: e,
        startCol: weekDates.indexOf(from),
        span: weekDates.indexOf(to) - weekDates.indexOf(from) + 1,
      };
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const lanes: Lane[] = [];
  for (const item of clipped) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane.rows[lane.rows.length - 1];
      if (!last || last.startCol + last.span <= item.startCol) {
        lane.rows.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push({ rows: [item] });
  }
  return lanes;
}

export function EventsStrip({ weekDates, events, onEventClick }: EventsStripProps) {
  const lanes = arrangeLanes(weekDates, events);
  if (lanes.length === 0) return null;

  return (
    <div className="space-y-0.5 py-1">
      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className="grid gap-px"
          style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
        >
          {/* Spacer matching the time-labels column in the grid below */}
          <div />
          {Array.from({ length: 7 }).map((_, col) => {
            const row = lane.rows.find((r) => r.startCol === col);
            if (!row) {
              const covered = lane.rows.some(
                (r) => r.startCol < col && r.startCol + r.span > col
              );
              return covered ? null : <div key={col} />;
            }
            return (
              <button
                key={col}
                type="button"
                onClick={() => onEventClick(row.event)}
                className="text-left truncate text-[11px] font-medium leading-tight rounded px-1.5 py-0.5 bg-primary-50 text-primary-600 dark:bg-[#2a2e45] dark:text-primary-200"
                style={{
                  gridColumn: `span ${row.span} / span ${row.span}`,
                }}
                title={row.event.title}
              >
                {row.event.title}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
