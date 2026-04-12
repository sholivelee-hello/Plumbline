"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceObligation } from "@/types/database";

export function useObligations(month: string) {
  const [obligations, setObligations] = useState<(FinanceObligation & { category_title: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("finance_obligations").select(`
      *, finance_categories(title)
    `).eq("month", month).order("created_at");

    if (data) {
      setObligations(data.map((o: FinanceObligation & { finance_categories: { title: string } | null }) => ({
        ...o,
        category_title: o.finance_categories?.title ?? "",
      })));
    }
    setLoading(false);
  }, [month]);

  const autoCarry = useCallback(async () => {
    const { data: existing } = await supabase.from("finance_obligations")
      .select("id").eq("month", month).limit(1);
    if (existing && existing.length > 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: categories } = await supabase.from("finance_categories")
      .select("*").eq("type", "obligation").eq("user_id", user.id);

    if (categories && categories.length > 0) {
      const newObligations = categories.map((c) => ({
        user_id: user.id,
        month,
        category_id: c.id,
        amount: c.default_amount ?? 0,
        is_paid: false,
      }));
      await supabase.from("finance_obligations").insert(newObligations);
    }
  }, [month]);

  useEffect(() => {
    async function init() {
      await autoCarry();
      await load();
    }
    init();
  }, [autoCarry, load]);

  async function togglePaid(obligationId: string, isPaid: boolean) {
    await supabase.from("finance_obligations").update({
      is_paid: isPaid,
      paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", obligationId);
    await load();
  }

  async function updateAmount(obligationId: string, amount: number) {
    await supabase.from("finance_obligations")
      .update({ amount }).eq("id", obligationId);
    await load();
  }

  return { obligations, loading, togglePaid, updateAmount };
}
