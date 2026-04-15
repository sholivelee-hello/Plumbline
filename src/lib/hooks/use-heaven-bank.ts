"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { HeavenBankEntry } from "@/types/database";
import { demoHeavenBank, demoMonthlySow } from "@/lib/demo-data";

export function useHeavenBank(month: string) {
  const [entries, setEntries] = useState<HeavenBankEntry[]>([]);
  const [monthlySow, setMonthlySow] = useState(0);
  const [monthlyReap, setMonthlyReap] = useState(0);
  const [cumulativeSow, setCumulativeSow] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const { data } = await supabase.from("heaven_bank").select("*")
        .gte("date", startDate).lte("date", endDate)
        .order("date");
      if (data) {
        setEntries(data);
        setMonthlySow(data.filter((e: HeavenBankEntry) => e.type === "sow").reduce((s: number, e: HeavenBankEntry) => s + e.amount, 0));
        setMonthlyReap(data.filter((e: HeavenBankEntry) => e.type === "reap").reduce((s: number, e: HeavenBankEntry) => s + e.amount, 0));
      }
      const { data: allSow } = await supabase.from("heaven_bank").select("amount")
        .eq("type", "sow");
      if (allSow) setCumulativeSow(allSow.reduce((s: number, e: { amount: number }) => s + e.amount, 0));
    } catch {
      setEntries(demoHeavenBank);
      setMonthlySow(demoMonthlySow);
      setMonthlyReap(0);
      setCumulativeSow(demoMonthlySow);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function addEntry(entry: Omit<HeavenBankEntry, "id" | "user_id">) {
    await supabase.from("heaven_bank").insert({ user_id: FIXED_USER_ID, ...entry });
    await load();
  }

  return { entries, monthlySow, monthlyReap, cumulativeSow, loading, addEntry };
}
