"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HeavenBankEntry } from "@/types/database";

export function useHeavenBank(month: string) {
  const [entries, setEntries] = useState<HeavenBankEntry[]>([]);
  const [monthlySow, setMonthlySow] = useState(0);
  const [monthlyReap, setMonthlyReap] = useState(0);
  const [cumulativeSow, setCumulativeSow] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const { data } = await supabase.from("heaven_bank").select("*")
      .gte("date", startDate).lte("date", endDate)
      .order("date");
    if (data) {
      setEntries(data);
      setMonthlySow(data.filter(e => e.type === "sow").reduce((s, e) => s + e.amount, 0));
      setMonthlyReap(data.filter(e => e.type === "reap").reduce((s, e) => s + e.amount, 0));
    }
    const { data: allSow } = await supabase.from("heaven_bank").select("amount")
      .eq("type", "sow");
    if (allSow) setCumulativeSow(allSow.reduce((s, e) => s + e.amount, 0));
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function addEntry(entry: Omit<HeavenBankEntry, "id" | "user_id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("heaven_bank").insert({ user_id: user.id, ...entry });
    await load();
  }

  return { entries, monthlySow, monthlyReap, cumulativeSow, loading, addEntry };
}
