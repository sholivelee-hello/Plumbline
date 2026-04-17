"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceTransaction } from "@/types/database";
import { demoCashbookEntries } from "@/lib/demo-data";

export function useCashbook(month: string) {
  const [entries, setEntries] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const { data } = await supabase
      .from("finance_transactions")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });
    if (data) setEntries(data);
    setLoading(false);
  }, [month, supabase]);

  useEffect(() => {
    async function init() {
      try {
        await load();
      } catch {
        setEntries(demoCashbookEntries.filter((e) => e.date.startsWith(month)));
        setLoading(false);
      }
    }
    init();
  }, [load, month]);

  const incomes = entries.filter((e) => e.type === "income");
  const expenses = entries.filter((e) => e.type === "expense");
  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const addEntry = useCallback(
    async (entry: {
      type: "income" | "expense";
      description: string;
      amount: number;
      date: string;
      budgetKey?: string | null;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("finance_transactions").insert({
          user_id: FIXED_USER_ID,
          type: entry.type,
          description: entry.description,
          amount: entry.amount,
          date: entry.date,
          account_id: entry.budgetKey || null,
          category_id: null,
          is_auto: false,
        });
        if (error) return { ok: false, error: "저장에 실패했습니다" };
        await load();
        return { ok: true };
      } catch {
        return { ok: false, error: "네트워크 오류가 발생했습니다" };
      }
    },
    [load],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("finance_transactions")
          .delete()
          .eq("id", id);
        if (error) return { ok: false, error: "삭제에 실패했습니다" };
        await load();
        return { ok: true };
      } catch {
        return { ok: false, error: "네트워크 오류가 발생했습니다" };
      }
    },
    [load],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      fields: { description?: string; amount?: number; account_id?: string | null },
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("finance_transactions")
          .update(fields)
          .eq("id", id);
        if (error) return { ok: false, error: "수정에 실패했습니다" };
        await load();
        return { ok: true };
      } catch {
        return { ok: false, error: "네트워크 오류가 발생했습니다" };
      }
    },
    [load],
  );

  const actualByBudgetKey = entries.reduce<Record<string, number>>(
    (map, e) => {
      if (e.account_id && e.type === "expense") {
        map[e.account_id] = (map[e.account_id] || 0) + e.amount;
      }
      return map;
    },
    {},
  );

  return {
    entries,
    incomes,
    expenses,
    totalIncome,
    totalExpense,
    loading,
    addEntry,
    deleteEntry,
    updateEntry,
    actualByBudgetKey,
  };
}
