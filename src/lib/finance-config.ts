// src/lib/finance-config.ts
export interface GroupItem {
  id: string;
  title: string;
}

export interface FinanceGroup {
  id: string;
  title: string;
  color: string;        // hex
  percentMin: number;
  percentMax: number;
  items: GroupItem[];
}

export const DEFAULT_GROUPS: FinanceGroup[] = [
  {
    id: 'obligation', title: '의무사항', color: '#73A5CA',
    percentMin: 35, percentMax: 40,
    items: [
      { id: 'tithe', title: '십일조' },
      { id: 'debt', title: '빚 청산' },
      { id: 'offering', title: '약속 헌금' },
      { id: 'utility', title: '공과금' },
      { id: 'tax', title: '세금' },
      { id: 'parents', title: '부모님 용돈' },
    ],
  },
  {
    id: 'necessity', title: '필요사항', color: '#FFC81E',
    percentMin: 50, percentMax: 55,
    items: [
      { id: 'food', title: '식비' },
      { id: 'grocery', title: '생필품' },
      { id: 'transport', title: '교통비' },
      { id: 'saving', title: '저축' },
      { id: 'leisure', title: '여가선용비' },
      { id: 'allowance', title: '개인 용돈' },
      { id: 'subscription', title: '구독' },
    ],
  },
  {
    id: 'sowing', title: '하늘은행', color: '#B89B4A',
    percentMin: 5, percentMax: 10,
    items: [{ id: 'heaven', title: '하늘은행' }],
  },
  {
    id: 'want', title: '요망사항', color: '#E87F24',
    percentMin: 5, percentMax: 10,
    items: [{ id: 'want', title: '요망사항' }],
  },
];

export const DEFAULT_INCOME_CATEGORIES = ['급여', '부수입', '투자수익', '용돈', '기타'];

export const SUBSCRIPTION_ITEM_KEY = 'necessity_subscription';

export const SOWING_PRESETS = ['교회 헌금', '선교 후원', '이웃 돕기', '감사 헌금'];

export function getItemKey(groupId: string, itemId: string) {
  return `${groupId}_${itemId}`;
}

export function parseItemKey(key: string): { groupId: string; itemId: string } {
  const idx = key.indexOf('_');
  if (idx === -1) throw new Error(`Invalid item key: "${key}"`);
  return { groupId: key.slice(0, idx), itemId: key.slice(idx + 1) };
}

export function getGroupById(groups: FinanceGroup[], id: string) {
  return groups.find(g => g.id === id);
}

export function getItemTitle(groups: FinanceGroup[], groupId: string, itemId: string): string {
  const group = getGroupById(groups, groupId);
  return group?.items.find(i => i.id === itemId)?.title ?? itemId;
}

export function parseGroupConfigs(raw: unknown): FinanceGroup[] {
  if (!Array.isArray(raw)) return DEFAULT_GROUPS;
  const valid = raw.every(g =>
    g && typeof g === 'object'
    && typeof (g as Record<string, unknown>).id === 'string'
    && typeof (g as Record<string, unknown>).title === 'string'
    && typeof (g as Record<string, unknown>).color === 'string'
    && typeof (g as Record<string, unknown>).percentMin === 'number'
    && typeof (g as Record<string, unknown>).percentMax === 'number'
    && Array.isArray((g as Record<string, unknown>).items)
    && ((g as Record<string, unknown>).items as unknown[]).every(
      (i) => i && typeof i === 'object'
        && typeof (i as Record<string, unknown>).id === 'string'
        && typeof (i as Record<string, unknown>).title === 'string'
    )
  );
  if (!valid) return DEFAULT_GROUPS;
  // Return stored value verbatim. Do NOT auto-merge DEFAULT_GROUPS items —
  // that would resurrect items the user intentionally deleted.
  return raw as FinanceGroup[];
}

// Color mapping for Tailwind classes
export const GROUP_COLORS: Record<string, { bg: string; text: string; darkBg: string; border: string }> = {
  obligation: { bg: 'bg-[#73A5CA]/10', text: 'text-[#73A5CA]', darkBg: 'dark:bg-[#93B8E8]/10', border: 'border-[#73A5CA]' },
  necessity:  { bg: 'bg-[#FFC81E]/10', text: 'text-[#FFC81E]', darkBg: 'dark:bg-[#6EE7B7]/10', border: 'border-[#FFC81E]' },
  sowing:     { bg: 'bg-[#FEFDDF]/40', text: 'text-[#B89B4A]', darkBg: 'dark:bg-[#B89B4A]/15', border: 'border-[#B89B4A]' },
  want:       { bg: 'bg-[#E87F24]/10', text: 'text-[#E87F24]', darkBg: 'dark:bg-[#FDBA74]/10', border: 'border-[#E87F24]' },
};

export const ROLLOVER_START_MONTH = '2026-05';

export type RolloverPolicy = 'clamp_positive' | 'none';

export const ROLLOVER_POLICY: Record<string, RolloverPolicy> = {
  obligation: 'clamp_positive',
  necessity:  'clamp_positive',
  sowing:     'clamp_positive',
  want:       'none',
};
