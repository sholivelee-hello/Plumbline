"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceTransaction, FinanceBudget } from "@/types/database";
import { demoTransactions, demoBudgets, demoSurplusGoal, demoSurplusSaved } from "@/lib/demo-data";

export function useFinance(month: string) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [surplusGoal, setSurplusGoal] = useState(0);
  const [surplusSaved, setSurplusSaved] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const autoCarryBudgets = useCallback(async () => {
    const { data: existing } = await supabase.from("finance_budgets")
      .select("id").eq("month", month).limit(1);
    if (existing && existing.length > 0) return;

    const [y, m] = month.split("-").map(Number);
    const prevMonth = m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, "0")}`;

    const { data: prevBudgets } = await supabase.from("finance_budgets")
      .select("*").eq("month", prevMonth);

    if (prevBudgets && prevBudgets.length > 0) {
      const newBudgets = prevBudgets.map((b: FinanceBudget) => ({
        user_id: FIXED_USER_ID,
        category_id: b.category_id,
        amount: b.amount,
        month,
      }));
      await supabase.from("finance_budgets").insert(newBudgets);
    }
  }, [month]);

  const load = useCallback(async () => {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const [txRes, budgetRes] = await Promise.all([
      supabase.from("finance_transactions").select("*")
        .gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
      supabase.from("finance_budgets").select("*").eq("month", month),
    ]);
    if (txRes.data) setTransactions(txRes.data);
    if (budgetRes.data) setBudgets(budgetRes.data);

    const { data: surplusCats } = await supabase.from("finance_categories")
      .select("id").eq("type", "surplus");
    if (surplusCats && surplusCats.length > 0) {
      const surplusCatId = surplusCats[0].id;
      const surplusBudget = budgetRes.data?.find((b: FinanceBudget) => b.category_id === surplusCatId);
      setSurplusGoal(surplusBudget?.amount ?? 0);
      const surplusTx = txRes.data?.filter((t: FinanceTransaction) => t.category_id === surplusCatId && t.type === "income") ?? [];
      setSurplusSaved(surplusTx.reduce((s: number, t: FinanceTransaction) => s + t.amount, 0));
    }

    setLoading(false);
  }, [month]);

  useEffect(() => {
    async function init() {
      try { await autoCarryBudgets(); await load(); } catch {
        setTransactions(demoTransactions);
        setBudgets(demoBudgets);
        setSurplusGoal(demoSurplusGoal);
        setSurplusSaved(demoSurplusSaved);
      }
      setLoading(false);
    }
    init();
  }, [autoCarryBudgets, load]);

  async function addTransaction(tx: Omit<FinanceTransaction, "id" | "user_id" | "is_auto">) {
    await supabase.from("finance_transactions").insert({ user_id: FIXED_USER_ID, ...tx });
    await load();
  }

  return { transactions, budgets, surplusGoal, surplusSaved, loading, addTransaction };
}
