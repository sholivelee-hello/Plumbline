"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { FinanceWishlist } from "@/types/database";

export function useWishlist() {
  const [wishes, setWishes] = useState<FinanceWishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [refreshTick, setRefreshTick] = useState(0);

  // Keep ref to latest state for stable rollback captures inside callbacks
  const wishesRef = useRef(wishes);
  useEffect(() => {
    wishesRef.current = wishes;
  }, [wishes]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_wishlists")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .eq("is_completed", false)
          .order("priority", { ascending: true });

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setWishes(data ?? []);
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
  }, [supabase, refreshTick]);

  const refresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  const addWish = useCallback(
    async (
      title: string,
      targetAmount: number,
      priority?: number
    ): Promise<{ ok: boolean; error?: string }> => {
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
        .from("finance_wishlists")
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
      setRefreshTick((n) => n + 1);
      return { ok: true };
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
        .from("finance_wishlists")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setWishes(prev);
        return { ok: false, error: updateError.message };
      }
      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const updateSaved = useCallback(
    async (id: string, addAmount: number): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      const wish = prev.find((w) => w.id === id);
      if (!wish) return { ok: false, error: "위시 항목을 찾을 수 없습니다." };

      const newSaved = Math.min(
        Math.max(0, wish.saved_amount + addAmount),
        wish.target_amount
      );

      setWishes((ws) =>
        ws.map((w) => (w.id === id ? { ...w, saved_amount: newSaved } : w))
      );

      const { error: updateError } = await supabase
        .from("finance_wishlists")
        .update({ saved_amount: newSaved, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (updateError) {
        setWishes(prev);
        return { ok: false, error: updateError.message };
      }
      return { ok: true };
    },
    [supabase]
  );

  const reorderWishes = useCallback(
    async (orderedIds: string[]): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;

      // Optimistically update priorities
      setWishes((ws) => {
        const updated = ws.map((w) => {
          const newPriority = orderedIds.indexOf(w.id) + 1;
          return newPriority > 0 ? { ...w, priority: newPriority } : w;
        });
        return updated.sort((a, b) => a.priority - b.priority);
      });

      // Bulk update each row
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("finance_wishlists")
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
      return { ok: true };
    },
    [supabase]
  );

  const completeWish = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      // Remove from active list optimistically
      setWishes((ws) => ws.filter((w) => w.id !== id));

      const { error: updateError } = await supabase
        .from("finance_wishlists")
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
      return { ok: true };
    },
    [supabase]
  );

  const deleteWish = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = wishesRef.current;
      setWishes((ws) => ws.filter((w) => w.id !== id));

      const { error: deleteError } = await supabase
        .from("finance_wishlists")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) {
        setWishes(prev);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [supabase]
  );

  return {
    wishes,
    loading,
    error,
    addWish,
    updateWish,
    updateSaved,
    reorderWishes,
    completeWish,
    deleteWish,
    refresh,
  };
}
