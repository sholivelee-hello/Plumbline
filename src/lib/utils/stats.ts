export function getActiveDays(
  createdAt: string,
  deactivatedAt: string | null,
  rangeStart: string,
  rangeEnd: string
): number {
  const created = new Date(createdAt.slice(0, 10));
  const deactivated = deactivatedAt ? new Date(deactivatedAt.slice(0, 10)) : null;
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const effectiveStart = created > start ? created : start;
  const effectiveEnd = deactivated && deactivated < end ? deactivated : end;
  if (effectiveStart > effectiveEnd) return 0;
  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function isNumericAchieved(value: number | null, targetValue: number | null): boolean {
  if (value === null || value === undefined) return false;
  if (targetValue !== null && targetValue !== undefined) return value >= targetValue;
  return value > 0;
}

export function calcAchievementRate(achievedDays: number, activeDays: number): number {
  if (activeDays <= 0) return 0;
  return Math.min(100, (achievedDays / activeDays) * 100);
}

export function getDailyAchievementRate(
  templates: Array<{
    id: string;
    type: "check" | "number";
    target_value: number | null;
    created_at: string;
    deactivated_at: string | null;
  }>,
  logs: Array<{ template_id: string; completed: boolean; value: number | null }>
): number {
  if (templates.length === 0) return 0;
  const logMap = new Map(logs.map((l) => [l.template_id, l]));
  let achieved = 0;
  for (const t of templates) {
    const log = logMap.get(t.id);
    if (!log) continue;
    if (t.type === "check") {
      if (log.completed) achieved++;
    } else {
      if (isNumericAchieved(log.value, t.target_value)) achieved++;
    }
  }
  return calcAchievementRate(achieved, templates.length);
}

export function getMonthWeeks(
  month: string
): Array<{ label: string; start: number; end: number }> {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return [
    { label: "1주차", start: 1, end: 7 },
    { label: "2주차", start: 8, end: 14 },
    { label: "3주차", start: 15, end: 21 },
    { label: "4주차", start: 22, end: lastDay },
  ];
}
