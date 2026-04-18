import { ROLLOVER_START_MONTH, ROLLOVER_POLICY } from './finance-config';

export interface PrevMonthStats {
  prevBudget: number;
  prevExpense: number;
}

export function getGroupRollover(
  groupId: string,
  month: string,
  stats: PrevMonthStats
): number {
  if (month < ROLLOVER_START_MONTH) return 0;
  const policy = ROLLOVER_POLICY[groupId];
  if (!policy || policy === 'none') return 0;
  const diff = stats.prevBudget - stats.prevExpense;
  return Math.max(0, diff);
}
