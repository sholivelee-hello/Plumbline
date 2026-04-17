"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";
import { demoDebts } from "@/lib/demo-data";

interface DebtWithProgress extends FinanceDebt {
  total_paid: number;
  percent: number;
  payments: FinanceDebtPayment[];
}

export function useDebts() {
  const [debts, setDebts] = useState<DebtWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data: debtRows } = await supabase.from("finance_debts").select("*")
        .order("is_completed").order("created_at");
      const { data: payments } = await supabase.from("finance_debt_payments").select("*")
        .order("date", { ascending: false });

      if (debtRows) {
        setDebts(debtRows.map((d: FinanceDebt) => {
          const dPayments = (payments ?? []).filter((p: FinanceDebtPayment) => p.debt_id === d.id);
          const totalPaid = dPayments.reduce((s: number, p: FinanceDebtPayment) => s + p.amount, 0);
          return {
            ...d,
            total_paid: totalPaid,
            percent: d.total_amount > 0 ? Math.min(Math.round((totalPaid / d.total_amount) * 100), 100) : 0,
            payments: dPayments,
          };
        }));
      }
    } catch {
      setDebts(demoDebts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDebt(title: string, totalAmount: number) {
    await supabase.from("finance_debts").insert({ user_id: FIXED_USER_ID, title, total_amount: totalAmount });
    await load();
  }

  async function addPayment(debtId: string, amount: number, memo?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error: insertError } = await supabase.from("finance_debt_payments").insert({
        user_id: FIXED_USER_ID, debt_id: debtId, amount,
        date: new Date().toISOString().split("T")[0], memo: memo ?? "",
      });
      if (insertError) return { ok: false, error: insertError.message };

      const debt = debts.find((d) => d.id === debtId);
      if (debt && debt.total_paid + amount >= debt.total_amount) {
        const { error: updateError } = await supabase
          .from("finance_debts").update({ is_completed: true }).eq("id", debtId);
        if (updateError) return { ok: false, error: updateError.message };
      }
      await load();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed" };
    }
  }

  return { debts, loading, addDebt, addPayment };
}
