"use client";

import { useState } from "react";
import type { Event } from "@/types/database";

interface MonthlyViewProps {
  events: Event[];
  onSelectDate: (date: string) => void;
  onAddEvent: (event: Omit<Event, "id" | "user_id">) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sun,1=Mon,...,6=Sat → convert to Mon-based (0=Mon,...,6=Sun)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MonthlyView({ events, onSelectDate }: MonthlyViewProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month); // 0=Mon
  const daysInPrevMonth = getDaysInMonth(year, month === 0 ? 11 : month - 1);
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthIndex = month === 0 ? 11 : month - 1;

  // Build 6×7 grid cells
  const cells: { dateStr: string; isCurrentMonth: boolean; day: number }[] = [];

  // Trailing days from previous month
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      dateStr: toDateStr(prevYear, prevMonthIndex, d),
      isCurrentMonth: false,
      day: d,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), isCurrentMonth: true, day: d });
  }

  // Leading days from next month to fill 6 rows (42 cells)
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthIndex = month === 11 ? 0 : month + 1;
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      dateStr: toDateStr(nextYear, nextMonthIndex, nextDay++),
      isCurrentMonth: false,
      day: nextDay - 1,
    });
  }

  // Map events by date for quick lookup
  const eventsByDate: Record<string, Event[]> = {};
  for (const event of events) {
    // Add event to every date in its range
    const start = new Date(event.start_date + "T00:00:00");
    const end = new Date(event.end_date + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().split("T")[0];
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(event);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const dayHeaders = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="bg-white rounded-card shadow-card p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-warm-400 hover:bg-warm-100 transition-colors"
        >
          ←
        </button>
        <span className="text-base font-semibold text-warm-700">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-warm-400 hover:bg-warm-100 transition-colors"
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-warm-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-warm-100 rounded-xl overflow-hidden">
        {cells.map(({ dateStr, isCurrentMonth, day }) => {
          const isToday = dateStr === todayStr;
          const cellEvents = eventsByDate[dateStr] ?? [];

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`
                bg-white p-1 min-h-[56px] flex flex-col items-start gap-0.5
                hover:bg-warm-50 transition-colors text-left
                ${!isCurrentMonth ? "opacity-40" : ""}
              `}
            >
              {/* Day number */}
              <div className="w-full flex justify-center mb-0.5">
                <span
                  className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday
                      ? "bg-warm-500 text-white font-semibold"
                      : isCurrentMonth
                        ? "text-warm-600"
                        : "text-warm-200"
                    }
                  `}
                >
                  {day}
                </span>
              </div>

              {/* Event bars (max 2 visible + overflow indicator) */}
              <div className="w-full space-y-0.5">
                {cellEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className="w-full h-1.5 rounded-full truncate"
                    style={{ backgroundColor: ev.color || "#d4c4b0" }}
                    title={ev.title}
                  />
                ))}
                {cellEvents.length > 2 && (
                  <div className="text-[9px] text-warm-400 leading-none pl-0.5">
                    +{cellEvents.length - 2}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
