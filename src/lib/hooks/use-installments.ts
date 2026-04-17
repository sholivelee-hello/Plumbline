"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceInstallment } from "@/types/database";
import { demoInstallments } from "@/lib/demo-data";

interface InstallmentWithProgress extends FinanceInstallment {
  remaining_months: number;
  remaining_amount: number;
  paid_amount: number;
  percent: number;
}

export function useInstallments() {
  const [installments, setInstallments] = useState<InstallmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("finance_installments")
        .select("*")
        .order("is_completed")
        .order("created_at");

      if (data) {
        setInstallments(
          data.map((item: FinanceInstallment) => {
            const paidAmount = item.monthly_payment * item.paid_months;
            const remainingMonths = item.total_months - item.paid_months;
            const remainingAmount = item.total_amount - paidAmount;
            const percent =
              item.total_months > 0
                ? Math.min(Math.round((item.paid_months / item.total_months) * 100), 100)
                : 0;
            return {
              ...item,
              remaining_months: Math.max(remainingMonths, 0),
              remaining_amount: Math.max(remainingAmount, 0),
              paid_amount: paidAmount,
              percent,
            };
          })
        );
      }
    } catch {
      setInstallments(demoInstallments);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addInstallment(
    title: string,
    totalAmount: number,
    monthlyPayment: number,
    totalMonths: number,
    startDate: string
  ): Promise<{ ok: boolean; error?: string }> {
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
    await load();
    return { ok: true };
  }

  async function payMonth(id: string): Promise<{ ok: boolean; error?: string; isCompleted?: boolean }> {
    const item = installments.find((i) => i.id === id);
    if (!item || item.is_completed) return { ok: false, error: "이미 완납된 항목입니다" };

    const newPaid = item.paid_months + 1;
    const isCompleted = newPaid >= item.total_months;

    const { error } = await supabase
      .from("finance_installments")
      .update({ paid_months: newPaid, is_completed: isCompleted })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    await load();
    return { ok: true, isCompleted };
  }

  async function deleteInstallment(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from("finance_installments").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await load();
    return { ok: true };
  }

  return { installments, loading, addInstallment, payMonth, deleteInstallment };
}
