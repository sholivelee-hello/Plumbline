"use client";

import { useState } from "react";
import { TimeBlock } from "./time-block";
import { BlockActionSheet } from "./block-action-sheet";
import { generateTimeSlots } from "@/lib/utils/date";
import type { SchedulePlan, ScheduleActual } from "@/types/database";

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
}

export function WeeklyView({
  weekDates, plans, actuals,
  dayStartTime, dayEndTime, timeUnit,
  onCompletePlan, onEditComplete, onDeletePlan,
}: WeeklyViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<SchedulePlan | null>(null);
  const timeSlots = generateTimeSlots(dayStartTime, dayEndTime, timeUnit);
  const slotHeight = 48;
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "800px" }}>
        {/* Header */}
        <div className="grid gap-px" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
          <div />
          {weekDates.map((date, i) => (
            <div key={date} className="text-center py-2">
              <p className="text-sm font-semibold text-warm-600">{days[i]}</p>
              <p className="text-xs text-warm-400">{date.slice(8)}</p>
              <div className="flex justify-center gap-2 text-[10px] text-warm-300 mt-1">
                <span>계획</span><span>실제</span>
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid gap-px" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
          {/* Time labels */}
          <div>
            {timeSlots.map((t) => (
              <div key={t} style={{ height: `${slotHeight}px` }}
                className="text-[10px] text-warm-400 text-right pr-2 pt-0.5">
                {t}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const dayPlans = plans.filter((p) => p.date === date);
            const dayActuals = actuals.filter((a) => a.date === date);
            const totalHeight = timeSlots.length * slotHeight;

            return (
              <div key={date} className="grid grid-cols-2 gap-px">
                {/* Plan column */}
                <div
                  className="relative bg-cream-100 rounded-lg"
                  style={{ height: `${totalHeight}px` }}
                  onClick={() => {}}
                >
                  {dayPlans.map((p) => (
                    <TimeBlock
                      key={p.id}
                      block={p}
                      timeUnit={timeUnit}
                      dayStartTime={dayStartTime}
                      onClick={() => setSelectedPlan(p)}
                    />
                  ))}
                </div>
                {/* Actual column */}
                <div
                  className="relative bg-sage-50 rounded-lg"
                  style={{ height: `${totalHeight}px` }}
                >
                  {dayActuals.map((a) => (
                    <TimeBlock
                      key={a.id}
                      block={a}
                      timeUnit={timeUnit}
                      dayStartTime={dayStartTime}
                      onClick={() => {}}
                    />
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
