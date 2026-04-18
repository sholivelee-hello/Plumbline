"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { calcStats, type Stats } from "@/lib/weight-utils";
import type { WeightEntry, WeightGoal } from "@/types/database";

export interface UseWeight {
  entries: WeightEntry[];
  goal: WeightGoal | null;
  stats: Stats;
  loading: boolean;
  error: string | null;
  addEntry: (weight_kg: number, weighed_on: string) => Promise<{ ok: boolean; error?: string }>;
  updateEntry: (id: string, weight_kg: number, weighed_on: string) => Promise<{ ok: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ ok: boolean; error?: string }>;
  setGoal: (target_kg: number, deadline: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => void;
}

export function useWeight(): UseWeight {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoalState] = useState<WeightGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [entriesRes, goalRes] = await Promise.all([
        supabase
          .from("weight_entries")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .order("weighed_on", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("weight_goal")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (entriesRes.error) setError(entriesRes.error.message);
      else setEntries(entriesRes.data as WeightEntry[]);

      if (goalRes.error) setError(goalRes.error.message);
      else setGoalState((goalRes.data as WeightGoal | null) ?? null);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, supabase]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const addEntry = useCallback(async (weight_kg: number, weighed_on: string) => {
    const { error } = await supabase
      .from("weight_entries")
      .insert({ user_id: FIXED_USER_ID, weight_kg, weighed_on });
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh, supabase]);

  const updateEntry = useCallback(async (id: string, weight_kg: number, weighed_on: string) => {
    const { error } = await supabase
      .from("weight_entries")
      .update({ weight_kg, weighed_on, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh, supabase]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("weight_entries").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh, supabase]);

  const setGoal = useCallback(async (target_kg: number, deadline: string) => {
    const { error } = await supabase
      .from("weight_goal")
      .upsert({ user_id: FIXED_USER_ID, target_kg, deadline, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh, supabase]);

  const stats = calcStats(entries, goal);

  return { entries, goal, stats, loading, error, addEntry, updateEntry, deleteEntry, setGoal, refresh };
}
