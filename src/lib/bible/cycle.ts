import { READING_CYCLE_LENGTH, MEDITATION_CYCLE_LENGTH } from "./reading-plan";

// 날짜 차이 계산은 'YYYY-MM-DD' 문자열을 파싱한 UTC 정오 기준으로 수행해
// 로컬 타임존/DST에 영향받지 않게 한다. 모든 입력은 로컬 캘린더 날짜 문자열이다.
const MS_PER_DAY = 86_400_000;

function parseLocalDate(s: string): number {
  // 'YYYY-MM-DD' → UTC noon timestamp.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return NaN;
  const [, y, mo, d] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), 12);
}

function diffDays(todayISO: string, startISO: string): number {
  const t = parseLocalDate(todayISO);
  const s = parseLocalDate(startISO);
  if (Number.isNaN(t) || Number.isNaN(s)) return -1;
  return Math.round((t - s) / MS_PER_DAY);
}

export interface CyclePosition {
  day: number; // 1-based within cycle
  cycle: number; // 1-based
  isFuture: boolean;
}

export function getReadingPosition(todayISO: string, startISO: string | null): CyclePosition | null {
  if (!startISO) return null;
  const diff = diffDays(todayISO, startISO);
  if (diff < 0) return { day: 1, cycle: 1, isFuture: true };
  return {
    day: (diff % READING_CYCLE_LENGTH) + 1,
    cycle: Math.floor(diff / READING_CYCLE_LENGTH) + 1,
    isFuture: false,
  };
}

export function getMeditationPosition(todayISO: string, startISO: string | null): (CyclePosition & { psalm: number }) | null {
  if (!startISO) return null;
  const diff = diffDays(todayISO, startISO);
  if (diff < 0) return { day: 1, cycle: 1, isFuture: true, psalm: 1 };
  const day = (diff % MEDITATION_CYCLE_LENGTH) + 1;
  return {
    day,
    psalm: day,
    cycle: Math.floor(diff / MEDITATION_CYCLE_LENGTH) + 1,
    isFuture: false,
  };
}
