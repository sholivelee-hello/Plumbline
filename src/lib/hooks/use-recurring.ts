"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceRecurring } from "@/types/database";
import { getLastDayOfMonth } from "@/lib/finance-utils";

export function useRecurring() {
  const [recurring, setRecurring] = useState<FinanceRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [refreshTick, setRefreshTick] = useState(0);

  const recurringRef = useRef(recurring);
  useEffect(() => {
    recurringRef.current = recurring;
  }, [recurring]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_recurring")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .order("day_of_month", { ascending: true });

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setRecurring(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "반복 거래를 불러오지 못했습니다.");
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

  const addRecurring = useCallback(
    async (
      data: Omit<FinanceRecurring, "id" | "user_id" | "created_at" | "is_active">
    ): Promise<{ ok: boolean; error?: string }> => {
      const { error: insertError } = await supabase
        .from("finance_recurring")
        .insert({
          user_id: FIXED_USER_ID,
          is_active: true,
          ...data,
        });

      if (insertError) return { ok: false, error: insertError.message };
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const updateRecurring = useCallback(
    async (
      id: string,
      data: Partial<FinanceRecurring>
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = recurringRef.current;
      setRecurring((rs) => rs.map((r) => (r.id === id ? { ...r, ...data } : r)));

      const { error: updateError } = await supabase
        .from("finance_recurring")
        .update(data)
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setRecurring(prev);
        return { ok: false, error: updateError.message };
      }
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const deleteRecurring = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = recurringRef.current;
      setRecurring((rs) => rs.filter((r) => r.id !== id));

      const { error: deleteError } = await supabase
        .from("finance_recurring")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) {
        setRecurring(prev);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [supabase]
  );

  const toggleActive = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const rule = recurringRef.current.find((r) => r.id === id);
      if (!rule) return { ok: false, error: "항목을 찾을 수 없습니다." };
      return updateRecurring(id, { is_active: !rule.is_active });
    },
    [updateRecurring]
  );

  const executeForMonth = useCallback(
    async (month: string): Promise<{ executed: number; errors: string[] }> => {
      const { data: activeRules } = await supabase
        .from("finance_recurring")
        .select("*")
        .eq("user_id", FIXED_USER_ID)
        .eq("is_active", true);

      if (!activeRules || activeRules.length === 0) return { executed: 0, errors: [] };

      const rules = activeRules as FinanceRecurring[];

      const { data: existingLogs } = await supabase
        .from("finance_recurring_logs")
        .select("recurring_id")
        .in("recurring_id", rules.map((r) => r.id))
        .eq("month", month);

      const loggedIds = new Set((existingLogs ?? []).map((l: { recurring_id: string }) => l.recurring_id));

      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

      if (month > currentMonth) return { executed: 0, errors: [] };

      const currentDay = today.getDate();
      const lastDayOfTargetMonth = getLastDayOfMonth(month);

      let executed = 0;
      const errors: string[] = [];

      for (const rule of rules) {
        if (loggedIds.has(rule.id)) continue;

        const effectiveDay = Math.min(rule.day_of_month, lastDayOfTargetMonth);

        if (month === currentMonth && currentDay < effectiveDay) continue;

        const txDate = `${month}-${String(effectiveDay).padStart(2, "0")}`;

        const source = rule.subscription_id ? "subscription" : "recurring";

        const { data: txData, error: txError } = await supabase
          .from("finance_transactions")
          .insert({
            user_id: FIXED_USER_ID,
            type: rule.type,
            amount: rule.amount,
            description: rule.description,
            date: txDate,
            group_id: rule.group_id,
            item_id: rule.item_id,
            income_category: rule.income_category,
            source,
          })
          .select("id")
          .single();

        if (txError || !txData) {
          errors.push(`${rule.description}: ${txError?.message ?? "insert failed"}`);
          continue;
        }

        const { error: logError } = await supabase
          .from("finance_recurring_logs")
          .insert({
            recurring_id: rule.id,
            month,
            transaction_id: txData.id,
          });

        if (logError) {
          errors.push(`${rule.description}: log - ${logError.message}`);
          await supabase.from("finance_transactions").delete().eq("id", txData.id);
          continue;
        }

        executed++;
      }

      return { executed, errors };
    },
    [supabase]
  );

  return {
    recurring,
    loading,
    error,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
    executeForMonth,
    refresh,
  };
}
