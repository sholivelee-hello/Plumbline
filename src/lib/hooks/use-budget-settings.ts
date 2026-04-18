"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceBudgetSettings } from "@/types/database";
import {
  DEFAULT_GROUPS,
  DEFAULT_INCOME_CATEGORIES,
  parseGroupConfigs,
  type FinanceGroup,
} from "@/lib/finance-config";
import { bumpFinance } from "@/lib/finance-bus";

export function useBudgetSettings() {
  const [settings, setSettings] = useState<FinanceBudgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

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

      // Diff prev vs next to find (groupId, itemId) pairs that were removed.
      // Deleted items must have their references pruned from dependent tables,
      // otherwise the "deleted" items keep showing up in budget/cashbook views.
      const prevGroups = parseGroupConfigs(prev?.group_configs);
      const nextKeys = new Set<string>();
      for (const g of configs) {
        for (const it of g.items) nextKeys.add(`${g.id}::${it.id}`);
      }
      const removed: Array<{ groupId: string; itemId: string }> = [];
      for (const g of prevGroups) {
        for (const it of g.items) {
          if (!nextKeys.has(`${g.id}::${it.id}`)) {
            removed.push({ groupId: g.id, itemId: it.id });
          }
        }
      }

      const next: FinanceBudgetSettings = {
        id: prev?.id ?? "local",
        user_id: FIXED_USER_ID,
        monthly_income: prev?.monthly_income ?? 0,
        group_configs: configs as unknown as FinanceBudgetSettings["group_configs"],
        income_categories: prev?.income_categories ?? DEFAULT_INCOME_CATEGORIES,
        updated_at: new Date().toISOString(),
      };
      setSettings(next);

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

      // Cascade-clean references to removed items. Keep the rows themselves
      // (they still represent real money movement) but null out the item link
      // so they no longer render under the deleted category. Budgets, however,
      // are per-item allocations — delete those outright.
      if (removed.length > 0) {
        const cleanupErrors: string[] = [];
        for (const { groupId, itemId } of removed) {
          const [tx, rc, bg] = await Promise.all([
            supabase
              .from("finance_transactions")
              .update({ item_id: null })
              .eq("user_id", FIXED_USER_ID)
              .eq("group_id", groupId)
              .eq("item_id", itemId),
            supabase
              .from("finance_recurring")
              .update({ item_id: null })
              .eq("user_id", FIXED_USER_ID)
              .eq("group_id", groupId)
              .eq("item_id", itemId),
            supabase
              .from("finance_budgets")
              .delete()
              .eq("user_id", FIXED_USER_ID)
              .eq("group_id", groupId)
              .eq("item_id", itemId),
          ]);
          if (tx.error) cleanupErrors.push(tx.error.message);
          if (rc.error) cleanupErrors.push(rc.error.message);
          if (bg.error) cleanupErrors.push(bg.error.message);
        }
        bumpFinance("transactions");
        bumpFinance("recurring");
        bumpFinance("budget");
        if (cleanupErrors.length > 0) {
          return { ok: false, error: `삭제된 항목 참조 정리 실패: ${cleanupErrors.join("; ")}` };
        }
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
