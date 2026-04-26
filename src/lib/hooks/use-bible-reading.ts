"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { getLogicalDate } from "@/lib/utils/date";
import { getReadingPosition } from "@/lib/bible/cycle";
import { expandDay } from "@/lib/bible/reading-plan";
import { useSettings } from "./use-settings";
import type { BibleReadingChapterCheck, BibleReadingLog } from "@/types/database";

export function useBibleReading() {
  const { settings, loading: settingsLoading } = useSettings();
  const supabase = useMemo(() => createClient(), []);
  const [today, setToday] = useState<string>(() => getLogicalDate());
  const [checks, setChecks] = useState<BibleReadingChapterCheck[]>([]);
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

  const startDate = settings?.bible_reading_start_date ?? null;
  const position = useMemo(
    () => getReadingPosition(today, startDate ?? null),
    [today, startDate],
  );

  const chapters = useMemo(() => {
    if (!position || position.isFuture) return [];
    return expandDay(position.day);
  }, [position]);

  const loadChecks = useCallback(async () => {
    if (!position || position.isFuture) {
      setChecks([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("bible_reading_chapter_checks")
        .select("*")
        .eq("user_id", FIXED_USER_ID)
        .eq("date", today);
      setChecks((data as BibleReadingChapterCheck[] | null) ?? []);
    } catch {
      setChecks([]);
    }
    setLoading(false);
  }, [supabase, today, position]);

  useEffect(() => {
    if (settingsLoading) return;
    setLoading(true);
    loadChecks();
  }, [loadChecks, settingsLoading]);

  const checkedSet = useMemo(() => new Set(checks.map((c) => c.ord)), [checks]);
  const total = chapters.length;
  const checkedCount = chapters.reduce(
    (acc, ch) => acc + (checkedSet.has(ch.ord) ? 1 : 0),
    0,
  );
  const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  const upsertSummary = useCallback(
    async (newCheckedCount: number, newTotal: number) => {
      const completedAt =
        newTotal > 0 && newCheckedCount === newTotal
          ? new Date().toISOString()
          : null;
      try {
        const { data: existing } = await supabase
          .from("bible_reading_logs")
          .select("id")
          .eq("user_id", FIXED_USER_ID)
          .eq("date", today)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("bible_reading_logs")
            .update({
              total_chapters: newTotal,
              checked_chapters: newCheckedCount,
              completed_at: completedAt,
            })
            .eq("id", (existing as BibleReadingLog).id);
        } else {
          await supabase.from("bible_reading_logs").insert({
            user_id: FIXED_USER_ID,
            date: today,
            total_chapters: newTotal,
            checked_chapters: newCheckedCount,
            completed_at: completedAt,
          });
        }
      } catch {
        // ignore
      }
    },
    [supabase, today],
  );

  const toggleChapter = useCallback(
    async (ord: number, label: string): Promise<number | null> => {
      if (!position || position.isFuture) return null;
      if (total === 0) return null;
      let nextLength = 0;
      const isChecked = checkedSet.has(ord);
      if (isChecked) {
        setChecks((cur) => {
          const next = cur.filter((c) => c.ord !== ord);
          nextLength = next.length;
          return next;
        });
        try {
          await supabase
            .from("bible_reading_chapter_checks")
            .delete()
            .eq("user_id", FIXED_USER_ID)
            .eq("date", today)
            .eq("ord", ord);
        } catch {
          // rollback on failure
          setChecks((cur) => {
            if (cur.some((c) => c.ord === ord)) return cur;
            return [
              ...cur,
              {
                id: `tmp-${ord}`,
                user_id: FIXED_USER_ID,
                date: today,
                ord,
                label,
                checked_at: new Date().toISOString(),
              },
            ];
          });
          return null;
        }
        await upsertSummary(nextLength, total);
        return nextLength;
      } else {
        setChecks((cur) => {
          if (cur.some((c) => c.ord === ord)) {
            nextLength = cur.length;
            return cur;
          }
          const next = [
            ...cur,
            {
              id: `tmp-${ord}`,
              user_id: FIXED_USER_ID,
              date: today,
              ord,
              label,
              checked_at: new Date().toISOString(),
            },
          ];
          nextLength = next.length;
          return next;
        });
        try {
          const { data } = await supabase
            .from("bible_reading_chapter_checks")
            .insert({
              user_id: FIXED_USER_ID,
              date: today,
              ord,
              label,
            })
            .select()
            .maybeSingle();
          if (data) {
            setChecks((cur) =>
              cur.map((c) =>
                c.ord === ord ? (data as BibleReadingChapterCheck) : c,
              ),
            );
          }
        } catch {
          setChecks((cur) => cur.filter((c) => c.ord !== ord));
          return null;
        }
        await upsertSummary(nextLength, total);
        return nextLength;
      }
    },
    [supabase, today, position, checkedSet, total, upsertSummary],
  );

  return {
    loading: loading || settingsLoading,
    hasStartDate: !!startDate,
    startDate,
    isFuture: position?.isFuture ?? false,
    day: position?.day ?? null,
    cycle: position?.cycle ?? null,
    chapters,
    checkedSet,
    total,
    checkedCount,
    percent,
    toggleChapter,
    today,
  };
}

export type UseBibleReadingReturn = ReturnType<typeof useBibleReading>;
