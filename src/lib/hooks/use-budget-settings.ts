"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceBudgetSettings } from "@/types/database";
import {
  DEFAULT_GROUPS,
  DEFAULT_INCOME_CATEGORIES,
  parseGroupConfigs,
  type FinanceGroup,
} from "@/lib/finance-config";

// Local fallback when Supabase is not configured (UI testing mode)
const LOCAL_KEY = "finance-budget-settings-local";
function readLocalSettings(): FinanceBudgetSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as FinanceBudgetSettings) : null;
  } catch {
    return null;
  }
}
function writeLocalSettings(state: FinanceBudgetSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useBudgetSettings() {
  const [settings, setSettings] = useState<FinanceBudgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [MEDIUM] Create client once per mount, not on every render
  const supabase = useMemo(() => createClient(), []);

  // [MEDIUM] Track latest settings in a ref so callbacks always capture current value
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // refreshTick drives re-fetch without recreating load callback
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // If Supabase is not configured, use localStorage-only mode (UI testing)
    if (!isSupabaseConfigured()) {
      const local = readLocalSettings();
      if (local) {
        setSettings(local);
      } else {
        const defaults: FinanceBudgetSettings = {
          id: "local",
          user_id: FIXED_USER_ID,
          monthly_income: 0,
          group_configs: DEFAULT_GROUPS as unknown as FinanceBudgetSettings["group_configs"],
          income_categories: DEFAULT_INCOME_CATEGORIES,
          updated_at: new Date().toISOString(),
        };
        setSettings(defaults);
        writeLocalSettings(defaults);
      }
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_budget_settings")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .maybeSingle();

        if (cancelled) return;
        if (fetchError) throw fetchError;

        if (!data) {
          // Auto-initialize if no row exists
          const { data: inserted, error: insertError } = await supabase
            .from("finance_budget_settings")
            .upsert(
              {
                user_id: FIXED_USER_ID,
                monthly_income: 0,
                group_configs: DEFAULT_GROUPS,
                income_categories: DEFAULT_INCOME_CATEGORIES,
              },
              { onConflict: "user_id" }
            )
            .select("*")
            .maybeSingle();

          if (cancelled) return;
          if (insertError) throw insertError;
          setSettings(inserted ?? null);
        } else {
          setSettings(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "설정을 불러오지 못했습니다.");
        }
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

  const updateIncome = useCallback(
    async (amount: number): Promise<{ ok: boolean; error?: string }> => {
      // [MEDIUM] Read from ref to avoid stale closure capture
      const prev = settingsRef.current;
      const next: FinanceBudgetSettings = {
        id: prev?.id ?? "local",
        user_id: FIXED_USER_ID,
        monthly_income: amount,
        group_configs: prev?.group_configs ?? (DEFAULT_GROUPS as unknown as FinanceBudgetSettings["group_configs"]),
        income_categories: prev?.income_categories ?? DEFAULT_INCOME_CATEGORIES,
        updated_at: new Date().toISOString(),
      };
      setSettings(next);

      if (!isSupabaseConfigured()) {
        writeLocalSettings(next);
        return { ok: true };
      }

      const { error: updateError } = await supabase
        .from("finance_budget_settings")
        .upsert(
          {
            user_id: FIXED_USER_ID,
            monthly_income: amount,
            group_configs: next.group_configs,
            income_categories: next.income_categories,
            updated_at: next.updated_at,
          },
          { onConflict: "user_id" }
        );

      if (updateError) {
        setSettings(prev);
        return { ok: false, error: updateError.message };
      }
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const updateGroupConfigs = useCallback(
    async (configs: FinanceGroup[]): Promise<{ ok: boolean; error?: string }> => {
      const prev = settingsRef.current;
      const next: FinanceBudgetSettings = {
        id: prev?.id ?? "local",
        user_id: FIXED_USER_ID,
        monthly_income: prev?.monthly_income ?? 0,
        group_configs: configs as unknown as FinanceBudgetSettings["group_configs"],
        income_categories: prev?.income_categories ?? DEFAULT_INCOME_CATEGORIES,
        updated_at: new Date().toISOString(),
      };
      setSettings(next);

      if (!isSupabaseConfigured()) {
        writeLocalSettings(next);
        return { ok: true };
      }

      const { error: updateError } = await supabase
        .from("finance_budget_settings")
        .upsert(
          {
            user_id: FIXED_USER_ID,
            monthly_income: prev?.monthly_income ?? 0,
            group_configs: configs,
            income_categories: prev?.income_categories ?? DEFAULT_INCOME_CATEGORIES,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (updateError) {
        setSettings(prev);
        return { ok: false, error: updateError.message };
      }
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const updateIncomeCategories = useCallback(
    async (cats: string[]): Promise<{ ok: boolean; error?: string }> => {
      const prev = settingsRef.current;
      const next: FinanceBudgetSettings = {
        id: prev?.id ?? "local",
        user_id: FIXED_USER_ID,
        monthly_income: prev?.monthly_income ?? 0,
        group_configs: prev?.group_configs ?? (DEFAULT_GROUPS as unknown as FinanceBudgetSettings["group_configs"]),
        income_categories: cats,
        updated_at: new Date().toISOString(),
      };
      setSettings(next);

      if (!isSupabaseConfigured()) {
        writeLocalSettings(next);
        return { ok: true };
      }

      const { error: updateError } = await supabase
        .from("finance_budget_settings")
        .upsert(
          {
            user_id: FIXED_USER_ID,
            monthly_income: prev?.monthly_income ?? 0,
            group_configs: prev?.group_configs ?? DEFAULT_GROUPS,
            income_categories: cats,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (updateError) {
        setSettings(prev);
        return { ok: false, error: updateError.message };
      }
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const initializeSettings = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    const { error: upsertError } = await supabase
      .from("finance_budget_settings")
      .upsert(
        {
          user_id: FIXED_USER_ID,
          monthly_income: 0,
          group_configs: DEFAULT_GROUPS,
          income_categories: DEFAULT_INCOME_CATEGORIES,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }
    setRefreshTick((n) => n + 1);
    return { ok: true };
  }, [supabase]);

  const groups = parseGroupConfigs(settings?.group_configs);
  const incomeCategories: string[] =
    Array.isArray(settings?.income_categories) && settings.income_categories.length > 0
      ? settings.income_categories
      : DEFAULT_INCOME_CATEGORIES;
  const monthlyIncome = settings?.monthly_income ?? 0;

  return {
    settings,
    groups,
    incomeCategories,
    monthlyIncome,
    loading,
    error,
    updateIncome,
    updateGroupConfigs,
    updateIncomeCategories,
    initializeSettings,
    refresh,
  };
}
