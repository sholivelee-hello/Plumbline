"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";

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
    const { data: debtRows } = await supabase.from("finance_debts").select("*")
      .order("is_completed").order("created_at");
    const { data: payments } = await supabase.from("finance_debt_payments").select("*")
      .order("date", { ascending: false });

    if (debtRows) {
      setDebts(debtRows.map((d) => {
        const dPayments = (payments ?? []).filter((p) => p.debt_id === d.id);
        const totalPaid = dPayments.reduce((s, p) => s + p.amount, 0);
        return {
          ...d,
          total_paid: totalPaid,
          percent: d.total_amount > 0 ? Math.min(Math.round((totalPaid / d.total_amount) * 100), 100) : 0,
          payments: dPayments,
        };
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDebt(title: string, totalAmount: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_debts").insert({ user_id: user.id, title, total_amount: totalAmount });
    await load();
  }

  async function addPayment(debtId: string, amount: number, memo: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_debt_payments").insert({
      user_id: user.id, debt_id: debtId, amount,
      date: new Date().toISOString().split("T")[0], memo,
    });
    const debt = debts.find((d) => d.id === debtId);
    if (debt && debt.total_paid + amount >= debt.total_amount) {
      await supabase.from("finance_debts").update({ is_completed: true }).eq("id", debtId);
    }
    await load();
  }

  return { debts, loading, addDebt, addPayment };
}
