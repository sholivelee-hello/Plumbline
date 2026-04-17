// src/lib/finance-utils.ts
export const MAX_AMOUNT = 999_999_999;
export const MAX_DESCRIPTION_LENGTH = 100;

export function formatCurrency(
  amount: number,
  opts?: { sign?: boolean; suffix?: string }
): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('ko-KR');
  let result = formatted;
  if (opts?.sign) {
    result = amount >= 0 ? `+${formatted}` : `-${formatted}`;
  } else if (amount < 0) {
    result = `-${formatted}`;
  }
  if (opts?.suffix) result += opts.suffix;
  return result;
}

export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export function parseCurrencyInput(value: string): number {
  const n = Number(value.replace(/\D/g, '')) || 0;
  return Math.min(n, MAX_AMOUNT);
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getLastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function adjustDayOfMonth(day: number, month: string): number {
  return Math.min(day, getLastDayOfMonth(month));
}

export function getMonthRange(month: string) {
  const last = getLastDayOfMonth(month);
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
