/**
 * Get the "logical date" based on day_start_time.
 * If current time is before day_start_time, the logical date is yesterday.
 * Example: at 02:00 with day_start=04:00, logical date is previous day.
 */
export function getLogicalDate(dayStartTime: string = "04:00"): string {
  const now = new Date();
  const [startHour, startMin] = dayStartTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;

  if (currentMinutes < startMinutes) {
    now.setDate(now.getDate() - 1);
  }

  return now.toISOString().split("T")[0];
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
 * Get Monday of the week containing the given date.
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

/**
 * Get array of 7 date strings starting from Monday.
 */
export function getWeekDates(dateStr: string): string[] {
  const monday = getWeekStart(dateStr);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + "T00:00:00");
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Get current month string: '2026-04'
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Generate time slots between start and end with given interval.
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  let [h, m] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const endMinutes = endTime === "00:00" ? 24 * 60 : endH * 60 + endM;

  while (h * 60 + m < endMinutes) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += intervalMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
  }
  return slots;
}
