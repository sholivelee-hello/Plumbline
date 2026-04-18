export type RangeKey = "all" | "1M" | "3M" | "6M" | "1Y";

export interface WeightEntryLite {
  weighed_on: string;     // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
}

export interface GoalLite {
  target_kg: number;
  deadline: string;       // YYYY-MM-DD
}

export interface Comparison {
  diffKg: number | null;
  refDate: string | null;
  reason?: "insufficient";
}

export interface Stats {
  currentKg: number | null;
  startKg: number | null;
  lostKg: number | null;
  remainKg: number | null;
  daysLeft: number | null;
  weeklyPace: number | null;
  comparisons: {
    w1: Comparison;
    m1: Comparison;
    m3: Comparison;
    y1: Comparison;
  };
}

// ── Helpers ──────────────────────────────────────────────────
function parseDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// ── filterByRange ────────────────────────────────────────────
const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

export function filterByRange(
  entries: WeightEntryLite[],
  range: RangeKey,
  now: Date = new Date()
): WeightEntryLite[] {
  if (range === "all") return entries.slice();
  const months = RANGE_MONTHS[range];
  const threshold = new Date(now);
  threshold.setUTCHours(0, 0, 0, 0);
  threshold.setUTCMonth(threshold.getUTCMonth() - months);
  return entries.filter((e) => parseDate(e.weighed_on).getTime() >= threshold.getTime());
}

// ── calcComparison ───────────────────────────────────────────
export function calcComparison(
  entries: WeightEntryLite[],
  daysAgo: number,
  toleranceDays: number,
  now: Date = new Date()
): Comparison {
  if (entries.length === 0) {
    return { diffKg: null, refDate: null, reason: "insufficient" };
  }
  // 현재 체중: entries[0] (가장 최근)
  const latest = entries[0];
  const targetMs = now.getTime() - daysAgo * 86_400_000;

  let best: WeightEntryLite | null = null;
  let bestDist = Infinity;
  for (const e of entries) {
    const d = Math.abs(parseDate(e.weighed_on).getTime() - targetMs);
    if (d <= toleranceDays * 86_400_000 && d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  if (!best || best === latest) {
    return { diffKg: null, refDate: null, reason: "insufficient" };
  }
  return {
    diffKg: Math.round((latest.weight_kg - best.weight_kg) * 10) / 10,
    refDate: best.weighed_on,
  };
}

// ── calcWeeklyPace ───────────────────────────────────────────
export function calcWeeklyPace(
  currentKg: number,
  targetKg: number,
  deadline: string,
  now: Date = new Date()
): number | null {
  const daysLeft = dayDiff(parseDate(deadline), now);
  if (daysLeft <= 0) return null;
  const remain = currentKg - targetKg;
  if (remain <= 0) return null;
  const weeks = daysLeft / 7;
  return Math.round((remain / weeks) * 100) / 100;
}

// ── calcStats ────────────────────────────────────────────────
export function calcStats(
  entries: WeightEntryLite[],
  goal: GoalLite | null,
  now: Date = new Date()
): Stats {
  const sorted = [...entries].sort((a, b) => {
    if (a.weighed_on !== b.weighed_on) return b.weighed_on.localeCompare(a.weighed_on);
    return b.created_at.localeCompare(a.created_at);
  });
  const currentKg = sorted[0]?.weight_kg ?? null;
  const startKg = sorted[sorted.length - 1]?.weight_kg ?? null;

  const lostKg =
    currentKg != null && startKg != null
      ? Math.round((startKg - currentKg) * 10) / 10
      : null;

  const remainKg =
    currentKg != null && goal
      ? Math.round((currentKg - goal.target_kg) * 10) / 10
      : null;

  const daysLeft = goal ? dayDiff(parseDate(goal.deadline), now) : null;
  const weeklyPace =
    currentKg != null && goal ? calcWeeklyPace(currentKg, goal.target_kg, goal.deadline, now) : null;

  const cmp = (days: number, tol: number) => calcComparison(sorted, days, tol, now);

  return {
    currentKg,
    startKg,
    lostKg,
    remainKg,
    daysLeft,
    weeklyPace,
    comparisons: {
      w1: cmp(7, 7),
      m1: cmp(30, 14),
      m3: cmp(90, 30),
      y1: cmp(365, 30),
    },
  };
}
