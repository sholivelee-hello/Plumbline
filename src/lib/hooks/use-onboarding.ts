"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceOnboarding } from "@/types/database";

export function useOnboarding() {
  const [state, setState] = useState<FinanceOnboarding | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_onboarding")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .maybeSingle();

        if (cancelled) return;
        if (fetchError) throw fetchError;

        if (!data) {
          // Auto-initialize with defaults
          const { data: inserted, error: insertError } = await supabase
            .from("finance_onboarding")
            .upsert(
              {
                user_id: FIXED_USER_ID,
                is_completed: false,
                is_demo_mode: false,
                completed_at: null,
              },
              { onConflict: "user_id" }
            )
            .select("*")
            .maybeSingle();

          if (cancelled) return;
          if (insertError) throw insertError;
          setState(inserted ?? null);
        } else {
          setState(data);
        }
      } catch {
        // Silently fail — treat as not onboarded
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, refreshTick]);

  const refresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  const startDemo = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from("finance_onboarding")
      .upsert(
        {
          user_id: FIXED_USER_ID,
          is_demo_mode: true,
          is_completed: false,
          completed_at: null,
        },
        { onConflict: "user_id" }
      );

    if (error) return { ok: false, error: error.message };
    setState((s) => (s ? { ...s, is_demo_mode: true, is_completed: false } : s));
    return { ok: true };
  }, [supabase]);

  const exitDemo = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from("finance_onboarding")
      .upsert(
        {
          user_id: FIXED_USER_ID,
          is_demo_mode: false,
          is_completed: false,
          completed_at: null,
        },
        { onConflict: "user_id" }
      );

    if (error) return { ok: false, error: error.message };
    setState((s) => (s ? { ...s, is_demo_mode: false } : s));
    return { ok: true };
  }, [supabase]);

  const completeOnboarding = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("finance_onboarding")
      .upsert(
        {
          user_id: FIXED_USER_ID,
          is_completed: true,
          is_demo_mode: false,
          completed_at: now,
        },
        { onConflict: "user_id" }
      );

    if (error) return { ok: false, error: error.message };
    setState((s) =>
      s ? { ...s, is_completed: true, is_demo_mode: false, completed_at: now } : s
    );
    return { ok: true };
  }, [supabase]);

  return {
    state,
    loading,
    isOnboarded: state?.is_completed ?? false,
    isDemoMode: state?.is_demo_mode ?? false,
    startDemo,
    exitDemo,
    completeOnboarding,
    refresh,
  };
}
