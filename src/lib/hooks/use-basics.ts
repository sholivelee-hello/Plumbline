"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLogicalDate } from "@/lib/utils/date";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

export function useBasics(dayStartTime: string = "04:00") {
  const [templates, setTemplates] = useState<BasicsTemplate[]>([]);
  const [logs, setLogs] = useState<BasicsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const today = getLogicalDate(dayStartTime);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("basics_templates")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");
    if (data) setTemplates(data);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("basics_logs")
      .select("*")
      .eq("date", today);
    if (data) setLogs(data);
  }, [today]);

  // Generate daily logs if missing
  const generateDailyLogs = useCallback(async () => {
    const { data: existing } = await supabase
      .from("basics_logs")
      .select("template_id")
      .eq("date", today);

    const existingIds = new Set((existing ?? []).map((l) => l.template_id));
    const { data: active } = await supabase
      .from("basics_templates")
      .select("id, user_id")
      .eq("is_active", true);

    const missing = (active ?? []).filter((t) => !existingIds.has(t.id));
    if (missing.length > 0) {
      await supabase.from("basics_logs").insert(
        missing.map((t) => ({
          user_id: t.user_id,
          template_id: t.id,
          date: today,
        }))
      );
    }
  }, [today]);

  useEffect(() => {
    async function init() {
      await loadTemplates();
      await generateDailyLogs();
      await loadLogs();
      setLoading(false);
    }
    init();
  }, []);

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

  async function addTemplate(template: Omit<BasicsTemplate, "id" | "user_id" | "created_at" | "is_active" | "sort_order">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("basics_templates").insert({
      ...template,
      user_id: user.id,
      sort_order: templates.length,
    });
    await loadTemplates();
    await generateDailyLogs();
    await loadLogs();
  }

  async function deactivateTemplate(templateId: string) {
    await supabase
      .from("basics_templates")
      .update({ is_active: false })
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
    deactivateTemplate,
  };
}
