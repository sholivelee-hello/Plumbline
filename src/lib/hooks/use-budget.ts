"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceBudget } from "@/types/database";

function makeBudgetKey(groupId: string, itemId: string | null): string {
  return itemId != null ? `${groupId}_${itemId}` : groupId;
}

export function useBudget(month: string) {
  const [rows, setRows] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [HIGH] Create client once per mount
  const supabase = useMemo(() => createClient(), []);

  // [HIGH] Race condition guard via refreshTick counter
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_budgets")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .eq("month", month);

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setRows(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "예산을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [month, supabase, refreshTick]);

  const refresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  // Keep a ref to rows for stable rollback captures inside callbacks
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Derived: budgets map keyed by makeBudgetKey
  const budgets = useMemo(() => {
    const result: Record<string, number> = {};
    for (const row of rows) {
      const key = makeBudgetKey(row.group_id ?? "", row.item_id ?? null);
      result[key] = row.amount;
    }
    return result;
  }, [rows]);

  // Derived: groupTotals — sum of all item budgets per group_id
  const groupTotals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const row of rows) {
      const gid = row.group_id ?? "";
      if (!gid) continue;
      result[gid] = (result[gid] ?? 0) + row.amount;
    }
    return result;
  }, [rows]);

  const grandTotal = useMemo(
    () => Object.values(groupTotals).reduce((s, v) => s + v, 0),
    [groupTotals]
  );

  const updateBudgetAmount = useCallback(
    async (
      groupId: string,
      itemId: string | null,
      amount: number
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = rowsRef.current;
      const key = makeBudgetKey(groupId, itemId);

      // Optimistic update
      setRows((rs) => {
        const exists = rs.find(
          (r) => r.group_id === groupId && r.item_id === (itemId ?? null)
        );
        if (exists) {
          return rs.map((r) =>
            r.group_id === groupId && r.item_id === (itemId ?? null)
              ? { ...r, amount }
              : r
          );
        }
        // Add a temporary optimistic row
        const tempRow: FinanceBudget = {
          id: `optimistic-${key}-${Date.now()}`,
          user_id: FIXED_USER_ID,
          month,
          group_id: groupId,
          item_id: itemId ?? null,
          amount,
        };
        return [...rs, tempRow];
      });

      // Upsert: delete existing then insert ensures clean state
      const { error: deleteError } = await supabase
        .from("finance_budgets")
        .delete()
        .eq("user_id", FIXED_USER_ID)
        .eq("month", month)
        .eq("group_id", groupId)
        .is("item_id", itemId === null ? null : undefined);

      // Handle non-null item_id delete separately
      if (!deleteError && itemId !== null) {
        await supabase
          .from("finance_budgets")
          .delete()
          .eq("user_id", FIXED_USER_ID)
          .eq("month", month)
          .eq("group_id", groupId)
          .eq("item_id", itemId);
      }

      const { error: insertError } = await supabase
        .from("finance_budgets")
        .insert({
          user_id: FIXED_USER_ID,
          month,
          group_id: groupId,
          item_id: itemId ?? null,
          amount,
        });

      if (insertError) {
        setRows(prev);
        return { ok: false, error: insertError.message };
      }

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase, month]
  );

  const bulkSetBudgets = useCallback(
    async (
      entries: Array<{ groupId: string; itemId: string | null; amount: number }>
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = rowsRef.current;

      // Optimistic: replace all rows
      const optimisticRows: FinanceBudget[] = entries.map((e, i) => ({
        id: `optimistic-bulk-${i}-${Date.now()}`,
        user_id: FIXED_USER_ID,
        month,
        group_id: e.groupId,
        item_id: e.itemId ?? null,
        amount: e.amount,
      }));
      setRows(optimisticRows);

      // Delete all existing for this user+month
      const { error: deleteError } = await supabase
        .from("finance_budgets")
        .delete()
        .eq("user_id", FIXED_USER_ID)
        .eq("month", month);

      if (deleteError) {
        setRows(prev);
        return { ok: false, error: deleteError.message };
      }

      if (entries.length > 0) {
        const { error: insertError } = await supabase
          .from("finance_budgets")
          .insert(
            entries.map((e) => ({
              user_id: FIXED_USER_ID,
              month,
              group_id: e.groupId,
              item_id: e.itemId ?? null,
              amount: e.amount,
            }))
          );

        if (insertError) {
          setRows(prev);
          return { ok: false, error: insertError.message };
        }
      }

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase, month]
  );

  const copyFromPreviousMonth = useCallback(
    async (sourceMonth: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = rowsRef.current;

      // Fetch source month rows
      const { data: sourceRows, error: fetchError } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("user_id", FIXED_USER_ID)
        .eq("month", sourceMonth);

      if (fetchError) {
        return { ok: false, error: fetchError.message };
      }

      if (!sourceRows || sourceRows.length === 0) {
        return { ok: false, error: "이전 달 예산 데이터가 없습니다." };
      }

      // Delete current month rows (REPLACE behavior)
      const { error: deleteError } = await supabase
        .from("finance_budgets")
        .delete()
        .eq("user_id", FIXED_USER_ID)
        .eq("month", month);

      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }

      const newRows = (sourceRows as FinanceBudget[]).map((r) => ({
        user_id: FIXED_USER_ID,
        month,
        group_id: r.group_id,
        item_id: r.item_id ?? null,
        amount: r.amount,
      }));

      // Optimistic
      setRows(
        newRows.map((r, i) => ({
          ...r,
          id: `optimistic-copy-${i}-${Date.now()}`,
          category_id: null,
        }))
      );

      const { error: insertError } = await supabase
        .from("finance_budgets")
        .insert(newRows);

      if (insertError) {
        setRows(prev);
        return { ok: false, error: insertError.message };
      }

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase, month]
  );

  return {
    budgets,
    groupTotals,
    grandTotal,
    loading,
    error,
    updateBudgetAmount,
    bulkSetBudgets,
    copyFromPreviousMonth,
    refresh,
  };
}
