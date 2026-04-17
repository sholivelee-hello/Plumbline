"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceTransaction } from "@/types/database";
import { getMonthRange } from "@/lib/finance-utils";

type AddTransactionData = {
  type: "income" | "expense";
  amount: number;
  description?: string | null;
  date: string;
  group_id?: string | null;
  item_id?: string | null;
  income_category?: string | null;
  source?: "manual" | "recurring" | "installment" | "debt" | "heaven_bank";
};

export function useFinanceTransactions(month: string) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getMonthRange(month);
      const { data, error: fetchError } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("user_id", FIXED_USER_ID)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "거래 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const incomes = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions]
  );

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const totalIncome = useMemo(
    () => incomes.reduce((sum, t) => sum + t.amount, 0),
    [incomes]
  );

  const totalExpense = useMemo(
    () => expenses.reduce((sum, t) => sum + t.amount, 0),
    [expenses]
  );

  const byGroup = useMemo(() => {
    const result: Record<string, { total: number; byItem: Record<string, number> }> = {};
    for (const t of expenses) {
      if (!t.group_id) continue;
      if (!result[t.group_id]) {
        result[t.group_id] = { total: 0, byItem: {} };
      }
      result[t.group_id].total += t.amount;
      if (t.item_id) {
        result[t.group_id].byItem[t.item_id] =
          (result[t.group_id].byItem[t.item_id] ?? 0) + t.amount;
      }
    }
    return result;
  }, [expenses]);

  const todayTransactions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions.filter((t) => t.date === today);
  }, [transactions]);

  const addTransaction = useCallback(
    async (data: AddTransactionData): Promise<{ ok: boolean; error?: string; id?: string }> => {
      const { data: inserted, error: insertError } = await supabase
        .from("finance_transactions")
        .insert({
          user_id: FIXED_USER_ID,
          type: data.type,
          amount: data.amount,
          description: data.description ?? null,
          date: data.date,
          group_id: data.group_id ?? null,
          item_id: data.item_id ?? null,
          income_category: data.income_category ?? null,
          source: data.source ?? "manual",
        })
        .select("id")
        .single();

      if (insertError) {
        return { ok: false, error: insertError.message };
      }
      await load();
      return { ok: true, id: inserted?.id };
    },
    [load]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      data: Partial<FinanceTransaction>
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = transactions;
      setTransactions((ts) =>
        ts.map((t) => (t.id === id ? { ...t, ...data } : t))
      );

      const { error: updateError } = await supabase
        .from("finance_transactions")
        .update(data)
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setTransactions(prev);
        return { ok: false, error: updateError.message };
      }
      await load();
      return { ok: true };
    },
    [transactions, load]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = transactions;
      setTransactions((ts) => ts.filter((t) => t.id !== id));

      const { error: deleteError } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) {
        setTransactions(prev);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [transactions, load]
  );

  return {
    transactions,
    incomes,
    expenses,
    totalIncome,
    totalExpense,
    byGroup,
    todayTransactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh,
  };
}
