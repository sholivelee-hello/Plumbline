"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type {
  FinanceSubscription,
  FinanceSubscriptionAmountChange,
  FinanceSubscriptionCancellation,
} from "@/types/database";

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<FinanceSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("finance_subscriptions")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .order("is_active", { ascending: false })
          .order("day_of_month", { ascending: true });

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setSubscriptions(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "구독 정보를 불러오지 못했습니다.");
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

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.is_active),
    [subscriptions]
  );

  const cancelledSubscriptions = useMemo(
    () => subscriptions.filter((s) => !s.is_active),
    [subscriptions]
  );

  const totalMonthlyAmount = useMemo(
    () => activeSubscriptions.reduce((sum, s) => sum + s.amount, 0),
    [activeSubscriptions]
  );

  const addSubscription = useCallback(
    async (data: {
      title: string;
      amount: number;
      card_label?: string;
      day_of_month: number;
      start_date: string;
    }): Promise<{ ok: boolean; error?: string; id?: string }> => {
      // 1. Insert into finance_subscriptions
      const { data: inserted, error: subError } = await supabase
        .from("finance_subscriptions")
        .insert({
          user_id: FIXED_USER_ID,
          title: data.title,
          amount: data.amount,
          card_label: data.card_label ?? null,
          day_of_month: data.day_of_month,
          start_date: data.start_date,
          is_active: true,
        })
        .select("id")
        .single();

      if (subError) return { ok: false, error: subError.message };

      // 2. Insert linked finance_recurring row
      const { error: recurError } = await supabase
        .from("finance_recurring")
        .insert({
          user_id: FIXED_USER_ID,
          subscription_id: inserted.id,
          group_id: "necessity",
          item_id: "subscription",
          type: "expense",
          description: `[구독] ${data.title}`,
          amount: data.amount,
          day_of_month: data.day_of_month,
          income_category: null,
          is_active: true,
        });

      if (recurError) {
        // Clean up orphaned subscription row
        await supabase.from("finance_subscriptions").delete().eq("id", inserted.id);
        return { ok: false, error: recurError.message };
      }

      setRefreshTick((n) => n + 1);
      return { ok: true, id: inserted.id };
    },
    [supabase]
  );

  const updateSubscription = useCallback(
    async (
      id: string,
      data: Partial<Pick<FinanceSubscription, "title" | "card_label" | "day_of_month">>
    ): Promise<{ ok: boolean; error?: string }> => {
      const { error: subError } = await supabase
        .from("finance_subscriptions")
        .update(data)
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (subError) return { ok: false, error: subError.message };

      // Sync linked recurring row for day_of_month and/or title changes
      const recurUpdates: Record<string, unknown> = {};
      if (data.day_of_month !== undefined) {
        recurUpdates.day_of_month = data.day_of_month;
      }
      if (data.title !== undefined) {
        recurUpdates.description = `[구독] ${data.title}`;
      }

      if (Object.keys(recurUpdates).length > 0) {
        const { error: recurError } = await supabase
          .from("finance_recurring")
          .update(recurUpdates)
          .eq("subscription_id", id);

        if (recurError) return { ok: false, error: recurError.message };
      }

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const updateAmount = useCallback(
    async (
      id: string,
      newAmount: number,
      effectiveDate: string,
      note?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      // Get current amount for history record
      const current = subscriptions.find((s) => s.id === id);
      const oldAmount = current?.amount ?? 0;

      // 1. Insert amount change history
      const { error: histError } = await supabase
        .from("finance_subscription_amount_changes")
        .insert({
          subscription_id: id,
          old_amount: oldAmount,
          new_amount: newAmount,
          effective_date: effectiveDate,
          note: note ?? null,
        });

      if (histError) return { ok: false, error: histError.message };

      // 2. Update subscription amount
      const { error: subError } = await supabase
        .from("finance_subscriptions")
        .update({ amount: newAmount })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (subError) return { ok: false, error: subError.message };

      // 3. Update linked recurring amount (future auto-records only)
      const { error: recurError } = await supabase
        .from("finance_recurring")
        .update({ amount: newAmount })
        .eq("subscription_id", id);

      if (recurError) return { ok: false, error: recurError.message };

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase, subscriptions]
  );

  const cancelSubscription = useCallback(
    async (id: string, note?: string): Promise<{ ok: boolean; error?: string }> => {
      const now = new Date().toISOString();

      // 1. Mark subscription inactive
      const { error: subError } = await supabase
        .from("finance_subscriptions")
        .update({ is_active: false, cancelled_at: now })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (subError) return { ok: false, error: subError.message };

      // 2. Insert cancellation record
      const { error: cancelError } = await supabase
        .from("finance_subscription_cancellations")
        .insert({
          subscription_id: id,
          cancelled_at: now,
          note: note ?? null,
        });

      if (cancelError) return { ok: false, error: cancelError.message };

      // 3. Deactivate linked recurring
      const { error: recurError } = await supabase
        .from("finance_recurring")
        .update({ is_active: false })
        .eq("subscription_id", id);

      if (recurError) return { ok: false, error: recurError.message };

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const rejoinSubscription = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const now = new Date().toISOString();

      // 1. Reactivate subscription
      const { error: subError } = await supabase
        .from("finance_subscriptions")
        .update({ is_active: true, cancelled_at: null })
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (subError) return { ok: false, error: subError.message };

      // 2. Update latest cancellation record with rejoined_at
      const { data: latestCancel, error: fetchError } = await supabase
        .from("finance_subscription_cancellations")
        .select("id")
        .eq("subscription_id", id)
        .is("rejoined_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) return { ok: false, error: fetchError.message };

      if (latestCancel) {
        const { error: rejoinError } = await supabase
          .from("finance_subscription_cancellations")
          .update({ rejoined_at: now })
          .eq("id", latestCancel.id);

        if (rejoinError) return { ok: false, error: rejoinError.message };
      }

      // 3. Reactivate linked recurring
      const { error: recurError } = await supabase
        .from("finance_recurring")
        .update({ is_active: true })
        .eq("subscription_id", id);

      if (recurError) return { ok: false, error: recurError.message };

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const deleteSubscription = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      // CASCADE will remove finance_recurring, amount_changes, cancellations
      const { error: deleteError } = await supabase
        .from("finance_subscriptions")
        .delete()
        .eq("id", id)
        .eq("user_id", FIXED_USER_ID);

      if (deleteError) return { ok: false, error: deleteError.message };

      setRefreshTick((n) => n + 1);
      return { ok: true };
    },
    [supabase]
  );

  const getAmountHistory = useCallback(
    async (subscriptionId: string): Promise<FinanceSubscriptionAmountChange[]> => {
      const { data } = await supabase
        .from("finance_subscription_amount_changes")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("effective_date", { ascending: false });
      return data ?? [];
    },
    [supabase]
  );

  const getCancellationHistory = useCallback(
    async (subscriptionId: string): Promise<FinanceSubscriptionCancellation[]> => {
      const { data } = await supabase
        .from("finance_subscription_cancellations")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    [supabase]
  );

  return {
    subscriptions,
    activeSubscriptions,
    cancelledSubscriptions,
    totalMonthlyAmount,
    loading,
    error,
    addSubscription,
    updateSubscription,
    updateAmount,
    cancelSubscription,
    rejoinSubscription,
    deleteSubscription,
    getAmountHistory,
    getCancellationHistory,
    refresh,
  };
}
