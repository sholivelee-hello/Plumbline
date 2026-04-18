"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceWishlist } from "@/types/database";
import { bumpFinance, useFinanceTick } from "@/lib/finance-bus";
import { addWishContribution } from "@/lib/finance-actions";
import { ROLLOVER_START_MONTH } from "@/lib/finance-config";

export type WishWithRollup = FinanceWishlist & { cumulative_saved: number };

export function useWishlist() {
  const [wishes, setWishes] = useState<FinanceWishlist[]>([]);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const wishTick = useFinanceTick("wishlist");
  const txTick = useFinanceTick("transactions");

  const wishesRef = useRef(wishes);
  useEffect(() => {
    wishesRef.current = wishes;
  }, [wishes]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const rolloverStart = `${ROLLOVER_START_MONTH}-01`;

    const run = async () => {
      try {
        const { data: wishesData, error: wishErr } = await supabase
          .from("finance_wishlist")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .eq("is_completed", false)
          .order("priority", { ascending: true });

        if (cancelled) return;
        if (wishErr) throw wishErr;

        const list = wishesData ?? [];
        const map: Record<string, number> = {};

        if (list.length > 0) {
          const ids = list.map((w: FinanceWishlist) => w.id);
          const { data: txData, error: txErr } = await supabase
            .from("finance_transactions")
            .select("wishlist_id, amount")
            .eq("user_id", FIXED_USER_ID)
            .eq("type", "expense")
            .gte("date", rolloverStart)
            .in("wishlist_id", ids);

          if (cancelled) return;
          if (txErr) throw txErr;

          for (const row of txData ?? []) {
            if (!row.wishlist_id) continue;
            map[row.wishlist_id] = (map[row.wishlist_id] ?? 0) + row.amount;
          }
        }

        setWishes(list);
        setContributions(map);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "위시리스트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, wishTick, txTick]);

  const wishesWithRollup = useMemo<WishWithRollup[]>(
    () =>
      wishes.map((w) => ({
        ...w,
        cumulative_saved: w.saved_amount + (contributions[w.id] ?? 0),
      })),
    [wishes, contributions]
  );

  const refresh = useCallback(() => {
    bumpFinance("wishlist");
  }, []);

  const addWish = useCallback(
    async (
      title: string,
      targetAmount: number,
      priority?: number
    ): Promise<{ ok: boolean; error?: string; id?: string }> => {
      const existingPriorities = wishesRef.current.map((w) => w.priority);
      const nextPriority =
        priority !== undefined
          ? priority
          : Math.max(...(existingPriorities.length > 0 ? existingPriorities : [0])) + 1;

      const tempId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticItem: FinanceWishlist = {
        id: tempId,
        user_id: FIXED_USER_ID,
        title,
        target_amount: targetAmount,
        saved_amount: 0,
        priority: nextPriority,
        is_completed: false,
        completed_at: null,
        created_at: now,
        updated_at: now,
      };

      setWishes((ws) =>
        [...ws, optimisticItem].sort((a, b) => a.priority - b.priority)
      );

      const { data: inserted, error: insertError } = await supabase
        .from("finance_wishlist")
        .insert({
          user_id: FIXED_USER_ID,
          title,
          target_amount: targetAmount,
          saved_amount: 0,
          priority: nextPriority,
          is_completed: false,
        })
        .select("id")
        .single();

      if (insertError) {
        setWishes(wishesRef.current.filter((w) => w.id !== tempId));
        return { ok: false, error: insertError.message };
      }

      setWishes((ws) =>
        ws.map((w) => (w.id === tempId ? { ...w, id: inserted.id } : w))
      );
      bumpFinance("wishlist");
      return { ok: true, id: inserted.id };
    },
    [supabase]
  );

  const updateWish = useCallback(
    async (
      id: string,
      data: Partial<FinanceWishlist>
    ): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      setWishes((ws) => ws.map((w) => (w.id === id ? { ...w, ...data } : w)));

      const { error: updateError } = await supabase
        .from("finance_wishlist")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setWishes(prev);
        return { ok: false, error: updateError.message };
      }
      bumpFinance("wishlist");
      return { ok: true };
    },
    [supabase]
  );

  const addContribution = useCallback(
    async (
      wishId: string,
      amount: number,
      date?: string,
      description?: string
    ): Promise<{ ok: boolean; error?: string; transactionId?: string }> => {
      const txDate = date ?? new Date().toLocaleDateString("sv-SE");
      return addWishContribution({ wishId, amount, date: txDate, description });
    },
    []
  );

  const reorderWishes = useCallback(
    async (orderedIds: string[]): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;

      setWishes((ws) => {
        const updated = ws.map((w) => {
          const newPriority = orderedIds.indexOf(w.id) + 1;
          return newPriority > 0 ? { ...w, priority: newPriority } : w;
        });
        return updated.sort((a, b) => a.priority - b.priority);
      });

      const updates = orderedIds.map((id, index) =>
        supabase
          .from("finance_wishlist")
          .update({ priority: index + 1, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", FIXED_USER_ID)
      );

      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setWishes(prev);
        return { ok: false, error: firstError.message };
      }
      bumpFinance("wishlist");
      return { ok: true };
    },
    [supabase]
  );

  const completeWish = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      setWishes((ws) => ws.filter((w) => w.id !== id));

      const { error: updateError } = await supabase
        .from("finance_wishlist")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setWishes(prev);
        return { ok: false, error: updateError.message };
      }
      bumpFinance("wishlist");
      return { ok: true };
    },
    [supabase]
  );

  const deleteWish = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      setWishes((ws) => ws.filter((w) => w.id !== id));

      const { error: deleteError } = await supabase
        .from("finance_wishlist")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) {
        setWishes(prev);
        return { ok: false, error: deleteError.message };
      }
      bumpFinance("wishlist");
      return { ok: true };
    },
    [supabase]
  );

  return {
    wishes: wishesWithRollup,
    loading,
    error,
    addWish,
    updateWish,
    addContribution,
    reorderWishes,
    completeWish,
    deleteWish,
    refresh,
  };
}
