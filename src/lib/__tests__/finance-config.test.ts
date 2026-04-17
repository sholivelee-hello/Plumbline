// @vitest-environment node
// src/lib/__tests__/finance-config.test.ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GROUPS,
  getItemKey,
  parseItemKey,
  getGroupById,
  getItemTitle,
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
});

describe('getGroupById', () => {
  it('finds group', () => {
    const g = getGroupById(DEFAULT_GROUPS, 'sowing');
    expect(g?.title).toBe('좋은 땅 (하늘은행)');
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
