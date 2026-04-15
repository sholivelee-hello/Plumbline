"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { getCurrentMonth } from "@/lib/utils/date";
import type { FinanceWant } from "@/types/database";
import { demoWants } from "@/lib/demo-data";

export function useWants() {
  const [wants, setWants] = useState<FinanceWant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.from("finance_wants").select("*")
        .order("is_purchased").order("created_month", { ascending: false });
      if (data) setWants(data);
    } catch {
      setWants(demoWants);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addWant(title: string, estimatedPrice: number | null) {
    await supabase.from("finance_wants").insert({
      user_id: FIXED_USER_ID, title, estimated_price: estimatedPrice,
      created_month: getCurrentMonth(),
    });
    await load();
  }

  async function togglePurchased(wantId: string, isPurchased: boolean) {
    await supabase.from("finance_wants").update({
      is_purchased: isPurchased,
      purchased_date: isPurchased ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", wantId);
    await load();
  }

  return { wants, loading, addWant, togglePurchased };
}
