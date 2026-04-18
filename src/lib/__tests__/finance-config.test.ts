// @vitest-environment node
// src/lib/__tests__/finance-config.test.ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GROUPS,
  getItemKey,
  parseItemKey,
  getGroupById,
  getItemTitle,
  parseGroupConfigs,
} from '@/lib/finance-config';

describe('DEFAULT_GROUPS', () => {
  it('has 4 groups', () => {
    expect(DEFAULT_GROUPS).toHaveLength(4);
  });
  it('group ids are obligation/necessity/sowing/want', () => {
    expect(DEFAULT_GROUPS.map(g => g.id)).toEqual(['obligation', 'necessity', 'sowing', 'want']);
  });
});

describe('getItemKey', () => {
  it('joins group and item with underscore', () => {
    expect(getItemKey('obligation', 'tithe')).toBe('obligation_tithe');
  });
});

describe('parseItemKey', () => {
  it('splits key into group and item', () => {
    expect(parseItemKey('necessity_food')).toEqual({ groupId: 'necessity', itemId: 'food' });
  });
  it('throws for key with no underscore', () => {
    expect(() => parseItemKey('noUnderscore')).toThrow();
  });
});

describe('getGroupById', () => {
  it('finds group', () => {
    const g = getGroupById(DEFAULT_GROUPS, 'sowing');
    expect(g?.title).toBe('하늘은행');
  });
  it('returns undefined for unknown', () => {
    expect(getGroupById(DEFAULT_GROUPS, 'xxx')).toBeUndefined();
  });
});

describe('getItemTitle', () => {
  it('returns item title from groups', () => {
    expect(getItemTitle(DEFAULT_GROUPS, 'obligation', 'tithe')).toBe('십일조');
  });
  it('returns itemId as fallback', () => {
    expect(getItemTitle(DEFAULT_GROUPS, 'obligation', 'unknown')).toBe('unknown');
  });
});

describe('parseGroupConfigs', () => {
  it('returns valid array as-is', () => {
    const result = parseGroupConfigs(DEFAULT_GROUPS);
    expect(result).toBe(DEFAULT_GROUPS);
  });
  it('falls back to DEFAULT_GROUPS for malformed array', () => {
    expect(parseGroupConfigs([{ id: 123, title: 'bad' }])).toBe(DEFAULT_GROUPS);
  });
  it('falls back to DEFAULT_GROUPS for null', () => {
    expect(parseGroupConfigs(null)).toBe(DEFAULT_GROUPS);
  });
  it('falls back to DEFAULT_GROUPS for undefined', () => {
    expect(parseGroupConfigs(undefined)).toBe(DEFAULT_GROUPS);
  });
});
