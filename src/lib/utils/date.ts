/**
 * Format a Date object as a local YYYY-MM-DD string (no UTC conversion).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Today's calendar date (local timezone). Rolls over at midnight 00:00.
 */
export function getLogicalDate(): string {
  return toLocalDateString(new Date());
}

/**
 * Format date as Korean style: "4월 12일 (토)"
 */
export function formatDateKR(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * Get Sunday of the week containing the given date.
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return toLocalDateString(date);
}

/**
 * Get array of 7 date strings starting from Sunday.
 */
export function getWeekDates(dateStr: string): string[] {
  const sunday = getWeekStart(dateStr);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday + "T00:00:00");
    d.setDate(d.getDate() + i);
    dates.push(toLocalDateString(d));
  }
  return dates;
}

/**
 * Get previous month string: 'YYYY-MM' → previous 'YYYY-MM'
 */
export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get next month string: 'YYYY-MM' → next 'YYYY-MM'
 */
export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format month as Korean style: 'YYYY-MM' → 'YYYY년 M월'
 */
export function formatMonthKR(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

/**
 * Get current month string: '2026-04'
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

