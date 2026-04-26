import type { SupabaseClient } from "@supabase/supabase-js";
import type { BasicsLog, BasicsTemplate } from "@/types/database";
import { FIXED_USER_ID } from "@/lib/constants";
import { getReadingPosition, getMeditationPosition } from "./cycle";

export interface VirtualBasicsItem {
  template: BasicsTemplate;
  dailyLogs: Record<string, BasicsLog | null>;
  achievementRate: number;
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

interface SettingsRow {
  bible_reading_start_date?: string | null;
  meditation_start_date?: string | null;
}

const VIRTUAL_READING_ID = "__virtual_bible_reading__";
const VIRTUAL_MEDITATION_ID = "__virtual_meditation__";

export const VIRTUAL_TEMPLATE_IDS = new Set<string>([
  VIRTUAL_READING_ID,
  VIRTUAL_MEDITATION_ID,
]);

function makeVirtualTemplate(
  id: string,
  title: string,
  startDate: string,
): BasicsTemplate {
  return {
    id,
    user_id: FIXED_USER_ID,
    category: "spiritual",
    title,
    type: "check",
    unit: null,
    target_value: null,
    step_value: null,
    sort_order: -1,
    is_active: true,
    deactivated_at: null,
    created_at: `${startDate}T00:00:00Z`,
  };
}

function makeSyntheticLog(
  templateId: string,
  date: string,
  completed: boolean,
): BasicsLog {
  return {
    id: `${templateId}_${date}`,
    user_id: FIXED_USER_ID,
    template_id: templateId,
    date,
    completed,
    value: null,
    completed_at: completed ? `${date}T00:00:00Z` : null,
  };
}

async function fetchSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<SettingsRow | null> {
  try {
    const { data } = await supabase
      .from("user_settings")
      .select("bible_reading_start_date, meditation_start_date")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as SettingsRow | null) ?? null;
  } catch {
    return null;
  }
}

async function fetchReadingLogs(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<BibleReadingLogRow[]> {
  try {
    const { data } = await supabase
      .from("bible_reading_logs")
      .select("date, total_chapters, checked_chapters")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);
    return (data as BibleReadingLogRow[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchMeditationLogs(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<MeditationLogRow[]> {
  try {
    const { data } = await supabase
      .from("meditation_logs")
      .select("date, completed")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);
    return (data as MeditationLogRow[] | null) ?? [];
  } catch {
    return [];
  }
}

interface FetchOptions {
  supabase: SupabaseClient;
  userId: string;
  startDate: string;
  endDate: string;
  dates: string[];
  today: string;
}

export async function fetchVirtualBasicsItems({
  supabase,
  userId,
  startDate,
  endDate,
  dates,
  today,
}: FetchOptions): Promise<VirtualBasicsItem[]> {
  const settings = await fetchSettings(supabase, userId);
  if (!settings) return [];

  const items: VirtualBasicsItem[] = [];

  if (settings.bible_reading_start_date) {
    const rs = settings.bible_reading_start_date;
    const rows = await fetchReadingLogs(supabase, userId, startDate, endDate);
    const doneByDate = new Map(
      rows.map((r) => [
        r.date,
        r.total_chapters > 0 && r.checked_chapters >= r.total_chapters,
      ]),
    );
    items.push(
      buildVirtualItem({
        id: VIRTUAL_READING_ID,
        title: "📖 통독",
        startDate: rs,
        dates,
        today,
        positionAt: (date) => getReadingPosition(date, rs),
        doneByDate,
      }),
    );
  }

  if (settings.meditation_start_date) {
    const ms = settings.meditation_start_date;
    const rows = await fetchMeditationLogs(supabase, userId, startDate, endDate);
    const doneByDate = new Map(rows.map((r) => [r.date, r.completed === true]));
    items.push(
      buildVirtualItem({
        id: VIRTUAL_MEDITATION_ID,
        title: "✨ 묵상",
        startDate: ms,
        dates,
        today,
        positionAt: (date) => getMeditationPosition(date, ms),
        doneByDate,
      }),
    );
  }

  return items;
}

function buildVirtualItem({
  id,
  title,
  startDate,
  dates,
  today,
  positionAt,
  doneByDate,
}: {
  id: string;
  title: string;
  startDate: string;
  dates: string[];
  today: string;
  positionAt: (date: string) => { isFuture: boolean } | null;
  doneByDate: Map<string, boolean>;
}): VirtualBasicsItem {
  const template = makeVirtualTemplate(id, title, startDate);
  const dailyLogs: Record<string, BasicsLog | null> = {};
  let achieved = 0;
  let active = 0;
  for (const date of dates) {
    const pos = positionAt(date);
    const applicable = !!pos && !pos.isFuture && date <= today;
    if (!applicable) {
      dailyLogs[date] = null;
      continue;
    }
    active++;
    const completed = doneByDate.get(date) === true;
    if (completed) achieved++;
    dailyLogs[date] = makeSyntheticLog(id, date, completed);
  }
  const rate = active === 0 ? 0 : Math.min(100, (achieved / active) * 100);
  return { template, dailyLogs, achievementRate: rate };
}

export interface DailyVirtualResult {
  readingApplicable: Set<string>;
  readingDone: Set<string>;
  meditationApplicable: Set<string>;
  meditationDone: Set<string>;
  hasReadingStart: boolean;
  hasMeditationStart: boolean;
}

export async function fetchDailyVirtualResults(
  supabase: SupabaseClient,
  userId: string,
  dates: string[],
  today: string,
): Promise<DailyVirtualResult> {
  const empty: DailyVirtualResult = {
    readingApplicable: new Set(),
    readingDone: new Set(),
    meditationApplicable: new Set(),
    meditationDone: new Set(),
    hasReadingStart: false,
    hasMeditationStart: false,
  };
  if (dates.length === 0) return empty;

  const settings = await fetchSettings(supabase, userId);
  if (!settings) return empty;

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const result: DailyVirtualResult = { ...empty };
  result.hasReadingStart = !!settings.bible_reading_start_date;
  result.hasMeditationStart = !!settings.meditation_start_date;

  if (settings.bible_reading_start_date) {
    const rs = settings.bible_reading_start_date;
    const rows = await fetchReadingLogs(supabase, userId, startDate, endDate);
    const doneByDate = new Map(
      rows.map((r) => [
        r.date,
        r.total_chapters > 0 && r.checked_chapters >= r.total_chapters,
      ]),
    );
    for (const date of dates) {
      if (date > today) continue;
      const pos = getReadingPosition(date, rs);
      if (!pos || pos.isFuture) continue;
      result.readingApplicable.add(date);
      if (doneByDate.get(date) === true) result.readingDone.add(date);
    }
  }
  if (settings.meditation_start_date) {
    const ms = settings.meditation_start_date;
    const rows = await fetchMeditationLogs(supabase, userId, startDate, endDate);
    const doneByDate = new Map(rows.map((r) => [r.date, r.completed === true]));
    for (const date of dates) {
      if (date > today) continue;
      const pos = getMeditationPosition(date, ms);
      if (!pos || pos.isFuture) continue;
      result.meditationApplicable.add(date);
      if (doneByDate.get(date) === true) result.meditationDone.add(date);
    }
  }
  return result;
}
