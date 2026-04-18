import { describe, it, expect } from 'vitest';
import { getGroupRollover } from '../rollover';

describe('getGroupRollover', () => {
  it('returns 0 when month is before rollover start', () => {
    expect(getGroupRollover('necessity', '2026-04', { prevBudget: 100, prevExpense: 80 })).toBe(0);
  });

  it('returns max(0, diff) for obligation (clamp_positive)', () => {
    expect(getGroupRollover('obligation', '2026-05', { prevBudget: 100, prevExpense: 80 })).toBe(20);
    expect(getGroupRollover('obligation', '2026-05', { prevBudget: 100, prevExpense: 120 })).toBe(0);
  });

  it('returns max(0, diff) for necessity (clamp_positive)', () => {
    expect(getGroupRollover('necessity', '2026-05', { prevBudget: 150, prevExpense: 120 })).toBe(30);
    expect(getGroupRollover('necessity', '2026-05', { prevBudget: 150, prevExpense: 200 })).toBe(0);
  });

  it('returns max(0, diff) for sowing (clamp_positive)', () => {
    expect(getGroupRollover('sowing', '2026-05', { prevBudget: 15, prevExpense: 10 })).toBe(5);
    expect(getGroupRollover('sowing', '2026-05', { prevBudget: 15, prevExpense: 20 })).toBe(0);
  });

  it('always returns 0 for want (none policy)', () => {
    expect(getGroupRollover('want', '2026-05', { prevBudget: 50, prevExpense: 10 })).toBe(0);
    expect(getGroupRollover('want', '2026-06', { prevBudget: 0, prevExpense: 0 })).toBe(0);
  });

  it('returns 0 when prev budget is 0 (unset)', () => {
    expect(getGroupRollover('necessity', '2026-05', { prevBudget: 0, prevExpense: 0 })).toBe(0);
  });

  it('returns 0 for unknown group', () => {
    expect(getGroupRollover('unknown_group', '2026-05', { prevBudget: 100, prevExpense: 50 })).toBe(0);
  });
});
