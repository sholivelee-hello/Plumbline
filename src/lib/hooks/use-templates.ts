"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { WeeklyTemplate, WeeklyTemplateBlock } from "@/types/database";

export function useTemplates() {
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("weekly_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setTemplates(data);
    } catch {
      setTemplates([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTemplate(name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("weekly_templates")
      .insert({ user_id: FIXED_USER_ID, name })
      .select("id")
      .single();
    await load();
    return error ? null : (data?.id ?? null);
  }

  async function renameTemplate(id: string, name: string) {
    await supabase
      .from("weekly_templates")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  }

  async function deleteTemplate(id: string) {
    await supabase.from("weekly_templates").delete().eq("id", id);
    await load();
  }

  async function loadBlocks(templateId: string): Promise<WeeklyTemplateBlock[]> {
    const { data } = await supabase
      .from("weekly_template_blocks")
      .select("*")
      .eq("template_id", templateId)
      .order("day_of_week")
      .order("start_time");
    return data ?? [];
  }

  async function addBlock(block: Omit<WeeklyTemplateBlock, "id">) {
    await supabase.from("weekly_template_blocks").insert(block);
  }

  async function updateBlock(
    id: string,
    patch: Partial<Omit<WeeklyTemplateBlock, "id" | "template_id">>
  ) {
    await supabase.from("weekly_template_blocks").update(patch).eq("id", id);
  }

  async function deleteBlock(id: string) {
    await supabase.from("weekly_template_blocks").delete().eq("id", id);
  }

  return {
    templates,
    loading,
    createTemplate,
    renameTemplate,
    deleteTemplate,
    loadBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
  };
}
