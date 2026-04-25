"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, toLocalDateString } from "@/lib/utils/date";
import { getDailyAchievementRate } from "@/lib/utils/stats";

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

function isTemplateActiveOn(t: BasicsTemplate, date: string): boolean {
  const created = t.created_at.slice(0, 10);
  const deactivated = t.deactivated_at ? t.deactivated_at.slice(0, 10) : null;
  if (created > date) return false;
  if (deactivated && deactivated < date) return false;
  return true;
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

      const computed: CategoryTrendPoint[] = dates.map((date) => {
        if (date > currentToday) {
          return { date, spiritualRate: null, physicalRate: null };
        }
        const activeSpiritual = spiritualTemplates.filter((t) =>
          isTemplateActiveOn(t, date),
        );
        const activePhysical = physicalTemplates.filter((t) =>
          isTemplateActiveOn(t, date),
        );
        const logsOnDate = logsArray.filter((l) => l.date === date);
        return {
          date,
          spiritualRate:
            activeSpiritual.length === 0
              ? null
              : getDailyAchievementRate(activeSpiritual, logsOnDate),
          physicalRate:
            activePhysical.length === 0
              ? null
              : getDailyAchievementRate(activePhysical, logsOnDate),
        };
      });

      setToday(currentToday);
      setPoints(computed);
      setHasSpiritual(spiritualTemplates.some((t) => t.is_active));
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
