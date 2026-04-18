"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
import { useRollover } from "@/lib/hooks/use-rollover";
import { createClient } from "@/lib/supabase/client";
import type { FinanceTransaction } from "@/types/database";

export interface DonutDataItem {
  groupId: string;
  title: string;
  amount: number;
  color: string;
  percent: number;
}

export interface GroupCardItem {
  groupId: string;
  title: string;
  color: string;
  percentGuide: string;
  budget: number;
  actual: number;
  percent: number;
}

export function useFinanceHub(month: string) {
  const [heavenBankBalance, setHeavenBankBalance] = useState(0);
  const [heavenBankMonthlySow, setHeavenBankMonthlySow] = useState(0);
  const [heavenBankRefreshTick, setHeavenBankRefreshTick] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.from("heaven_bank").select("type,amount,date").then(({ data }: { data: Array<{ type: string; amount: number; date: string }> | null }) => {
      if (!data) return;
      const sow = data.filter((e) => e.type === "sow").reduce((s: number, e) => s + e.amount, 0);
      const reap = data.filter((e) => e.type === "reap").reduce((s: number, e) => s + e.amount, 0);
      setHeavenBankBalance(sow - reap);
      const monthStr = month; // 현재 선택된 월
      const monthlySow = data
        .filter((e) => e.type === "sow" && e.date.startsWith(monthStr))
        .reduce((s: number, e) => s + e.amount, 0);
      setHeavenBankMonthlySow(monthlySow);
    });
  }, [supabase, heavenBankRefreshTick, month]);

  const {
    groups,
    loading: settingsLoading,
    error: settingsError,
    refresh: refreshSettings,
  } = useBudgetSettings();

  const {
    totalIncome,
    totalExpense,
    byGroup,
    todayTransactions,
    loading: txLoading,
    error: txError,
    refresh: refreshTx,
  } = useFinanceTransactions(month);

  const {
    groupTotals,
    loading: budgetLoading,
    error: budgetError,
    refresh: refreshBudget,
  } = useBudget(month);

  const {
    rollovers,
    loading: rolloverLoading,
    error: rolloverError,
  } = useRollover(month);

  const summary = useMemo(
    () => ({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    }),
    [totalIncome, totalExpense]
  );

  const donutData = useMemo<DonutDataItem[]>(() => {
    return groups.map((g) => {
      const amount = byGroup[g.id]?.total ?? 0;
      const percent =
        totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        groupId: g.id,
        title: g.title,
        amount,
        color: g.color,
        percent,
      };
    });
  }, [groups, byGroup, totalExpense]);

  const effectiveBudgets = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const g of groups) {
      result[g.id] = (groupTotals[g.id] ?? 0) + (rollovers[g.id] ?? 0);
    }
    return result;
  }, [groups, groupTotals, rollovers]);

  const groupCards = useMemo<GroupCardItem[]>(() => {
    return groups.map((g) => {
      const budget = effectiveBudgets[g.id] ?? 0;
      const actual = byGroup[g.id]?.total ?? 0;
      const percent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
      const percentGuide = `${g.percentMin}~${g.percentMax}%`;
      return {
        groupId: g.id,
        title: g.title,
        color: g.color,
        percentGuide,
        budget,
        actual,
        percent,
      };
    });
  }, [groups, effectiveBudgets, byGroup]);

  const loading = settingsLoading || txLoading || budgetLoading || rolloverLoading;
  const error = settingsError ?? txError ?? budgetError ?? rolloverError;

  const refresh = useCallback(() => {
    refreshSettings();
    refreshTx();
    refreshBudget();
    setHeavenBankRefreshTick((n) => n + 1);
  }, [refreshSettings, refreshTx, refreshBudget]);

  return {
    summary,
    donutData,
    groupCards,
    effectiveBudgets,
    rollovers,
    heavenBankBalance,
    heavenBankMonthlySow,
    todayTransactions: todayTransactions as FinanceTransaction[],
    loading,
    error,
    refresh,
  };
}
