"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceTransaction } from "@/types/database";
import { getMonthRange } from "@/lib/finance-utils";
import { bumpFinance, useFinanceTick } from "@/lib/finance-bus";

type AddTransactionData = {
  type: "income" | "expense";
  amount: number;
  description?: string | null;
  date: string;
  group_id?: string | null;
  item_id?: string | null;
  wishlist_id?: string | null;
  source?: "manual" | "recurring" | "installment" | "debt" | "heaven_bank" | "subscription";
};

export function useFinanceTransactions(month: string) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // [HIGH] Race condition guard: useEffect owns the fetch with cancellation flag.
  // refresh() bumps the shared finance bus so every related hook re-fetches.
  const busTick = useFinanceTick("transactions");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { start, end } = getMonthRange(month);
        const { data, error: fetchError } = await supabase
          .from("finance_transactions")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false });

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setTransactions(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "거래 내역을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [month, supabase, busTick]);

  const refresh = useCallback(() => {
    bumpFinance("transactions");
  }, []);

  // Keep a ref to transactions for stable rollback captures inside callbacks
  const transactionsRef = useRef(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

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

  // [LOW] Use sv-SE locale to get YYYY-MM-DD in local timezone (avoids UTC-offset bug in KST)
  const todayTransactions = useMemo(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    return transactions.filter((t) => t.date === today);
  }, [transactions]);

  // [HIGH] addTransaction with optimistic update + rollback
  const addTransaction = useCallback(
    async (data: AddTransactionData): Promise<{ ok: boolean; error?: string; id?: string }> => {
      const tempId = `optimistic-${Date.now()}`;
      const optimisticItem: FinanceTransaction = {
        id: tempId,
        user_id: FIXED_USER_ID,
        type: data.type,
        amount: data.amount,
        description: data.description ?? null,
        date: data.date,
        group_id: data.group_id ?? null,
        item_id: data.item_id ?? null,
        wishlist_id: data.wishlist_id ?? null,
        source: data.source ?? "manual",
      };

      // Optimistically prepend (list is date DESC, new item is likely today)
      setTransactions((ts) => [optimisticItem, ...ts]);

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
          wishlist_id: data.wishlist_id ?? null,
          source: data.source ?? "manual",
        })
        .select("id")
        .single();

      if (insertError) {
        // Rollback: remove optimistic item
        setTransactions((ts) => ts.filter((t) => t.id !== tempId));
        return { ok: false, error: insertError.message };
      }

      // Replace temp id with real id then do a full refresh to get server order
      setTransactions((ts) =>
        ts.map((t) => (t.id === tempId ? { ...t, id: inserted.id } : t))
      );

      // 심음 거래는 heaven_bank에도 자동 기록 (sowing 페이지 경유 제외)
      // transaction_id FK로 연결하여 거래 삭제 시 CASCADE로 함께 제거되도록 함.
      if (data.group_id === "sowing" && data.type === "expense" && data.source !== "heaven_bank") {
        await supabase.from("heaven_bank").insert({
          user_id: FIXED_USER_ID,
          date: data.date,
          type: "sow",
          target: data.description ?? "심음",
          description: null,
          amount: data.amount,
          transaction_id: inserted.id,
        });
      }

      bumpFinance("transactions");
      return { ok: true, id: inserted.id };
    },
    [supabase]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      data: Partial<FinanceTransaction>
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = transactionsRef.current;
      const tx = prev.find((t) => t.id === id);
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

      // 연동 row의 amount/date도 함께 업데이트 (금액·날짜 일관성)
      const updateFields: Record<string, unknown> = {};
      if (data.amount !== undefined) updateFields.amount = data.amount;
      if (data.date !== undefined) updateFields.date = data.date;

      if (tx && Object.keys(updateFields).length > 0) {
        if (tx.source === "debt") {
          await supabase.from("finance_debt_payments").update(updateFields).eq("transaction_id", id);
        } else if (tx.source === "installment") {
          const instFields: Record<string, unknown> = {};
          if (data.amount !== undefined) instFields.amount = data.amount;
          if (data.date !== undefined) instFields.paid_at = data.date;
          await supabase.from("finance_installment_payments").update(instFields).eq("transaction_id", id);
        } else if (tx.source === "heaven_bank") {
          await supabase.from("heaven_bank").update(updateFields).eq("transaction_id", id);
        }
      }

      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = transactionsRef.current;
      const tx = prev.find((t) => t.id === id);
      setTransactions((ts) => ts.filter((t) => t.id !== id));

      // If source is a domain-backed record that PREDATES the transaction_id FK
      // backfill, the CASCADE may miss. Clean up legacy orphans explicitly.
      if (tx?.source === "debt") {
        await supabase
          .from("finance_debt_payments")
          .delete()
          .is("transaction_id", null)
          .eq("user_id", FIXED_USER_ID)
          .eq("date", tx.date)
          .eq("amount", tx.amount);
      } else if (tx?.source === "heaven_bank") {
        const hbType = tx.type === "expense" ? "sow" : "reap";
        await supabase
          .from("heaven_bank")
          .delete()
          .is("transaction_id", null)
          .eq("user_id", FIXED_USER_ID)
          .eq("date", tx.date)
          .eq("amount", tx.amount)
          .eq("type", hbType);
      }

      const { error: deleteError } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) {
        setTransactions(prev);
        return { ok: false, error: deleteError.message };
      }

      // After DB CASCADE removes linked children, let every hook invalidate.
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase]
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
