import type { SupabaseClient } from "@supabase/supabase-js";
import { getReadingPosition, getMeditationPosition } from "./cycle";

interface ReadingMeditationDays {
  // date(YYYY-MM-DD) -> completed (true if all chapters checked / meditation done)
  readingDoneByDate: Record<string, boolean>;
  meditationDoneByDate: Record<string, boolean>;
  // date -> "applicable" (true if start_date <= date)
  readingApplicableByDate: Record<string, boolean>;
  meditationApplicableByDate: Record<string, boolean>;
  hasReadingStart: boolean;
  hasMeditationStart: boolean;
}

interface UserSettingsRow {
  bible_reading_start_date?: string | null;
  meditation_start_date?: string | null;
}

interface BibleReadingLogRow {
  date: string;
  total_chapters: number;
  checked_chapters: number;
}

interface MeditationLogRow {
  date: string;
  completed: boolean;
}

export async function fetchReadingMeditationDays(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ReadingMeditationDays> {
  const empty: ReadingMeditationDays = {
    readingDoneByDate: {},
    meditationDoneByDate: {},
    readingApplicableByDate: {},
    meditationApplicableByDate: {},
    hasReadingStart: false,
    hasMeditationStart: false,
  };

  try {
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("bible_reading_start_date, meditation_start_date")
      .eq("user_id", userId)
      .maybeSingle();
    const settings = (settingsData ?? null) as UserSettingsRow | null;

    const readingStart = settings?.bible_reading_start_date ?? null;
    const meditationStart = settings?.meditation_start_date ?? null;

    const [readingLogs, meditationLogs] = await Promise.all([
      readingStart
        ? supabase
            .from("bible_reading_logs")
            .select("date, total_chapters, checked_chapters")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
        : Promise.resolve({ data: [] as BibleReadingLogRow[] }),
      meditationStart
        ? supabase
            .from("meditation_logs")
            .select("date, completed")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
        : Promise.resolve({ data: [] as MeditationLogRow[] }),
    ]);

    const readingDoneByDate: Record<string, boolean> = {};
    const meditationDoneByDate: Record<string, boolean> = {};
    const readingApplicableByDate: Record<string, boolean> = {};
    const meditationApplicableByDate: Record<string, boolean> = {};

    if (readingStart) {
      for (const log of (readingLogs.data ?? []) as BibleReadingLogRow[]) {
        readingDoneByDate[log.date] =
          log.total_chapters > 0 && log.checked_chapters >= log.total_chapters;
      }
    }
    if (meditationStart) {
      for (const log of (meditationLogs.data ?? []) as MeditationLogRow[]) {
        meditationDoneByDate[log.date] = log.completed === true;
      }
    }

    return {
      readingDoneByDate,
      meditationDoneByDate,
      readingApplicableByDate, // populated by caller per date
      meditationApplicableByDate,
      hasReadingStart: !!readingStart,
      hasMeditationStart: !!meditationStart,
    };
  } catch {
    return empty;
  }
}

export function isApplicable(
  dateStr: string,
  startDateStr: string | null | undefined,
): boolean {
  if (!startDateStr) return false;
  const pos = getReadingPosition(dateStr, startDateStr);
  return !!pos && !pos.isFuture;
}

export function isMeditationApplicable(
  dateStr: string,
  startDateStr: string | null | undefined,
): boolean {
  if (!startDateStr) return false;
  const pos = getMeditationPosition(dateStr, startDateStr);
  return !!pos && !pos.isFuture;
}
