"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { shiftMonth } from "@/lib/finance-utils";
import { getGroupRollover } from "@/lib/rollover";
import { ROLLOVER_POLICY } from "@/lib/finance-config";

interface PrevMonthAggregate {
  budgetByGroup: Record<string, number>;
  expenseByGroup: Record<string, number>;
}

export function useRollover(month: string) {
  const [agg, setAgg] = useState<PrevMonthAggregate>({
    budgetByGroup: {},
    expenseByGroup: {},
  });
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);
  const prev = shiftMonth(month, -1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const [budgetsRes, txRes] = await Promise.all([
        supabase
          .from("finance_budgets")
          .select("group_id, amount")
          .eq("user_id", FIXED_USER_ID)
          .eq("month", prev),
        supabase
          .from("finance_transactions")
          .select("group_id, amount, type")
          .eq("user_id", FIXED_USER_ID)
          .gte("date", `${prev}-01`)
          .lt("date", `${month}-01`),
      ]);

      if (cancelled) return;

      const budgetByGroup: Record<string, number> = {};
      for (const r of budgetsRes.data ?? []) {
        if (!r.group_id) continue;
        budgetByGroup[r.group_id] = (budgetByGroup[r.group_id] ?? 0) + r.amount;
      }

      const expenseByGroup: Record<string, number> = {};
      for (const r of txRes.data ?? []) {
        if (!r.group_id || r.type !== "expense") continue;
        expenseByGroup[r.group_id] = (expenseByGroup[r.group_id] ?? 0) + r.amount;
      }

      setAgg({ budgetByGroup, expenseByGroup });
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, month, prev]);

  const rollovers = useMemo(() => {
    const result: Record<string, number> = {};
    for (const groupId of Object.keys(ROLLOVER_POLICY)) {
      result[groupId] = getGroupRollover(groupId, month, {
        prevBudget: agg.budgetByGroup[groupId] ?? 0,
        prevExpense: agg.expenseByGroup[groupId] ?? 0,
      });
    }
    return result;
  }, [agg, month]);

  return { rollovers, loading };
}
