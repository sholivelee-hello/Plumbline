"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, getCurrentMonth } from "@/lib/utils/date";
import {
  getActiveDays,
  isNumericAchieved,
  calcAchievementRate,
  getDailyAchievementRate,
  getMonthWeeks,
  isTemplateActiveOnDate,
} from "@/lib/utils/stats";
import { demoTemplates, demoLogs } from "@/lib/demo-data";
import {
  fetchVirtualBasicsItems,
  fetchDailyVirtualResults,
} from "@/lib/bible/virtual-items";
import { FIXED_USER_ID } from "@/lib/constants";

export interface MonthlyItemStat {
  template: BasicsTemplate;
  dailyLogs: Record<string, BasicsLog | null>;
  achievementRate: number;
}

export interface DailyRate {
  date: string;
  rate: number;
}

export interface WeekComparison {
  label: string;
  spiritualRate: number;
  physicalRate: number;
}

export interface MonthlyStats {
  month: string; // "YYYY-MM"
  monthDates: string[];
  today: string;
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
  dailyRates: DailyRate[];
  weekComparisons: WeekComparison[];
  items: MonthlyItemStat[];
  loading: boolean;
}

export function useMonthlyStats(
  includeInactive: boolean = false,
  targetMonth?: string
): MonthlyStats {
  const [items, setItems] = useState<MonthlyItemStat[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [today, setToday] = useState(getLogicalDate());
  const [dailyRates, setDailyRates] = useState<DailyRate[]>([]);
  const [weekComparisons, setWeekComparisons] = useState<WeekComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();

      // 1. Compute dates inside the callback to avoid unstable references
      const currentToday = getLogicalDate();
      const currentMonth = targetMonth ?? getCurrentMonth();
      const [year, mon] = currentMonth.split("-").map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      const monthStart = `${currentMonth}-01`;
      const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

      const dates: string[] = [];
      for (let d = 1; d <= lastDay; d++) {
        dates.push(`${currentMonth}-${String(d).padStart(2, "0")}`);
      }

      // 2. Set date state
      setMonth(currentMonth);
      setMonthDates(dates);
      setToday(currentToday);

      // 3. Query templates
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
        setItems([]);
        setDailyRates([]);
        setWeekComparisons([]);
        setLoading(false);
        return;
      }

      const templateIds = templates.map((t: BasicsTemplate) => t.id);

      // Query logs for the month range
      const { data: logs } = await supabase
        .from("basics_logs")
        .select("*")
        .in("template_id", templateIds)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const logsArray: BasicsLog[] = logs ?? [];

      // 4. Per-item stats
      const result: MonthlyItemStat[] = templates.map((template: BasicsTemplate) => {
        const dailyLogs: Record<string, BasicsLog | null> = {};
        for (const date of dates) {
          const found = logsArray.find(
            (l) => l.template_id === template.id && l.date === date
          );
          dailyLogs[date] = found ?? null;
        }

        // Active days: from month start to currentToday (capped by template lifecycle)
        const activeDays = getActiveDays(
          template.created_at,
          template.deactivated_at,
          monthStart,
          currentToday
        );

        let achievedDays = 0;
        for (const date of dates) {
          if (date > currentToday) break;
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

      // 5. Daily rates (heatmap) — virtual reading/meditation 합산
      const dailyVirtual = await fetchDailyVirtualResults(
        supabase,
        FIXED_USER_ID,
        dates,
        currentToday,
      );
      const computedDailyRates: DailyRate[] = [];
      for (const date of dates) {
        if (date > currentToday) break;

        // Filter templates active on this date
        const activeTemplatesOnDate = templates.filter((t: BasicsTemplate) =>
          isTemplateActiveOnDate(t, date),
        );

        const logsOnDate = logsArray.filter((l) => l.date === date);
        const tplRate = getDailyAchievementRate(activeTemplatesOnDate, logsOnDate);

        // Combine with virtual items: weighted by item count
        let totalActive = activeTemplatesOnDate.length;
        let totalAchieved =
          (tplRate / 100) * activeTemplatesOnDate.length;
        if (dailyVirtual.readingApplicable.has(date)) {
          totalActive++;
          if (dailyVirtual.readingDone.has(date)) totalAchieved++;
        }
        if (dailyVirtual.meditationApplicable.has(date)) {
          totalActive++;
          if (dailyVirtual.meditationDone.has(date)) totalAchieved++;
        }
        const rate =
          totalActive === 0 ? 0 : Math.round((totalAchieved / totalActive) * 100);
        computedDailyRates.push({ date, rate });
      }

      // 6. Week comparisons
      const weeks = getMonthWeeks(currentMonth);
      const computedWeekComparisons: WeekComparison[] = weeks.map((week) => {
        const weekDates = dates.filter((d) => {
          const day = parseInt(d.slice(8), 10);
          return day >= week.start && day <= week.end && d <= currentToday;
        });

        if (weekDates.length === 0) {
          return { label: week.label, spiritualRate: 0, physicalRate: 0 };
        }

        const spiritualTemplates = templates.filter(
          (t: BasicsTemplate) => t.category === "spiritual"
        );
        const physicalTemplates = templates.filter(
          (t: BasicsTemplate) => t.category === "physical"
        );

        const calcCategoryRate = (categoryTemplates: BasicsTemplate[]): number => {
          if (categoryTemplates.length === 0) return 0;
          let totalAchieved = 0;
          let totalActive = 0;
          for (const t of categoryTemplates) {
            const weekStart = weekDates[0];
            const weekEnd = weekDates[weekDates.length - 1];
            const activeDays = getActiveDays(
              t.created_at,
              t.deactivated_at,
              weekStart,
              weekEnd
            );
            totalActive += activeDays;
            for (const date of weekDates) {
              const log = logsArray.find(
                (l) => l.template_id === t.id && l.date === date
              );
              if (!log) continue;
              if (t.type === "check") {
                if (log.completed) totalAchieved++;
              } else {
                if (isNumericAchieved(log.value, t.target_value)) totalAchieved++;
              }
            }
          }
          return calcAchievementRate(totalAchieved, totalActive);
        };

        return {
          label: week.label,
          spiritualRate: calcCategoryRate(spiritualTemplates),
          physicalRate: calcCategoryRate(physicalTemplates),
        };
      });

      const virtualItems = await fetchVirtualBasicsItems({
        supabase,
        userId: FIXED_USER_ID,
        startDate: monthStart,
        endDate: monthEnd,
        dates,
        today: currentToday,
      });

      setItems([...result, ...virtualItems]);
      setDailyRates(computedDailyRates);
      setWeekComparisons(computedWeekComparisons);
    } catch {
      // Demo fallback on error
      const currentToday = getLogicalDate();
      const currentMonth = getCurrentMonth();
      const [year, mon] = currentMonth.split("-").map(Number);
      const lastDay = new Date(year, mon, 0).getDate();

      const dates: string[] = [];
      for (let d = 1; d <= lastDay; d++) {
        dates.push(`${currentMonth}-${String(d).padStart(2, "0")}`);
      }

      setMonth(currentMonth);
      setMonthDates(dates);
      setToday(currentToday);

      const result: MonthlyItemStat[] = demoTemplates.map((template: BasicsTemplate) => {
        const dailyLogs: Record<string, BasicsLog | null> = {};
        for (const date of dates) {
          const found = demoLogs.find(
            (l) => l.template_id === template.id && l.date === date
          );
          dailyLogs[date] = found ?? null;
        }
        return { template, dailyLogs, achievementRate: 0 };
      });

      setItems(result);
      setDailyRates([]);
      setWeekComparisons([]);
    }
    setLoading(false);
  }, [includeInactive, targetMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute aggregates from items (outside callback, same pattern as useWeeklyStats)
  const activeItems = items.filter((s) => s.template.is_active);
  const spiritualItems = activeItems.filter((s) => s.template.category === "spiritual");
  const physicalItems = activeItems.filter((s) => s.template.category === "physical");

  const avg = (arr: MonthlyItemStat[]) =>
    arr.length === 0
      ? 0
      : Math.round(arr.reduce((sum, s) => sum + s.achievementRate, 0) / arr.length);

  const overallRate = avg(activeItems);
  const spiritualRate = avg(spiritualItems);
  const physicalRate = avg(physicalItems);

  return {
    month,
    monthDates,
    today,
    overallRate,
    spiritualRate,
    physicalRate,
    dailyRates,
    weekComparisons,
    items,
    loading,
  };
}
