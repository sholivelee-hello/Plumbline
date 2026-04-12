/**
 * Format number as Korean Won: 1,000,000
 */
export function formatWon(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

/**
 * Format time: "09:00"
 */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Calculate percentage, clamped to 0-100.
 */
export function calcPercent(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}
