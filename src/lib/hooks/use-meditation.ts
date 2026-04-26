"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { getLogicalDate } from "@/lib/utils/date";
import { getMeditationPosition } from "@/lib/bible/cycle";
import { useSettings } from "./use-settings";
import type { MeditationLog } from "@/types/database";

export function useMeditation() {
  const { settings, loading: settingsLoading } = useSettings();
  const supabase = useMemo(() => createClient(), []);
  const [today, setToday] = useState<string>(() => getLogicalDate());
  const [log, setLog] = useState<MeditationLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function refresh() {
      setToday((p) => {
        const next = getLogicalDate();
        return p === next ? p : next;
      });
    }
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, []);

  const startDate = settings?.meditation_start_date ?? null;
  const position = useMemo(
    () => getMeditationPosition(today, startDate ?? null),
    [today, startDate],
  );

  const loadLog = useCallback(async () => {
    if (!position || position.isFuture) {
      setLog(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("meditation_logs")
        .select("*")
        .eq("user_id", FIXED_USER_ID)
        .eq("date", today)
        .maybeSingle();
      setLog((data as MeditationLog | null) ?? null);
    } catch {
      setLog(null);
    }
    setLoading(false);
  }, [supabase, today, position]);

  useEffect(() => {
    if (settingsLoading) return;
    setLoading(true);
    loadLog();
  }, [loadLog, settingsLoading]);

  const toggle = useCallback(async () => {
    if (!position || position.isFuture) return;
    const nextCompleted = !(log?.completed ?? false);
    const completedAt = nextCompleted ? new Date().toISOString() : null;
    if (log) {
      const { data } = await supabase
        .from("meditation_logs")
        .update({
          completed: nextCompleted,
          completed_at: completedAt,
          psalm_number: position.psalm,
        })
        .eq("id", log.id)
        .select()
        .maybeSingle();
      if (data) setLog(data as MeditationLog);
    } else {
      const { data } = await supabase
        .from("meditation_logs")
        .insert({
          user_id: FIXED_USER_ID,
          date: today,
          psalm_number: position.psalm,
          completed: nextCompleted,
          completed_at: completedAt,
        })
        .select()
        .maybeSingle();
      if (data) setLog(data as MeditationLog);
    }
  }, [supabase, today, position, log]);

  return {
    loading: loading || settingsLoading,
    hasStartDate: !!startDate,
    isFuture: position?.isFuture ?? false,
    psalm: position?.psalm ?? null,
    cycle: position?.cycle ?? null,
    completed: log?.completed ?? false,
    toggle,
    today,
  };
}
