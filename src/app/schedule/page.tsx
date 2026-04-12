"use client";

import { useState } from "react";
import { WeeklyView } from "@/components/schedule/weekly-view";
import { MonthlyView } from "@/components/schedule/monthly-view";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { useEvents } from "@/lib/hooks/use-events";
import { useSettings } from "@/lib/hooks/use-settings";
import { getWeekStart, getLogicalDate } from "@/lib/utils/date";

export default function SchedulePage() {
  const { settings } = useSettings();
  const today = getLogicalDate(settings?.day_start_time);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const schedule = useSchedule(weekStart);
  const { events, addEvent } = useEvents();

  function prevWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }
  function nextWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-warm-700">일정</h1>
        <div className="flex gap-1 bg-warm-100 rounded-xl p-1">
          <button
            onClick={() => setView("weekly")}
            className={`px-3 py-1 rounded-lg text-sm ${view === "weekly" ? "bg-white text-warm-700 shadow-sm" : "text-warm-400"}`}
          >주간</button>
          <button
            onClick={() => setView("monthly")}
            className={`px-3 py-1 rounded-lg text-sm ${view === "monthly" ? "bg-white text-warm-700 shadow-sm" : "text-warm-400"}`}
          >월간</button>
        </div>
      </div>

      {view === "weekly" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={prevWeek} className="text-warm-400 px-2">←</button>
            <span className="text-warm-600 font-medium text-sm">
              {schedule.weekDates[0]} ~ {schedule.weekDates[6]}
            </span>
            <button onClick={nextWeek} className="text-warm-400 px-2">→</button>
          </div>
          <WeeklyView
            weekDates={schedule.weekDates}
            plans={schedule.plans}
            actuals={schedule.actuals}
            dayStartTime={settings?.day_start_time ?? "04:00"}
            dayEndTime={settings?.day_end_time ?? "00:00"}
            timeUnit={settings?.time_unit ?? 30}
            onCompletePlan={schedule.completePlan}
            onEditComplete={(plan) => schedule.editAndComplete(plan, {})}
            onDeletePlan={schedule.deletePlan}
          />
        </>
      )}

      {view === "monthly" && (
        <MonthlyView
          events={events}
          onSelectDate={(date) => {
            setWeekStart(getWeekStart(date));
            setView("weekly");
          }}
          onAddEvent={addEvent}
        />
      )}
    </div>
  );
}
