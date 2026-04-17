"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceOnboarding } from "@/types/database";

const LOCAL_KEY = "finance-onboarding-local";

function readLocal(): FinanceOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as FinanceOnboarding) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: FinanceOnboarding) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

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

        if (data) {
          setState(data);
        } else {
          // Supabase returned null (unconfigured or fresh user) — fall back to localStorage
          const local = readLocal();
          if (local) {
            setState(local);
          } else {
            // Try to auto-initialize (works only when Supabase is configured)
            const { data: inserted } = await supabase
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
            setState(inserted ?? null);
          }
        }
      } catch {
        // Silently fall back to local
        const local = readLocal();
        if (!cancelled && local) setState(local);
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
    const next: FinanceOnboarding = {
      id: state?.id ?? "local",
      user_id: FIXED_USER_ID,
      is_demo_mode: true,
      is_completed: false,
      completed_at: null,
    };
    setState(next);
    writeLocal(next);
    return { ok: true };
  }, [supabase, state]);

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
    const next: FinanceOnboarding = {
      id: state?.id ?? "local",
      user_id: FIXED_USER_ID,
      is_demo_mode: false,
      is_completed: state?.is_completed ?? false,
      completed_at: state?.completed_at ?? null,
    };
    setState(next);
    writeLocal(next);
    return { ok: true };
  }, [supabase, state]);

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
    const next: FinanceOnboarding = {
      id: state?.id ?? "local",
      user_id: FIXED_USER_ID,
      is_completed: true,
      is_demo_mode: false,
      completed_at: now,
    };
    setState(next);
    writeLocal(next);
    return { ok: true };
  }, [supabase, state]);

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
