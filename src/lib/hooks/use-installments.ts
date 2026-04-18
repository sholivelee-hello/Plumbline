"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceInstallment, FinanceInstallmentPayment } from "@/types/database";
import { demoInstallments } from "@/lib/demo-data";
import { bumpFinance, useFinanceTick } from "@/lib/finance-bus";

interface InstallmentWithProgress extends FinanceInstallment {
  remaining_months: number;
  remaining_amount: number;
  paid_amount: number;
  percent: number;
  // Derived from finance_installment_payments (not the legacy paid_months counter).
  actual_paid_count: number;
  payments: FinanceInstallmentPayment[];
}

export function useInstallments() {
  const [installments, setInstallments] = useState<InstallmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const busTick = useFinanceTick("installments");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      try {
        const { data: rows } = await supabase
          .from("finance_installments")
          .select("*")
          .order("is_completed")
          .order("created_at");

        if (cancelled) return;

        if (!rows) {
          setInstallments(
            demoInstallments.map((i) => ({
              ...i,
              actual_paid_count: i.paid_months,
              payments: [],
            })) as InstallmentWithProgress[]
          );
          return;
        }

        const ids = rows.map((r: FinanceInstallment) => r.id);
        const { data: payments } = ids.length
          ? await supabase
              .from("finance_installment_payments")
              .select("*")
              .in("installment_id", ids)
              .order("month_number")
          : { data: [] as FinanceInstallmentPayment[] };

        if (cancelled) return;

        setInstallments(
          (rows as FinanceInstallment[]).map((item) => {
            const itemPayments = (payments ?? []).filter(
              (p: FinanceInstallmentPayment) => p.installment_id === item.id
            );
            const actualPaid = itemPayments.length;
            const paidAmount = itemPayments.reduce(
              (s: number, p: FinanceInstallmentPayment) => s + p.amount,
              0
            );
            const remainingMonths = item.total_months - actualPaid;
            const remainingAmount = item.total_amount - paidAmount;
            const percent =
              item.total_months > 0
                ? Math.min(Math.round((actualPaid / item.total_months) * 100), 100)
                : 0;
            return {
              ...item,
              paid_months: actualPaid, // keep shape compatible with legacy readers
              remaining_months: Math.max(remainingMonths, 0),
              remaining_amount: Math.max(remainingAmount, 0),
              paid_amount: paidAmount,
              percent,
              actual_paid_count: actualPaid,
              payments: itemPayments,
            };
          })
        );
      } catch {
        if (!cancelled) {
          setInstallments(
            demoInstallments.map((i) => ({
              ...i,
              actual_paid_count: i.paid_months,
              payments: [],
            })) as InstallmentWithProgress[]
          );
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
    bumpFinance("installments");
  }, []);

  const addInstallment = useCallback(
    async (
      title: string,
      totalAmount: number,
      monthlyPayment: number,
      totalMonths: number,
      startDate: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const { error } = await supabase.from("finance_installments").insert({
        user_id: FIXED_USER_ID,
        title,
        total_amount: totalAmount,
        monthly_payment: monthlyPayment,
        total_months: totalMonths,
        paid_months: 0,
        start_date: startDate,
      });
      if (error) return { ok: false, error: error.message };
      bumpFinance("installments");
      return { ok: true };
    },
    [supabase]
  );

  const payMonth = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string; isCompleted?: boolean }> => {
      const item = installments.find((i) => i.id === id);
      if (!item || item.is_completed) return { ok: false, error: "이미 완납된 항목입니다" };

      const nextMonth = item.actual_paid_count + 1;
      const today = new Date().toLocaleDateString("sv-SE");
      const description = `${item.title} 할부 ${nextMonth}/${item.total_months}회`;

      // 1. Transaction first (canonical).
      const { data: txData, error: txError } = await supabase
        .from("finance_transactions")
        .insert({
          user_id: FIXED_USER_ID,
          type: "expense",
          amount: item.monthly_payment,
          description,
          date: today,
          group_id: "obligation",
          item_id: "installment",
          source: "installment",
        })
        .select("id")
        .single();

      if (txError || !txData) {
        return { ok: false, error: txError?.message ?? "거래 기록 실패" };
      }

      // 2. Link payment row.
      const { error: payError } = await supabase
        .from("finance_installment_payments")
        .insert({
          user_id: FIXED_USER_ID,
          installment_id: id,
          transaction_id: txData.id,
          month_number: nextMonth,
          paid_at: today,
          amount: item.monthly_payment,
        });

      if (payError) {
        await supabase.from("finance_transactions").delete().eq("id", txData.id);
        return { ok: false, error: payError.message };
      }

      // 3. Keep legacy paid_months in sync + handle completion.
      const isCompleted = nextMonth >= item.total_months;
      await supabase
        .from("finance_installments")
        .update({ paid_months: nextMonth, is_completed: isCompleted })
        .eq("id", id);

      bumpFinance("installments");
      bumpFinance("transactions");
      return { ok: true, isCompleted };
    },
    [supabase, installments]
  );

  const unpayMonth = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const item = installments.find((i) => i.id === id);
      if (!item || item.actual_paid_count <= 0) {
        return { ok: false, error: "취소할 납부 내역이 없습니다" };
      }

      // Find the most recent payment row.
      const lastPayment = item.payments[item.payments.length - 1];
      if (!lastPayment) {
        return { ok: false, error: "납부 기록을 찾을 수 없습니다" };
      }

      // Prefer deleting via transaction_id so CASCADE handles payment row too.
      if (lastPayment.transaction_id) {
        const { error: txError } = await supabase
          .from("finance_transactions")
          .delete()
          .eq("id", lastPayment.transaction_id);
        if (txError) return { ok: false, error: txError.message };
      } else {
        // Legacy payment: drop payment only.
        const { error: payError } = await supabase
          .from("finance_installment_payments")
          .delete()
          .eq("id", lastPayment.id);
        if (payError) return { ok: false, error: payError.message };
      }

      const newPaid = item.actual_paid_count - 1;
      await supabase
        .from("finance_installments")
        .update({ paid_months: newPaid, is_completed: false })
        .eq("id", id);

      bumpFinance("installments");
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase, installments]
  );

  const deleteInstallment = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      // Collect linked transaction ids before the installment cascade removes payments.
      const { data: linkedPayments } = await supabase
        .from("finance_installment_payments")
        .select("transaction_id")
        .eq("installment_id", id);

      const txIds = (linkedPayments ?? [])
        .map((p: { transaction_id: string | null }) => p.transaction_id)
        .filter((x: string | null): x is string => typeof x === "string");

      const { error } = await supabase.from("finance_installments").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };

      if (txIds.length > 0) {
        await supabase.from("finance_transactions").delete().in("id", txIds);
      }

      bumpFinance("installments");
      bumpFinance("transactions");
      return { ok: true };
    },
    [supabase]
  );

  return { installments, loading, addInstallment, payMonth, unpayMonth, deleteInstallment, refresh };
}
