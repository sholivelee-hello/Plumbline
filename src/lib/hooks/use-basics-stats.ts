"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();

  const loadStats = useCallback(async () => {
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

    const result = templates.map((t) => {
      const tLogs = logs.filter((l) => l.template_id === t.id);
      const weekLogs = tLogs.filter(
        (l) => new Date(l.date) >= sevenDaysAgo
      );
      const monthLogs = tLogs;

      // Calculate streak
      let streak = 0;
      const sorted = tLogs
        .filter((l) => l.completed)
        .map((l) => l.date)
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
          ? Math.round((weekLogs.filter((l) => l.completed).length / weekLogs.length) * 100)
          : 0,
        monthlyRate: monthLogs.length > 0
          ? Math.round((monthLogs.filter((l) => l.completed).length / monthLogs.length) * 100)
          : 0,
      };
    });

    setStats(result);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return { stats, loading };
}
