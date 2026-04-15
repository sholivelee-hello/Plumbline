"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { getWeekDates } from "@/lib/utils/date";
import type { SchedulePlan, ScheduleActual, SchedulePreset } from "@/types/database";
import { demoPlans, demoActuals, demoPresets } from "@/lib/demo-data";

export function useSchedule(weekStartDate: string) {
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [actuals, setActuals] = useState<ScheduleActual[]>([]);
  const [presets, setPresets] = useState<SchedulePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const weekDates = getWeekDates(weekStartDate);

  const loadWeek = useCallback(async () => {
    try {
      const [plansRes, actualsRes] = await Promise.all([
        supabase.from("schedule_plans").select("*")
          .in("date", weekDates).order("start_time"),
        supabase.from("schedule_actuals").select("*")
          .in("date", weekDates).order("start_time"),
      ]);
      if (plansRes.data) setPlans(plansRes.data);
      if (actualsRes.data) setActuals(actualsRes.data);
    } catch {
      setPlans(demoPlans);
      setActuals(demoActuals);
    }
    setLoading(false);
  }, [weekStartDate]);

  const loadPresets = useCallback(async () => {
    try {
      const { data } = await supabase.from("schedule_presets").select("*")
        .order("usage_count", { ascending: false });
      if (data) setPresets(data);
    } catch {
      setPresets(demoPresets);
    }
  }, []);

  useEffect(() => { loadWeek(); loadPresets(); }, [loadWeek, loadPresets]);

  async function completePlan(plan: SchedulePlan) {
    await supabase.from("schedule_actuals").insert({
      user_id: FIXED_USER_ID,
      plan_id: plan.id,
      date: plan.date,
      start_time: plan.start_time,
      end_time: plan.end_time,
      title: plan.title,
      color: plan.color,
      is_from_plan: true,
    });
    await loadWeek();
  }

  async function editAndComplete(
    plan: SchedulePlan,
    edits: { start_time?: string; end_time?: string; title?: string }
  ) {
    await supabase.from("schedule_actuals").insert({
      user_id: FIXED_USER_ID,
      plan_id: plan.id,
      date: plan.date,
      start_time: edits.start_time ?? plan.start_time,
      end_time: edits.end_time ?? plan.end_time,
      title: edits.title ?? plan.title,
      color: plan.color,
      is_from_plan: true,
    });
    await loadWeek();
  }

  async function addPlan(data: {
    date: string; start_time: string; end_time: string;
    title: string; color: string; preset_id?: string;
  }) {
    await supabase.from("schedule_plans").insert({ user_id: FIXED_USER_ID, ...data });
    if (data.preset_id) {
      await supabase.rpc("increment_preset_usage", { p_id: data.preset_id });
    }
    await loadWeek();
  }

  async function addActual(data: {
    date: string; start_time: string; end_time: string;
    title: string; color: string;
  }) {
    await supabase.from("schedule_actuals").insert({
      user_id: FIXED_USER_ID, ...data, is_from_plan: false,
    });
    await loadWeek();
  }

  async function savePreset(data: { title: string; duration: number; color: string }) {
    await supabase.from("schedule_presets").insert({ user_id: FIXED_USER_ID, ...data });
    await loadPresets();
  }

  async function deletePlan(planId: string) {
    await supabase.from("schedule_plans").delete().eq("id", planId);
    await loadWeek();
  }

  return {
    plans, actuals, presets, loading, weekDates,
    completePlan, editAndComplete, addPlan, addActual,
    savePreset, deletePlan,
  };
}
