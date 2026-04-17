// @vitest-environment node
// src/lib/__tests__/finance-utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  getLastDayOfMonth,
  adjustDayOfMonth,
  getCurrentMonth,
} from '@/lib/finance-utils';

describe('formatCurrency', () => {
  it('formats positive integer with commas', () => {
    expect(formatCurrency(2550000)).toBe('2,550,000');
  });
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0');
  });
  it('formats with sign prefix', () => {
    expect(formatCurrency(100000, { sign: true })).toBe('+100,000');
    expect(formatCurrency(-50000, { sign: true })).toBe('-50,000');
  });
  it('formats with won suffix', () => {
    expect(formatCurrency(100000, { suffix: '원' })).toBe('100,000원');
  });
});

describe('formatCurrencyInput', () => {
  it('strips non-digits and adds commas', () => {
    expect(formatCurrencyInput('2550000')).toBe('2,550,000');
  });
  it('returns empty for empty input', () => {
    expect(formatCurrencyInput('')).toBe('');
  });
  it('handles mixed input', () => {
    expect(formatCurrencyInput('1,234abc567')).toBe('1,234,567');
  });
});

describe('parseCurrencyInput', () => {
  it('parses comma-formatted string', () => {
    expect(parseCurrencyInput('2,550,000')).toBe(2550000);
  });
  it('returns 0 for empty', () => {
    expect(parseCurrencyInput('')).toBe(0);
  });
  it('caps at MAX_AMOUNT', () => {
    expect(parseCurrencyInput('9999999999')).toBe(999999999);
  });
});

describe('getLastDayOfMonth', () => {
  it('returns 28 for Feb 2026', () => {
    expect(getLastDayOfMonth('2026-02')).toBe(28);
  });
  it('returns 31 for Jan', () => {
    expect(getLastDayOfMonth('2026-01')).toBe(31);
  });
  it('returns 30 for Apr', () => {
    expect(getLastDayOfMonth('2026-04')).toBe(30);
  });
});

describe('adjustDayOfMonth', () => {
  it('returns same day if valid', () => {
    expect(adjustDayOfMonth(15, '2026-04')).toBe(15);
  });
  it('adjusts day 31 to last day for short months', () => {
    expect(adjustDayOfMonth(31, '2026-02')).toBe(28);
    expect(adjustDayOfMonth(31, '2026-04')).toBe(30);
  });
});

describe('getCurrentMonth', () => {
  it('returns YYYY-MM format', () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});
