"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { demoTemplates, demoLogs } from "@/lib/demo-data";

interface BasicsStat {
  templateId: string;
  title: string;
  category: string;
  streak: number;
  weeklyRate: number;
  monthlyRate: number;
}

export function useBasicsStats() {
  const [stats, setStats] = useState<BasicsStat[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const loadStats = useCallback(async () => {
    try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data: templates } = await supabase
      .from("basics_templates")
      .select("id, title, category")
      .eq("is_active", true);

    const { data: logs } = await supabase
      .from("basics_logs")
      .select("template_id, date, completed")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (!templates || !logs) { setLoading(false); return; }

    const result = templates.map((t: { id: string; title: string; category: string }) => {
      const tLogs = logs.filter((l: { template_id: string; date: string; completed: boolean }) => l.template_id === t.id);
      const weekLogs = tLogs.filter(
        (l: { template_id: string; date: string; completed: boolean }) => new Date(l.date) >= sevenDaysAgo
      );
      const monthLogs = tLogs;

      // Calculate streak
      let streak = 0;
      const sorted = tLogs
        .filter((l: { template_id: string; date: string; completed: boolean }) => l.completed)
        .map((l: { template_id: string; date: string; completed: boolean }) => l.date)
        .sort()
        .reverse();
      if (sorted.length > 0) {
        const d = new Date(today);
        for (let i = 0; i < sorted.length; i++) {
          const expected = d.toISOString().split("T")[0];
          if (sorted[i] === expected) {
            streak++;
            d.setDate(d.getDate() - 1);
          } else break;
        }
      }

      return {
        templateId: t.id,
        title: t.title,
        category: t.category,
        streak,
        weeklyRate: weekLogs.length > 0
          ? Math.round((weekLogs.filter((l: { completed: boolean }) => l.completed).length / weekLogs.length) * 100)
          : 0,
        monthlyRate: monthLogs.length > 0
          ? Math.round((monthLogs.filter((l: { completed: boolean }) => l.completed).length / monthLogs.length) * 100)
          : 0,
      };
    });

    setStats(result);
    } catch {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const demoResult = demoTemplates.map((t: BasicsTemplate) => {
        const tLogs = demoLogs.filter((l: BasicsLog) => l.template_id === t.id);
        const weekLogs = tLogs.filter((l: BasicsLog) => new Date(l.date) >= sevenDaysAgo);
        let streak = 0;
        const sorted = tLogs
          .filter((l: BasicsLog) => l.completed)
          .map((l: BasicsLog) => l.date)
          .sort()
          .reverse();
        if (sorted.length > 0) {
          const d = new Date(today);
          for (let i = 0; i < sorted.length; i++) {
            const expected = d.toISOString().split("T")[0];
            if (sorted[i] === expected) {
              streak++;
              d.setDate(d.getDate() - 1);
            } else break;
          }
        }
        return {
          templateId: t.id,
          title: t.title,
          category: t.category,
          streak,
          weeklyRate: weekLogs.length > 0
            ? Math.round((weekLogs.filter((l: BasicsLog) => l.completed).length / weekLogs.length) * 100)
            : 0,
          monthlyRate: tLogs.length > 0
            ? Math.round((tLogs.filter((l: BasicsLog) => l.completed).length / tLogs.length) * 100)
            : 0,
        };
      });
      setStats(demoResult);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  return { stats, loading };
}
