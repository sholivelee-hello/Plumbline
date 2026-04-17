"use client";

import { useMemo, useCallback } from "react";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
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

  const groupCards = useMemo<GroupCardItem[]>(() => {
    return groups.map((g) => {
      const budget = groupTotals[g.id] ?? 0;
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
  }, [groups, groupTotals, byGroup]);

  const loading = settingsLoading || txLoading || budgetLoading;
  const error = settingsError ?? txError ?? budgetError;

  const refresh = useCallback(() => {
    refreshSettings();
    refreshTx();
    refreshBudget();
  }, [refreshSettings, refreshTx, refreshBudget]);

  return {
    summary,
    donutData,
    groupCards,
    todayTransactions: todayTransactions as FinanceTransaction[],
    loading,
    error,
    refresh,
  };
}
