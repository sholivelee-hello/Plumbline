"use client";

import { useMemo, useState } from "react";
import { TimeBlock } from "./time-block";
import { BlockActionSheet } from "./block-action-sheet";
import { generateTimeSlots, getLogicalDate } from "@/lib/utils/date";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { SchedulePlan, ScheduleActual, Event } from "@/types/database";
import { EventsStrip } from "./events-strip";

interface WeeklyViewProps {
  weekDates: string[];
  plans: SchedulePlan[];
  actuals: ScheduleActual[];
  dayStartTime: string;
  dayEndTime: string;
  timeUnit: number;
  onCompletePlan: (plan: SchedulePlan) => void;
  onEditComplete: (plan: SchedulePlan) => void;
  onDeletePlan: (planId: string) => void;
  onAddSlot?: (date: string, startTime: string | undefined, asActual: boolean) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function WeeklyView({
  weekDates,
  plans,
  actuals,
  dayStartTime,
  dayEndTime,
  timeUnit,
  onCompletePlan,
  onEditComplete,
  onDeletePlan,
  onAddSlot,
  events,
  onEventClick,
}: WeeklyViewProps) {
  const todayStr = getLogicalDate(dayStartTime);
  const [selectedPlan, setSelectedPlan] = useState<SchedulePlan | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const idx = weekDates.indexOf(todayStr);
    return idx >= 0 ? idx : 0;
  });

  const timeSlots = useMemo(
    () => generateTimeSlots(dayStartTime, dayEndTime, timeUnit),
    [dayStartTime, dayEndTime, timeUnit]
  );
  const slotHeight = 48;
  const totalHeight = timeSlots.length * slotHeight;

  const isMdUp = useMediaQuery("(min-width: 768px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  // 모바일: 1일, 태블릿: 3일, 데스크톱: 7일
  const visibleCount = isLgUp ? 7 : isMdUp ? 3 : 1;

  const startIdx = Math.min(
    Math.max(0, activeIndex),
    Math.max(0, weekDates.length - visibleCount)
  );
  const visibleDates = weekDates.slice(startIdx, startIdx + visibleCount);

  function step(delta: number) {
    setActiveIndex((prev) =>
      Math.min(
        Math.max(0, prev + delta),
        Math.max(0, weekDates.length - visibleCount)
      )
    );
  }

  function handleColumnClick(
    date: string,
    e: React.MouseEvent<HTMLDivElement>,
    col: "plan" | "actual"
  ) {
    if (!onAddSlot) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-time-block]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor(y / (slotHeight / timeUnit));
    const [dayH, dayM] = dayStartTime.split(":").map(Number);
    const abs = dayH * 60 + dayM + Math.floor(minutes / timeUnit) * timeUnit;
    const h = String(Math.floor((abs / 60) % 24)).padStart(2, "0");
    const m = String(abs % 60).padStart(2, "0");
    onAddSlot(date, `${h}:${m}`, col === "actual");
  }

  return (
    <div className="space-y-2">
      {/* 모바일 네비게이션: 일간/3일 이동 */}
      {visibleCount < 7 && (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => step(-visibleCount)}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f242e] tap-press"
            disabled={startIdx === 0}
          >
            ◀ 이전
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {visibleDates[0]}
            {visibleCount > 1 && ` ~ ${visibleDates[visibleDates.length - 1]}`}
          </span>
          <button
            type="button"
            onClick={() => step(visibleCount)}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f242e] tap-press"
            disabled={startIdx + visibleCount >= weekDates.length}
          >
            다음 ▶
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `48px repeat(${visibleCount}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {visibleDates.map((date) => {
            const weekdayIdx = new Date(date + "T00:00:00").getDay();
            const isToday = date === todayStr;
            return (
              <div
                key={date}
                className={`text-center py-2 rounded-t-lg ${
                  isToday ? "bg-primary-50 dark:bg-[#2a2e45]" : ""
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    isToday
                      ? "text-primary-600 dark:text-primary-200"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {DAY_LABELS[weekdayIdx]}
                </p>
                <p
                  className={`text-xs tabular-nums ${
                    isToday
                      ? "text-primary-500 dark:text-primary-300"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {Number(date.slice(8))}일
                </p>
                <div className="flex justify-center gap-2 text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                  <span>계획</span>
                  <span>실제</span>
                </div>
              </div>
            );
          })}
        </div>

        {visibleCount === 7 && (
          <EventsStrip
            weekDates={weekDates}
            events={events}
            onEventClick={onEventClick}
          />
        )}

        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `48px repeat(${visibleCount}, minmax(0, 1fr))`,
          }}
        >
          {/* Time labels */}
          <div>
            {timeSlots.map((t) => (
              <div
                key={t}
                style={{ height: `${slotHeight}px` }}
                className="text-[10px] text-gray-400 dark:text-gray-500 text-right pr-2 pt-0.5 tabular-nums"
              >
                {t}
              </div>
            ))}
          </div>

          {visibleDates.map((date) => {
            const dayPlans = plans.filter((p) => p.date === date);
            const dayActuals = actuals.filter((a) => a.date === date);
            const isToday = date === todayStr;

            return (
              <div key={date} className="grid grid-cols-2 gap-px">
                {/* Plan column */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleColumnClick(date, e, "plan")}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onAddSlot) {
                      e.preventDefault();
                      onAddSlot(date, undefined, false);
                    }
                  }}
                  className={`relative rounded-lg cursor-pointer transition-colors ${
                    isToday
                      ? "bg-primary-50/50 dark:bg-[#2a2e45]/60"
                      : "bg-gray-50 dark:bg-[#1f242e] hover:bg-gray-100 dark:hover:bg-[#262c38]"
                  }`}
                  style={{ height: `${totalHeight}px` }}
                >
                  {dayPlans.map((p) => (
                    <div key={p.id} data-time-block onClick={(e) => e.stopPropagation()}>
                      <TimeBlock
                        block={p}
                        timeUnit={timeUnit}
                        dayStartTime={dayStartTime}
                        onClick={() => setSelectedPlan(p)}
                      />
                    </div>
                  ))}
                  {dayPlans.length === 0 && onAddSlot && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">
                        + 탭해서 추가
                      </span>
                    </div>
                  )}
                </div>
                {/* Actual column */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleColumnClick(date, e, "actual")}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onAddSlot) {
                      e.preventDefault();
                      onAddSlot(date, undefined, true);
                    }
                  }}
                  className={`relative rounded-lg cursor-pointer transition-colors ${
                    isToday
                      ? "bg-primary-100/50 dark:bg-[#2a2e45]"
                      : "bg-primary-50/60 dark:bg-[#1a1e2d] hover:bg-primary-100/60 dark:hover:bg-[#1f2435]"
                  }`}
                  style={{ height: `${totalHeight}px` }}
                >
                  {dayActuals.map((a) => (
                    <div key={a.id} data-time-block onClick={(e) => e.stopPropagation()}>
                      <TimeBlock
                        block={a}
                        timeUnit={timeUnit}
                        dayStartTime={dayStartTime}
                        onClick={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BlockActionSheet
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onComplete={onCompletePlan}
        onEditComplete={onEditComplete}
        onDelete={onDeletePlan}
      />
    </div>
  );
}
