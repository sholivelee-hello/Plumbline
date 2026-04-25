"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { getLogicalDate } from "@/lib/utils/date";
import type { BasicsTemplate, BasicsLog } from "@/types/database";
import { demoTemplates, demoLogs } from "@/lib/demo-data";

export function useBasics() {
  const [templates, setTemplates] = useState<BasicsTemplate[]>([]);
  const [logs, setLogs] = useState<BasicsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<string>(() => getLogicalDate());
  const supabase = useMemo(() => createClient(), []);

  // 자정 넘어가거나 앱이 백그라운드에서 다시 열리면 today 갱신
  useEffect(() => {
    function refreshToday() {
      setToday((prev) => {
        const next = getLogicalDate();
        return prev === next ? prev : next;
      });
    }
    document.addEventListener("visibilitychange", refreshToday);
    const id = setInterval(refreshToday, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refreshToday);
      clearInterval(id);
    };
  }, []);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("basics_templates")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");
    if (data) setTemplates(data);
  }, [supabase]);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("basics_logs")
      .select("*")
      .eq("user_id", FIXED_USER_ID)
      .eq("date", today);
    if (data) setLogs(data);
  }, [supabase, today]);

  // Generate daily logs if missing
  const generateDailyLogs = useCallback(async () => {
    const { data: existing } = await supabase
      .from("basics_logs")
      .select("template_id")
      .eq("date", today);

    const existingIds = new Set((existing ?? []).map((l: { template_id: string }) => l.template_id));
    const { data: active } = await supabase
      .from("basics_templates")
      .select("id, user_id")
      .eq("is_active", true);

    const missing = (active ?? []).filter((t: { id: string; user_id: string }) => !existingIds.has(t.id));
    if (missing.length > 0) {
      await supabase.from("basics_logs").insert(
        missing.map((t: { id: string; user_id: string }) => ({
          user_id: t.user_id,
          template_id: t.id,
          date: today,
          completed: false,
          completed_at: null,
        }))
      );
    }
  }, [supabase, today]);

  useEffect(() => {
    async function init() {
      try {
        await loadTemplates();
        await generateDailyLogs();
        await loadLogs();
      } catch {
        // Supabase 미연결 시 빈 상태
        setTemplates(demoTemplates);
        setLogs(demoLogs);
      }
      setLoading(false);
    }
    init();
  }, [loadTemplates, generateDailyLogs, loadLogs]);

  async function toggleCheck(logId: string, completed: boolean) {
    await supabase
      .from("basics_logs")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", logId);
    await loadLogs();
  }

  async function updateValue(logId: string, value: number, targetValue: number | null) {
    const completed = targetValue ? value >= targetValue : value > 0;
    await supabase
      .from("basics_logs")
      .update({
        value,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", logId);
    await loadLogs();
  }

  async function addTemplate(template: Omit<BasicsTemplate, "id" | "user_id" | "created_at" | "is_active" | "sort_order" | "deactivated_at">) {
    await supabase.from("basics_templates").insert({
      ...template,
      user_id: FIXED_USER_ID,
      sort_order: templates.length,
    });
    await loadTemplates();
    await generateDailyLogs();
    await loadLogs();
  }

  async function updateTemplate(
    templateId: string,
    updates: Partial<
      Pick<
        BasicsTemplate,
        "category" | "title" | "type" | "unit" | "target_value" | "step_value"
      >
    >,
  ) {
    await supabase
      .from("basics_templates")
      .update(updates)
      .eq("id", templateId);
    await loadTemplates();
  }

  async function deactivateTemplate(templateId: string) {
    await supabase
      .from("basics_templates")
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq("id", templateId);
    await loadTemplates();
  }

  return {
    templates,
    logs,
    loading,
    today,
    toggleCheck,
    updateValue,
    addTemplate,
    updateTemplate,
    deactivateTemplate,
  };
}
