"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, getWeekStart, getWeekDates } from "@/lib/utils/date";
import { getActiveDays, isNumericAchieved, calcAchievementRate } from "@/lib/utils/stats";
import { demoTemplates, demoLogs } from "@/lib/demo-data";

export interface WeeklyItemStat {
  template: BasicsTemplate;
  dailyLogs: Record<string, BasicsLog | null>; // date → log
  achievementRate: number;
}

export interface WeeklyStats {
  weekDates: string[];
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
  items: WeeklyItemStat[];
  loading: boolean;
}

export function useWeeklyStats(
  dayStartTime: string = "04:00",
  includeInactive: boolean = false,
  referenceDate?: string
): WeeklyStats {
  const [items, setItems] = useState<WeeklyItemStat[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();

      const today = referenceDate ?? getLogicalDate(dayStartTime);
      const weekStart = getWeekStart(today);
      const dates = getWeekDates(today);

      // Query templates
      let templateQuery = supabase
        .from("basics_templates")
        .select("*")
        .order("category")
        .order("sort_order");

      if (!includeInactive) {
        templateQuery = templateQuery.eq("is_active", true);
      }

      const { data: templates } = await templateQuery;

      if (!templates || templates.length === 0) {
        setWeekDates(dates);
        setItems([]);
        setLoading(false);
        return;
      }

      const templateIds = templates.map((t: BasicsTemplate) => t.id);

      // Query logs for the week range
      const { data: logs } = await supabase
        .from("basics_logs")
        .select("*")
        .in("template_id", templateIds)
        .gte("date", weekStart)
        .lte("date", dates[6]);

      const logsArray: BasicsLog[] = logs ?? [];

      // Build per-item stats
      const result: WeeklyItemStat[] = templates.map((template: BasicsTemplate) => {
        // Build dailyLogs map: date → log or null
        const dailyLogs: Record<string, BasicsLog | null> = {};
        for (const date of dates) {
          const found = logsArray.find(
            (l) => l.template_id === template.id && l.date === date
          );
          dailyLogs[date] = found ?? null;
        }

        // Calculate active days in this week
        const activeDays = getActiveDays(
          template.created_at,
          template.deactivated_at,
          weekStart,
          today
        );

        // Count achieved days
        let achievedDays = 0;
        for (const date of dates) {
          const log = dailyLogs[date];
          if (!log) continue;
          if (template.type === "check") {
            if (log.completed) achievedDays++;
          } else {
            if (isNumericAchieved(log.value, template.target_value)) achievedDays++;
          }
        }

        const achievementRate = calcAchievementRate(achievedDays, activeDays);

        return { template, dailyLogs, achievementRate };
      });

      setWeekDates(dates);
      setItems(result);
    } catch {
      // Fallback to demo data on error
      const today = getLogicalDate(dayStartTime);
      const dates = getWeekDates(today);

      const result: WeeklyItemStat[] = demoTemplates.map((template: BasicsTemplate) => {
        const dailyLogs: Record<string, BasicsLog | null> = {};
        for (const date of dates) {
          const found = demoLogs.find(
            (l) => l.template_id === template.id && l.date === date
          );
          dailyLogs[date] = found ?? null;
        }

        return { template, dailyLogs, achievementRate: 0 };
      });

      setWeekDates(dates);
      setItems(result);
    }
    setLoading(false);
  }, [dayStartTime, includeInactive, referenceDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute aggregates from items
  const activeItems = items.filter((s) => s.template.is_active);
  const spiritualItems = activeItems.filter((s) => s.template.category === "spiritual");
  const physicalItems = activeItems.filter((s) => s.template.category === "physical");

  const avg = (arr: WeeklyItemStat[]) =>
    arr.length === 0
      ? 0
      : Math.round(arr.reduce((sum, s) => sum + s.achievementRate, 0) / arr.length);

  const overallRate = avg(activeItems);
  const spiritualRate = avg(spiritualItems);
  const physicalRate = avg(physicalItems);

  return {
    weekDates,
    overallRate,
    spiritualRate,
    physicalRate,
    items,
    loading,
  };
}
