"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, toLocalDateString } from "@/lib/utils/date";
import {
  getDailyAchievementRate,
  isNumericAchieved,
  isTemplateActiveOnDate,
} from "@/lib/utils/stats";
import { fetchDailyVirtualResults } from "@/lib/bible/virtual-items";
import { FIXED_USER_ID } from "@/lib/constants";

export interface CategoryTrendPoint {
  date: string;
  spiritualRate: number | null;
  physicalRate: number | null;
}

export interface CategoryTrend {
  today: string;
  points: CategoryTrendPoint[];
  hasSpiritual: boolean;
  hasPhysical: boolean;
  loading: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

export function useBasicsCategoryTrend(days = 30): CategoryTrend {
  const [today, setToday] = useState<string>(() => getLogicalDate());
  const [points, setPoints] = useState<CategoryTrendPoint[]>([]);
  const [hasSpiritual, setHasSpiritual] = useState(false);
  const [hasPhysical, setHasPhysical] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const currentToday = getLogicalDate();
      const start = addDays(currentToday, -(days - 1));

      const dates: string[] = [];
      for (let i = 0; i < days; i++) {
        dates.push(addDays(start, i));
      }

      const { data: templates } = await supabase
        .from("basics_templates")
        .select("*")
        .order("category")
        .order("sort_order");

      const templatesArray: BasicsTemplate[] = templates ?? [];

      if (templatesArray.length === 0) {
        setToday(currentToday);
        setPoints(
          dates.map((d) => ({ date: d, spiritualRate: null, physicalRate: null })),
        );
        setHasSpiritual(false);
        setHasPhysical(false);
        setLoading(false);
        return;
      }

      const templateIds = templatesArray.map((t) => t.id);
      const { data: logs } = await supabase
        .from("basics_logs")
        .select("*")
        .in("template_id", templateIds)
        .gte("date", start)
        .lte("date", currentToday);

      const logsArray: BasicsLog[] = logs ?? [];

      const spiritualTemplates = templatesArray.filter(
        (t) => t.category === "spiritual",
      );
      const physicalTemplates = templatesArray.filter(
        (t) => t.category === "physical",
      );

      const virtual = await fetchDailyVirtualResults(
        supabase,
        FIXED_USER_ID,
        dates,
        currentToday,
      );

      const computed: CategoryTrendPoint[] = dates.map((date) => {
        if (date > currentToday) {
          return { date, spiritualRate: null, physicalRate: null };
        }
        const activeSpiritual = spiritualTemplates.filter((t) =>
          isTemplateActiveOnDate(t, date),
        );
        const activePhysical = physicalTemplates.filter((t) =>
          isTemplateActiveOnDate(t, date),
        );
        const logsOnDate = logsArray.filter((l) => l.date === date);

        // base spiritual achievement count
        let spiritualActive = activeSpiritual.length;
        let spiritualAchieved = 0;
        for (const t of activeSpiritual) {
          const log = logsOnDate.find((l) => l.template_id === t.id);
          if (!log) continue;
          if (t.type === "check") {
            if (log.completed) spiritualAchieved++;
          } else {
            if (isNumericAchieved(log.value, t.target_value))
              spiritualAchieved++;
          }
        }
        if (virtual.readingApplicable.has(date)) {
          spiritualActive++;
          if (virtual.readingDone.has(date)) spiritualAchieved++;
        }
        if (virtual.meditationApplicable.has(date)) {
          spiritualActive++;
          if (virtual.meditationDone.has(date)) spiritualAchieved++;
        }

        const spiritualRate =
          spiritualActive === 0
            ? null
            : Math.min(100, (spiritualAchieved / spiritualActive) * 100);

        return {
          date,
          spiritualRate,
          physicalRate:
            activePhysical.length === 0
              ? null
              : getDailyAchievementRate(activePhysical, logsOnDate),
        };
      });

      setToday(currentToday);
      setPoints(computed);
      setHasSpiritual(
        spiritualTemplates.some((t) => t.is_active) ||
          virtual.hasReadingStart ||
          virtual.hasMeditationStart,
      );
      setHasPhysical(physicalTemplates.some((t) => t.is_active));
    } catch {
      const currentToday = getLogicalDate();
      const start = addDays(currentToday, -(days - 1));
      const dates: string[] = [];
      for (let i = 0; i < days; i++) dates.push(addDays(start, i));
      setToday(currentToday);
      setPoints(
        dates.map((d) => ({ date: d, spiritualRate: null, physicalRate: null })),
      );
      setHasSpiritual(false);
      setHasPhysical(false);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return { today, points, hasSpiritual, hasPhysical, loading };
}
