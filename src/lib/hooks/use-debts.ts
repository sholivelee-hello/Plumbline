"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";
import { bumpFinance, useFinanceTick } from "@/lib/finance-bus";

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

  const busTick = useFinanceTick("debts");

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
  }, [supabase, busTick]);

  const refresh = useCallback(() => {
    bumpFinance("debts");
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
      bumpFinance("debts");
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
      bumpFinance("debts");
      return { ok: true };
    },
    [supabase]
  );

  const deleteDebt = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      // Collect linked transaction ids BEFORE cascade so we can delete them too.
      const { data: linkedPayments } = await supabase
        .from("finance_debt_payments")
        .select("transaction_id")
        .eq("debt_id", id);

      const txIds = (linkedPayments ?? [])
        .map((p: { transaction_id: string | null }) => p.transaction_id)
        .filter((x: string | null): x is string => typeof x === "string");

      // Delete the debt; FK CASCADE removes finance_debt_payments.
      const { error } = await supabase.from("finance_debts").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };

      // Then remove the cashbook rows that were linked to those payments.
      if (txIds.length > 0) {
        await supabase.from("finance_transactions").delete().in("id", txIds);
      }

      bumpFinance("debts");
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase]
  );

  // Create a debt payment: insert finance_transactions first, then link
  // finance_debt_payments by transaction_id. Caller doesn't need to double-insert.
  const addPayment = useCallback(
    async (
      debtId: string,
      amount: number,
      memo?: string,
      date?: string,
      debtTitle?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const payDate = date ?? new Date().toLocaleDateString("sv-SE");
      const description = debtTitle ? `${debtTitle} 상환` : "빚 상환";

      // 1. Insert transaction (canonical source of truth).
      const { data: txData, error: txError } = await supabase
        .from("finance_transactions")
        .insert({
          user_id: FIXED_USER_ID,
          type: "expense",
          amount,
          description,
          date: payDate,
          group_id: "obligation",
          item_id: "debt",
          source: "debt",
        })
        .select("id")
        .single();

      if (txError || !txData) {
        return { ok: false, error: txError?.message ?? "거래 기록 실패" };
      }

      // 2. Insert linked debt payment with transaction_id.
      const { error: payError } = await supabase
        .from("finance_debt_payments")
        .insert({
          user_id: FIXED_USER_ID,
          debt_id: debtId,
          amount,
          date: payDate,
          memo: memo ?? "",
          transaction_id: txData.id,
        });

      if (payError) {
        // Rollback the transaction row to keep things in sync.
        await supabase.from("finance_transactions").delete().eq("id", txData.id);
        return { ok: false, error: payError.message };
      }

      // 3. Auto-complete the debt when fully paid.
      const debt = debts.find((d) => d.id === debtId);
      if (debt && debt.total_paid + amount >= debt.total_amount) {
        await supabase
          .from("finance_debts")
          .update({ is_completed: true })
          .eq("id", debtId);
      }

      bumpFinance("debts");
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase, debts]
  );

  // Delete a payment. If linked to a transaction, delete the transaction (CASCADE
  // removes the payment). For legacy rows without transaction_id, delete directly.
  const deletePayment = useCallback(
    async (paymentId: string, debtId: string): Promise<{ ok: boolean; error?: string }> => {
      const { data: payment, error: fetchError } = await supabase
        .from("finance_debt_payments")
        .select("transaction_id")
        .eq("id", paymentId)
        .maybeSingle();

      if (fetchError) return { ok: false, error: fetchError.message };

      if (payment?.transaction_id) {
        const { error: txError } = await supabase
          .from("finance_transactions")
          .delete()
          .eq("id", payment.transaction_id);
        if (txError) return { ok: false, error: txError.message };
        // CASCADE removes the debt_payment row.
      } else {
        const { error } = await supabase
          .from("finance_debt_payments")
          .delete()
          .eq("id", paymentId);
        if (error) return { ok: false, error: error.message };
      }

      // If debt was marked completed, un-complete it (totals will re-evaluate).
      const debt = debts.find((d) => d.id === debtId);
      if (debt?.is_completed) {
        await supabase.from("finance_debts").update({ is_completed: false }).eq("id", debtId);
      }

      bumpFinance("debts");
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase, debts]
  );

  return { debts, loading, error, addDebt, updateDebt, deleteDebt, addPayment, deletePayment, refresh };
}
