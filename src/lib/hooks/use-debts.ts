"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";

interface DebtWithProgress extends FinanceDebt {
  total_paid: number;
  percent: number;
  payments: FinanceDebtPayment[];
}

export function useDebts() {
  const [debts, setDebts] = useState<DebtWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data: debtRows, error: debtError } = await supabase
          .from("finance_debts")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .order("is_completed")
          .order("created_at");

        if (cancelled) return;
        if (debtError) throw debtError;

        const { data: payments, error: payError } = await supabase
          .from("finance_debt_payments")
          .select("*")
          .order("date", { ascending: false });

        if (cancelled) return;
        if (payError) throw payError;

        setDebts(
          (debtRows ?? []).map((d: FinanceDebt) => {
            const dPayments = (payments ?? []).filter(
              (p: FinanceDebtPayment) => p.debt_id === d.id
            );
            const totalPaid = dPayments.reduce(
              (s: number, p: FinanceDebtPayment) => s + p.amount,
              0
            );
            return {
              ...d,
              tags: d.tags ?? [],
              total_paid: totalPaid,
              percent:
                d.total_amount > 0
                  ? Math.min(Math.round((totalPaid / d.total_amount) * 100), 100)
                  : 0,
              payments: dPayments,
            };
          })
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "부채 정보를 불러오지 못했습니다.");
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

  const addDebt = useCallback(
    async (
      title: string,
      totalAmount: number,
      tags?: string[]
    ): Promise<{ ok: boolean; error?: string; id?: string }> => {
      const { data, error: insertError } = await supabase
        .from("finance_debts")
        .insert({
          user_id: FIXED_USER_ID,
          title,
          total_amount: totalAmount,
          tags: tags ?? [],
        })
        .select("id")
        .single();

      if (insertError) return { ok: false, error: insertError.message };
      setRefreshTick((n) => n + 1);
      return { ok: true, id: data.id };
    },
    [supabase]
  );

  const updateDebt = useCallback(
    async (
      id: string,
      updates: { title?: string; total_amount?: number; tags?: string[] }
    ): Promise<{ ok: boolean; error?: string }> => {
      const { error: updateError } = await supabase
        .from("finance_debts")
        .update(updates)
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) return { ok: false, error: updateError.message };
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const addPayment = useCallback(
    async (
      debtId: string,
      amount: number,
      memo?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const { error: insertError } = await supabase
        .from("finance_debt_payments")
        .insert({
          user_id: FIXED_USER_ID,
          debt_id: debtId,
          amount,
          date: new Date().toISOString().split("T")[0],
          memo: memo ?? "",
        });

      if (insertError) return { ok: false, error: insertError.message };

      // Auto-complete debt when fully paid
      const debt = debts.find((d) => d.id === debtId);
      if (debt && debt.total_paid + amount >= debt.total_amount) {
        const { error: updateError } = await supabase
          .from("finance_debts")
          .update({ is_completed: true })
          .eq("id", debtId);
        if (updateError) return { ok: false, error: updateError.message };
      }

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase, debts]
  );

  return { debts, loading, error, addDebt, updateDebt, addPayment, refresh };
}
