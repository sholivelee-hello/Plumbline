// deactivate한 날부터는 더 이상 활성이 아니다. 그 전날까지가 마지막 active 일자.
function lastActiveDateOnOrBefore(deactivatedDay: string): string {
  const d = new Date(`${deactivatedDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getActiveDays(
  createdAt: string,
  deactivatedAt: string | null,
  rangeStart: string,
  rangeEnd: string
): number {
  const createdDay = createdAt.slice(0, 10);
  const deactivatedDay = deactivatedAt ? deactivatedAt.slice(0, 10) : null;
  const created = new Date(createdDay);
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const effectiveStart = created > start ? created : start;
  let effectiveEnd = end;
  if (deactivatedDay) {
    const lastActive = new Date(lastActiveDateOnOrBefore(deactivatedDay));
    if (lastActive < effectiveEnd) effectiveEnd = lastActive;
  }
  if (effectiveStart > effectiveEnd) return 0;
  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// 특정 날짜에 이 항목이 active 였는지. created_at <= date < deactivated_at.
// is_active=false 이면서 deactivated_at도 비어있는 경우는 안전하게 비활성으로 처리한다.
export function isTemplateActiveOnDate(
  template: {
    created_at: string;
    deactivated_at: string | null;
    is_active: boolean;
  },
  date: string,
): boolean {
  if (!template.is_active && !template.deactivated_at) return false;
  const created = template.created_at.slice(0, 10);
  if (created > date) return false;
  if (template.deactivated_at) {
    const deactivated = template.deactivated_at.slice(0, 10);
    if (deactivated <= date) return false;
  }
  return true;
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
