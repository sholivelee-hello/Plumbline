"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Event } from "@/types/database";

interface MonthlyViewProps {
  events: Event[];
  onDateTap: (date: string) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // Sunday-based (0=Sun, 6=Sat)
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MonthlyView({ events, onDateTap }: MonthlyViewProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month === 0 ? 11 : month - 1);
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthIndex = month === 0 ? 11 : month - 1;

  const cells: { dateStr: string; isCurrentMonth: boolean; day: number }[] = [];

  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      dateStr: toDateStr(prevYear, prevMonthIndex, d),
      isCurrentMonth: false,
      day: d,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), isCurrentMonth: true, day: d });
  }
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

  const eventsByDate: Record<string, Event[]> = {};
  for (const event of events) {
    const start = new Date(event.start_date + "T00:00:00");
    const end = new Date(event.end_date + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().split("T")[0];
      (eventsByDate[key] ??= []).push(event);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const dayHeaders = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white dark:bg-[#161a22] rounded-card shadow-card border border-gray-100 dark:border-[#262c38] p-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={prevMonth}
          aria-label="이전 달"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          aria-label="다음 달"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-[#262c38] rounded-xl overflow-hidden">
        {cells.map(({ dateStr, isCurrentMonth, day }) => {
          const isToday = dateStr === todayStr;
          const cellEvents = eventsByDate[dateStr] ?? [];
          return (
            <div
              key={dateStr}
              className={`bg-white dark:bg-[#161a22] p-1 min-h-[82px] flex flex-col gap-1 ${
                !isCurrentMonth ? "opacity-40" : ""
              }`}
            >
              <div className="w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => onDateTap(dateStr)}
                  aria-label={`${dateStr} 보기`}
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors tap-press ${
                    isToday
                      ? "bg-primary-500 text-white font-semibold"
                      : isCurrentMonth
                      ? "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f242e]"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                >
                  {day}
                </button>
              </div>
              <div className="flex-1 space-y-0.5 min-h-0">
                {cellEvents.slice(0, 3).map((ev) => (
                  <button
                    key={`${ev.id}-${dateStr}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateTap(dateStr);
                    }}
                    className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate tap-press"
                    style={{
                      backgroundColor: (ev.color || "#d4c4b0") + "28",
                      color: ev.color || "#7575d8",
                    }}
                    title={ev.title}
                  >
                    {ev.title}
                  </button>
                ))}
                {cellEvents.length > 3 && (
                  <div className="text-[9px] text-gray-400 dark:text-gray-500 leading-none pl-0.5">
                    +{cellEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
