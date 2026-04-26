"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { demoTemplates, demoLogs } from "@/lib/demo-data";
import { fetchDailyVirtualResults } from "@/lib/bible/virtual-items";
import { FIXED_USER_ID } from "@/lib/constants";

interface BasicsStat {
  templateId: string;
  title: string;
  category: string;
  weeklyRate: number;
  monthlyRate: number;
}

export function useBasicsStats() {
  const [stats, setStats] = useState<BasicsStat[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const loadStats = useCallback(async () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 이번 주 시작: 일요일 (일=0, 토=6)
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // 이번 달 시작: 1일
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // 분모: 오늘 포함 경과 일수
    const elapsedWeekDays = today.getDay() + 1;
    const elapsedMonthDays = today.getDate();

    // 두 시작점 중 더 빠른 날짜부터 fetch (주가 월 경계를 넘는 경우 대비)
    const fetchStartStr =
      weekStartStr < monthStartStr ? weekStartStr : monthStartStr;

    const computeRates = (logs: { date: string; completed: boolean }[]) => {
      const weekDoneDays = new Set(
        logs.filter((l) => l.completed && l.date >= weekStartStr).map((l) => l.date),
      );
      const monthDoneDays = new Set(
        logs.filter((l) => l.completed && l.date >= monthStartStr).map((l) => l.date),
      );
      return {
        weeklyRate: Math.round((weekDoneDays.size / elapsedWeekDays) * 100),
        monthlyRate: Math.round((monthDoneDays.size / elapsedMonthDays) * 100),
      };
    };

    try {
      const { data: templates } = await supabase
        .from("basics_templates")
        .select("id, title, category")
        .eq("is_active", true);

      const { data: logs } = await supabase
        .from("basics_logs")
        .select("template_id, date, completed")
        .gte("date", fetchStartStr)
        .lte("date", todayStr);

      if (!templates || !logs) {
        setLoading(false);
        return;
      }

      const result = templates.map(
        (t: { id: string; title: string; category: string }) => {
          const tLogs = logs.filter(
            (l: { template_id: string; date: string; completed: boolean }) =>
              l.template_id === t.id,
          );
          return {
            templateId: t.id,
            title: t.title,
            category: t.category,
            ...computeRates(tLogs),
          };
        },
      );

      // Append virtual reading/meditation items if applicable
      const allDates: string[] = [];
      const startDate = new Date(fetchStartStr);
      const endDate = new Date(todayStr);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(d.toISOString().split("T")[0]);
      }
      const virtual = await fetchDailyVirtualResults(
        supabase,
        FIXED_USER_ID,
        allDates,
        todayStr,
      );

      const virtualEntries: BasicsStat[] = [];
      const buildVirtual = (
        id: string,
        title: string,
        applicable: Set<string>,
        done: Set<string>,
      ): BasicsStat => {
        const weekApplicable = [...applicable].filter((d) => d >= weekStartStr);
        const monthApplicable = [...applicable].filter((d) => d >= monthStartStr);
        const weekDone = weekApplicable.filter((d) => done.has(d)).length;
        const monthDone = monthApplicable.filter((d) => done.has(d)).length;
        return {
          templateId: id,
          title,
          category: "spiritual",
          weeklyRate:
            weekApplicable.length === 0
              ? 0
              : Math.round((weekDone / weekApplicable.length) * 100),
          monthlyRate:
            monthApplicable.length === 0
              ? 0
              : Math.round((monthDone / monthApplicable.length) * 100),
        };
      };
      if (virtual.hasReadingStart) {
        virtualEntries.push(
          buildVirtual(
            "__virtual_bible_reading__",
            "📖 통독",
            virtual.readingApplicable,
            virtual.readingDone,
          ),
        );
      }
      if (virtual.hasMeditationStart) {
        virtualEntries.push(
          buildVirtual(
            "__virtual_meditation__",
            "✨ 묵상",
            virtual.meditationApplicable,
            virtual.meditationDone,
          ),
        );
      }

      setStats([...result, ...virtualEntries]);
    } catch {
      const demoResult = demoTemplates.map((t: BasicsTemplate) => {
        const tLogs = demoLogs.filter((l: BasicsLog) => l.template_id === t.id);
        return {
          templateId: t.id,
          title: t.title,
          category: t.category,
          ...computeRates(tLogs),
        };
      });
      setStats(demoResult);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading };
}
