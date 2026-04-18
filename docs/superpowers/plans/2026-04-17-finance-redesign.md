# Finance Section Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the finance section with a 4-group centered architecture (obligation/necessity/sowing/want), Kakao Bank-style UI, full Supabase data model, and comprehensive financial management features.

**Architecture:** Hub dashboard → 4 group card pages (each an independent "world" with input/view/manage) + shared cashbook/budget/installments/report/settings. All data in Supabase. Common components extracted for consistency. recharts for charts. Vitest + React Testing Library for tests.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, recharts, Vitest, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-17-finance-redesign.md`

---

## File Structure

### New Files
```
supabase/migrations/
  00010_finance_redesign.sql          — Schema migration (new tables, alter existing, drop old)

src/lib/
  finance-config.ts                   — 4-group defaults, helpers (replaces faith-budget-config.ts)
  finance-utils.ts                    — formatCurrency, parseCurrency, date helpers, validators

src/lib/hooks/
  use-budget-settings.ts              — finance_budget_settings CRUD (group configs, income categories)
  use-finance-transactions.ts         — finance_transactions CRUD (replaces use-cashbook.ts)
  use-budget.ts                       — finance_budgets CRUD (replaces use-faith-budget.ts)
  use-finance-hub.ts                  — Hub aggregation (summaries, donut data, today's transactions)
  use-wishlist.ts                     — finance_wishlist CRUD
  use-recurring.ts                    — finance_recurring + automation logic
  use-onboarding.ts                   — Onboarding state management

src/components/finance/
  finance-card.tsx                    — Base card with left color bar, rounded-2xl
  amount-input.tsx                    — Numeric input + quick unit buttons (+1만/+5만/+10만/+50만)
  month-picker.tsx                    — "2026년 4월" + arrows
  group-badge.tsx                     — Color dot + group/item label
  progress-bar.tsx                    — Animated bar with 80%/100% color thresholds
  bottom-sheet.tsx                    — Input form bottom sheet
  finance-donut-chart.tsx             — 4-group donut chart with center total
  transaction-row.tsx                 — Single transaction display
  fab.tsx                             — Floating action button
  finance-skeleton.tsx                — Skeleton loading states for all pages

src/app/finance/
  page.tsx                            — Hub dashboard (rewrite)
  obligation/page.tsx                 — 의무사항 group (rewrite from debts+obligations)
  necessity/page.tsx                  — 필요사항 group (new)
  sowing/page.tsx                     — 하늘은행 passbook (rewrite)
  want/page.tsx                       — 요망사항 + wishlist (new)
  cashbook/page.tsx                   — 출납부 daily+monthly (rewrite)
  budget/page.tsx                     — 예산 관리 (rewrite)
  installments/page.tsx               — 할부 관리 (rewrite)
  report/page.tsx                     — 월간 리포트 (new)
  settings/page.tsx                   — 재정 설정 (new)
  onboarding/page.tsx                 — 온보딩 flow (new)
```

### Files to Modify (existing)
```
src/lib/hooks/use-heaven-bank.ts      — Add dual-write logic, balance calc
src/lib/hooks/use-debts.ts            — Add tags support, updated_at, INTEGER types
src/lib/hooks/use-installments.ts     — Add auto cashbook recording on payment
src/components/dashboard/finance-summary.tsx — Rewrite to use new hooks (use-finance-hub)
src/app/page.tsx                      — Update FinanceSummary import if needed
```

### Files to Delete (after migration)
```
src/lib/faith-budget-config.ts        — Replaced by finance-config.ts
src/lib/finance-sections.ts           — Replaced by 4-group system
src/lib/hooks/use-cashbook.ts         — Replaced by use-finance-transactions.ts
src/lib/hooks/use-faith-budget.ts     — Replaced by use-budget.ts
src/lib/hooks/use-finance.ts          — Replaced by use-finance-hub.ts
src/lib/hooks/use-obligations.ts      — Obligations merged into recurring + obligation group
src/lib/hooks/use-wants.ts            — Replaced by use-wishlist.ts
src/app/finance/debts/                — Merged into obligation/
src/app/finance/heaven-bank/          — Replaced by sowing/
src/app/finance/obligations/          — Merged into obligation/
src/components/finance/debt-card.tsx            — Rebuilt inline
src/components/finance/debt-payment-form.tsx    — Rebuilt inline
src/components/finance/heaven-bank-form.tsx     — Rebuilt inline
src/components/finance/heaven-bank-ledger.tsx   — Rebuilt inline
src/components/finance/installment-card.tsx     — Rebuilt inline
src/components/finance/obligations-list.tsx     — Rebuilt inline
src/components/finance/necessity-detail-modal.tsx — Rebuilt inline
src/components/finance/necessities-tracker.tsx  — Rebuilt inline
src/components/finance/surplus-tracker.tsx      — Rebuilt inline
src/components/finance/wants-list.tsx           — Rebuilt inline
```

### Tailwind Config Changes
- Remove: `surplus`, `debt` color tokens
- Add: `obligation: #1E3A5F`, `necessity: #059669`, `sowing: #7C3AED`, `want: #EA580C` (and dark variants)

---

## Phase 1: Core (MVP)

### Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/00010_finance_redesign.sql`

- [ ] **Step 1: Write migration SQL — Drop triggers and functions**

```sql
-- 1. Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_recalc_balance_insert ON finance_transactions;
DROP TRIGGER IF EXISTS trg_recalc_balance_update ON finance_transactions;
DROP TRIGGER IF EXISTS trg_recalc_balance_delete ON finance_transactions;
DROP FUNCTION IF EXISTS recalculate_account_balance();
```

- [ ] **Step 2: Write migration SQL — Alter finance_transactions**

```sql
-- 2. Add new columns to finance_transactions
ALTER TABLE finance_transactions
  ADD COLUMN group_id TEXT,
  ADD COLUMN item_id TEXT,
  ADD COLUMN income_category TEXT,
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

-- 3. Migrate account_id → group_id/item_id
-- NOTE: account_id is declared UUID but the app stores text budget keys like "obligation_tithe".
-- Guard clause: only migrate rows where account_id looks like a budget key (contains '_').
UPDATE finance_transactions
SET
  group_id = split_part(account_id::text, '_', 1),
  item_id = CASE
    WHEN position('_' IN account_id::text) > 0
    THEN substring(account_id::text FROM position('_' IN account_id::text) + 1)
    ELSE NULL
  END
WHERE account_id IS NOT NULL
  AND account_id::text LIKE '%_%';

-- 4. Drop FK constraint and old columns
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_account_id_fkey;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS account_id;
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_category_id_fkey;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS category_id;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS is_auto;

-- 5. Cast amount to integer
ALTER TABLE finance_transactions ALTER COLUMN amount TYPE INTEGER USING amount::integer;

-- 6. Add indexes (IF NOT EXISTS to avoid conflict with existing indexes)
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date ON finance_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_group ON finance_transactions(user_id, group_id, date);
```

- [ ] **Step 3: Write migration SQL — Alter existing tables**

```sql
-- 7. Alter finance_debts: add tags, updated_at
ALTER TABLE finance_debts
  ADD COLUMN tags TEXT[] DEFAULT '{}',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE finance_debts ALTER COLUMN total_amount TYPE INTEGER USING total_amount::integer;

-- 8. Alter finance_installments: add updated_at
ALTER TABLE finance_installments
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE finance_installments ALTER COLUMN total_amount TYPE INTEGER USING total_amount::integer;
ALTER TABLE finance_installments ALTER COLUMN monthly_payment TYPE INTEGER USING monthly_payment::integer;

-- 9. Alter finance_debt_payments: amount to integer
ALTER TABLE finance_debt_payments ALTER COLUMN amount TYPE INTEGER USING amount::integer;

-- 10. Alter heaven_bank: add created_at, amount to integer
ALTER TABLE heaven_bank
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE heaven_bank ALTER COLUMN amount TYPE INTEGER USING amount::integer;

-- 11. Drop and recreate finance_budgets (existing data is in localStorage, not meaningful here)
-- Existing rows have UUID category_ids that don't map to the new group/item system.
-- Budget data will be re-created via localStorage migration (Task 22) or fresh setup.
DROP TABLE IF EXISTS finance_budgets CASCADE;
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  group_id TEXT NOT NULL,
  item_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data" ON finance_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 4: Write migration SQL — Create new tables**

```sql
-- 12. finance_budget_settings
CREATE TABLE finance_budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_income INTEGER NOT NULL DEFAULT 0,
  group_configs JSONB NOT NULL DEFAULT '[]'::jsonb,
  income_categories JSONB NOT NULL DEFAULT '["급여","부수입","투자수익","용돈","기타"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. finance_wishlist
CREATE TABLE finance_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  saved_amount INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. finance_recurring
CREATE TABLE finance_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  group_id TEXT,
  item_id TEXT,
  income_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. finance_recurring_logs
CREATE TABLE finance_recurring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id UUID REFERENCES finance_recurring(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  transaction_id UUID REFERENCES finance_transactions(id) ON DELETE CASCADE NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_id, month)
);

-- 16. finance_onboarding
CREATE TABLE finance_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_demo_mode BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

- [ ] **Step 5: Write migration SQL — RLS + cleanup**

```sql
-- 17. RLS for new tables
ALTER TABLE finance_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON finance_budget_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_wishlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_recurring FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own logs" ON finance_recurring_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM finance_recurring r WHERE r.id = recurring_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM finance_recurring r WHERE r.id = recurring_id AND r.user_id = auth.uid()));
CREATE POLICY "Users manage own data" ON finance_onboarding FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. Indexes for new tables
CREATE INDEX idx_finance_wishlist_user ON finance_wishlist(user_id);
CREATE INDEX idx_finance_recurring_user ON finance_recurring(user_id);
CREATE INDEX idx_finance_recurring_logs_month ON finance_recurring_logs(recurring_id, month);

-- 19. Migrate finance_obligations → finance_recurring
INSERT INTO finance_recurring (user_id, description, amount, type, day_of_month, group_id, item_id, is_active)
SELECT DISTINCT ON (o.user_id, c.title)
  o.user_id,
  c.title,
  o.amount::integer,
  'expense',
  1,
  'obligation',
  LOWER(REPLACE(c.title, ' ', '_')),
  true
FROM finance_obligations o
JOIN finance_categories c ON c.id = o.category_id
WHERE o.amount > 0;

-- 20. Migrate finance_wants → finance_wishlist
INSERT INTO finance_wishlist (user_id, title, target_amount, saved_amount, priority, is_completed, completed_at, created_at)
SELECT
  user_id, title,
  COALESCE(estimated_price::integer, 0),
  0,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_month, id),
  is_purchased,
  purchased_date::timestamptz,
  now()
FROM finance_wants;

-- 20. Drop obsolete tables
DROP TABLE IF EXISTS finance_obligations CASCADE;
DROP TABLE IF EXISTS finance_wants CASCADE;
DROP TABLE IF EXISTS finance_accounts CASCADE;
DROP TABLE IF EXISTS finance_categories CASCADE;
```

- [ ] **Step 6: Commit migration**

```bash
git add supabase/migrations/00010_finance_redesign.sql
git commit -m "feat(finance): add schema migration for 4-group redesign"
```

---

### Task 2: TypeScript Types & Finance Config

**Files:**
- Create: `src/lib/finance-config.ts`
- Create: `src/lib/finance-utils.ts`
- Modify: `src/types/database.ts`
- Test: `src/lib/__tests__/finance-utils.test.ts`
- Test: `src/lib/__tests__/finance-config.test.ts`

- [ ] **Step 1: Write tests for finance-utils**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/finance-utils.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement finance-utils.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/finance-utils.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Write tests for finance-config**

```typescript
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
```

- [ ] **Step 6: Implement finance-config.ts**

```typescript
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
    id: 'obligation', title: '의무사항', color: '#1E3A5F',
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
    id: 'necessity', title: '필요사항', color: '#059669',
    percentMin: 50, percentMax: 55,
    items: [
      { id: 'food', title: '식비' },
      { id: 'grocery', title: '생필품' },
      { id: 'transport', title: '교통비' },
      { id: 'saving', title: '저축' },
      { id: 'leisure', title: '여가선용비' },
      { id: 'allowance', title: '개인 용돈' },
    ],
  },
  {
    id: 'sowing', title: '하늘은행', color: '#7C3AED',
    percentMin: 5, percentMax: 10,
    items: [{ id: 'heaven', title: '하늘은행' }],
  },
  {
    id: 'want', title: '요망사항', color: '#EA580C',
    percentMin: 5, percentMax: 10,
    items: [{ id: 'want', title: '요망사항' }],
  },
];

export const DEFAULT_INCOME_CATEGORIES = ['급여', '부수입', '투자수익', '용돈', '기타'];

export const SOWING_PRESETS = ['교회 헌금', '선교 후원', '이웃 돕기', '감사 헌금'];

export function getItemKey(groupId: string, itemId: string) {
  return `${groupId}_${itemId}`;
}

export function parseItemKey(key: string) {
  const idx = key.indexOf('_');
  return { groupId: key.slice(0, idx), itemId: key.slice(idx + 1) };
}

export function getGroupById(groups: FinanceGroup[], id: string) {
  return groups.find(g => g.id === id);
}

export function getItemTitle(groups: FinanceGroup[], groupId: string, itemId: string): string {
  const group = getGroupById(groups, groupId);
  return group?.items.find(i => i.id === itemId)?.title ?? itemId;
}

// Color mapping for Tailwind classes
export const GROUP_COLORS: Record<string, { bg: string; text: string; darkBg: string; border: string }> = {
  obligation: { bg: 'bg-[#1E3A5F]/10', text: 'text-[#1E3A5F]', darkBg: 'dark:bg-[#93B8E8]/10', border: 'border-[#1E3A5F]' },
  necessity:  { bg: 'bg-[#059669]/10', text: 'text-[#059669]', darkBg: 'dark:bg-[#6EE7B7]/10', border: 'border-[#059669]' },
  sowing:     { bg: 'bg-[#7C3AED]/10', text: 'text-[#7C3AED]', darkBg: 'dark:bg-[#C4B5FD]/10', border: 'border-[#7C3AED]' },
  want:       { bg: 'bg-[#EA580C]/10', text: 'text-[#EA580C]', darkBg: 'dark:bg-[#FDBA74]/10', border: 'border-[#EA580C]' },
};
```

- [ ] **Step 7: Update TypeScript types in database.ts**

Add new interfaces for all redesigned tables: `FinanceTransaction`, `FinanceBudget`, `FinanceBudgetSettings`, `FinanceWishlist`, `FinanceRecurring`, `FinanceRecurringLog`, `FinanceOnboarding`. Update existing `FinanceDebt` to include `tags` and `updated_at`. Remove obsolete types (`FinanceAccount`, `FinanceCategory`, `FinanceObligation`).

- [ ] **Step 8: Run all tests, commit**

Run: `npx vitest run src/lib/__tests__/`
Expected: ALL PASS

```bash
git add src/lib/finance-config.ts src/lib/finance-utils.ts src/types/database.ts src/lib/__tests__/
git commit -m "feat(finance): add finance config, utils, and updated types"
```

---

### Task 3: Tailwind Config & CSS Variables

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts**

Remove `surplus` and `debt` color tokens. Add new finance group colors:
```
obligation: { DEFAULT: '#1E3A5F', light: '#93B8E8' }
necessity:  { DEFAULT: '#059669', light: '#6EE7B7' }
sowing:     { DEFAULT: '#7C3AED', light: '#C4B5FD' }
want:       { DEFAULT: '#EA580C', light: '#FDBA74' }
```

- [ ] **Step 2: Add CSS variables to globals.css**

Add finance-specific CSS variables for surface, card, income/expense colors that respect dark mode.

- [ ] **Step 3: Verify build**

Run: `npx next build` (or `npm run build`)
Verify no Tailwind errors.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat(finance): update color tokens for 4-group design system"
```

---

### Task 4: Common Components — FinanceCard, AmountInput, MonthPicker

**Files:**
- Create: `src/components/finance/finance-card.tsx`
- Create: `src/components/finance/amount-input.tsx`
- Create: `src/components/finance/month-picker.tsx`
- Test: `src/components/finance/__tests__/amount-input.test.tsx`

- [ ] **Step 1: Write test for AmountInput**

```typescript
// src/components/finance/__tests__/amount-input.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AmountInput } from '../amount-input';

describe('AmountInput', () => {
  it('renders with placeholder', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('금액')).toBeInTheDocument();
  });

  it('shows quick unit buttons', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByText('+1만')).toBeInTheDocument();
    expect(screen.getByText('+5만')).toBeInTheDocument();
    expect(screen.getByText('+10만')).toBeInTheDocument();
    expect(screen.getByText('+50만')).toBeInTheDocument();
  });

  it('calls onChange with formatted value on quick button click', () => {
    const onChange = vi.fn();
    render(<AmountInput value="50,000" onChange={onChange} />);
    fireEvent.click(screen.getByText('+1만'));
    expect(onChange).toHaveBeenCalledWith('60,000');
  });

  it('formats input with commas', () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('금액'), { target: { value: '150000' } });
    expect(onChange).toHaveBeenCalledWith('150,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/finance/__tests__/amount-input.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement FinanceCard**

Base card component with: `rounded-2xl`, padding, optional left color bar (`groupColor` prop), shadow, dark mode. Props: `children`, `groupColor?`, `className?`, `onClick?`.

- [ ] **Step 4: Implement AmountInput**

Numeric input with `inputMode="numeric"`, `formatCurrencyInput` on change, quick unit buttons (+1만/+5만/+10만/+50만), shake animation on empty submit via `ref.shake()`. Props: `value`, `onChange`, `placeholder?`, `autoFocus?`.

- [ ] **Step 5: Implement MonthPicker**

"2026년 4월" display with left/right arrows. Props: `month` (YYYY-MM), `onChange`, `maxMonth?` (to disable future). Uses `shiftMonth` from finance-utils.

- [ ] **Step 6: Run tests, commit**

Run: `npx vitest run src/components/finance/__tests__/`
Expected: ALL PASS

```bash
git add src/components/finance/
git commit -m "feat(finance): add FinanceCard, AmountInput, MonthPicker components"
```

---

### Task 5: Common Components — GroupBadge, ProgressBar, TransactionRow, FAB

**Files:**
- Create: `src/components/finance/group-badge.tsx`
- Create: `src/components/finance/progress-bar.tsx`
- Create: `src/components/finance/transaction-row.tsx`
- Create: `src/components/finance/fab.tsx`

- [ ] **Step 1: Implement GroupBadge**

Color dot + "의무 · 십일조" text. Props: `groupId`, `itemId?`, `groups` (from budget settings).

- [ ] **Step 2: Implement ProgressBar**

NOTE: `src/components/ui/progress-bar.tsx` already exists and is used by non-finance pages (basics). This is a SEPARATE finance-specific ProgressBar with group color support and threshold warnings. Do NOT modify or replace the existing ui/progress-bar.

Animated bar. Color logic: default=group color, >=80%=orange, >=100%=red. Props: `value`, `max`, `color?`, `showPercent?`.

- [ ] **Step 3: Implement TransactionRow**

Single transaction display: group dot | description | group badge | amount (+/-). Tap handler for edit/delete. Props: `transaction`, `groups`, `onEdit?`, `onDelete?`.

- [ ] **Step 4: Implement FAB**

Floating "+" button, bottom-right, `min-h-[44px]`, shadow. Props: `onClick`. Fixed position with safe area respect.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/
git commit -m "feat(finance): add GroupBadge, ProgressBar, TransactionRow, FAB components"
```

---

### Task 6: Common Components — BottomSheet, DonutChart, Skeleton

**Files:**
- Create: `src/components/finance/bottom-sheet.tsx`
- Create: `src/components/finance/finance-donut-chart.tsx`
- Create: `src/components/finance/finance-skeleton.tsx`

- [ ] **Step 1: Implement BottomSheet**

Slide-up overlay for input forms. Handles: backdrop click to close, escape key, focus trap, scroll lock. Props: `isOpen`, `onClose`, `title?`, `children`.

- [ ] **Step 2: Implement DonutChart**

Using recharts `<PieChart>` + `<Pie>`. 4 segments with group colors, center text showing total. Props: `data: { groupId, amount }[]`, `total?`. Include legend below chart.

- [ ] **Step 3: Implement FinanceSkeleton**

Reusable skeleton variants: `HubSkeleton`, `GroupPageSkeleton`, `CashbookSkeleton`, `BudgetSkeleton`. Each mirrors the actual page layout.

- [ ] **Step 4: Dev server visual check**

Run: `npm run dev`
Create a temporary test page importing each component. Verify visual appearance in both light and dark mode, mobile and desktop viewports.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/
git commit -m "feat(finance): add BottomSheet, DonutChart, Skeleton components"
```

---

### Task 7: Core Hooks — use-budget-settings, use-finance-transactions

**Files:**
- Create: `src/lib/hooks/use-budget-settings.ts`
- Create: `src/lib/hooks/use-finance-transactions.ts`

- [ ] **Step 1: Implement use-budget-settings**

Manages `finance_budget_settings` singleton per user. API:
- `settings` — current settings (group_configs, income_categories, monthly_income)
- `groups` — parsed FinanceGroup[] from JSONB (falls back to DEFAULT_GROUPS)
- `loading`
- `updateIncome(amount)` — update monthly_income
- `updateGroupConfigs(configs)` — save group customizations
- `updateIncomeCategories(cats)` — save income categories
- `initializeSettings()` — create row with defaults if not exists

- [ ] **Step 2: Implement use-finance-transactions**

Replaces `use-cashbook.ts`. Manages `finance_transactions`. API:
- `transactions` — all transactions for given month
- `incomes` / `expenses` — filtered
- `totalIncome` / `totalExpense`
- `byGroup` — `Record<string, { total: number; byItem: Record<string, number> }>`
- `todayTransactions` — today's entries only
- `loading`
- `addTransaction(data)` → `{ ok, error }`
- `updateTransaction(id, data)` → `{ ok, error }`
- `deleteTransaction(id)` → `{ ok, error }`

Uses `getMonthRange` from finance-utils for date filtering.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-budget-settings.ts src/lib/hooks/use-finance-transactions.ts
git commit -m "feat(finance): add use-budget-settings and use-finance-transactions hooks"
```

---

### Task 8: Core Hooks — use-budget, use-finance-hub

**Files:**
- Create: `src/lib/hooks/use-budget.ts`
- Create: `src/lib/hooks/use-finance-hub.ts`

- [ ] **Step 1: Implement use-budget**

Replaces `use-faith-budget.ts`. Now reads from Supabase `finance_budgets`. API:
- `budgets` — `Record<string, number>` keyed by `{groupId}_{itemId}`
- `groupTotals` — `Record<string, number>` per group
- `grandTotal` — sum of all budgets
- `loading`
- `updateBudgetAmount(groupId, itemId, amount)` — upsert with debounce (1000ms)
- `bulkSetBudgets(entries)` — for initial setup / recommendations
- `copyFromPreviousMonth(sourceMonth)` — copy all budget rows

- [ ] **Step 2: Implement use-finance-hub**

Aggregation hook for the hub dashboard. Composes other hooks. API:
- `summary` — `{ income, expense, balance }`
- `donutData` — `{ groupId, amount, percent }[]` for chart
- `groupCards` — `{ groupId, title, color, budget, actual, percent }[]`
- `todayTransactions` — today's entries
- `loading`

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-budget.ts src/lib/hooks/use-finance-hub.ts
git commit -m "feat(finance): add use-budget and use-finance-hub hooks"
```

---

### Task 9: Hub Dashboard Page

**Files:**
- Rewrite: `src/app/finance/page.tsx`

- [ ] **Step 1: Implement hub dashboard layout**

Structure (top to bottom):
1. `<MonthPicker>` header
2. Summary cards (3x: income/expense/balance) using `<FinanceCard>`
3. `<FinanceDonutChart>` with 4-group data
4. 4 group entry cards (2-col grid) — each shows group name, percent guide, budget vs actual, mini `<ProgressBar>`, links to `/finance/{groupId}`
5. Quick shortcuts (horizontal scroll chips): 출납부/예산/할부/리포트/설정
6. Today's transactions preview (latest 5) with "더보기" link to cashbook
7. `<FAB>` → opens `<BottomSheet>` for universal input

- [ ] **Step 2: Implement universal input BottomSheet**

Flow inside BottomSheet:
1. Group selection (4 chips + income option)
2. Item selection (items within selected group)
3. `<AmountInput>` with quick unit buttons
4. Date picker (default today, tap to change)
5. Description input
6. Save button → calls `addTransaction`

- [ ] **Step 3: Wire up responsive layout**

Mobile: summary cards horizontal scroll, group cards 1-col.
Desktop: summary cards 3-col, group cards 2-col, today's transactions in right sidebar.

- [ ] **Step 4: Test in browser**

Run: `npm run dev` → navigate to `/finance`
Verify: hub loads, donut chart renders, group cards show, FAB opens bottom sheet, input saves transaction. Test dark mode. Test mobile viewport.

- [ ] **Step 5: Commit**

```bash
git add src/app/finance/page.tsx
git commit -m "feat(finance): rebuild hub dashboard with 4-group cards and donut chart"
```

---

### Task 10: Obligation Group Page

**Files:**
- Create: `src/app/finance/obligation/page.tsx`

- [ ] **Step 1: Implement obligation page**

Layout:
1. Back button + "의무사항" header + percent guide
2. Group summary (budget/actual/remaining + progress bar)
3. Item list — each item as FinanceCard: name | budget | actual | mini progress bar. Tap → expand recent transactions for that item. "+" button for inline input.
4. Debt section header "갚아야 할 빚"
5. Debt cards (from `use-debts` hook): title + tags, total/paid/remaining, progress bar, "이 속도면 N개월 후 완납" prediction. Expand → repayment timeline.
6. Add debt / Record payment buttons (payment → auto creates transaction with `source: "debt"`)

- [ ] **Step 2: Implement debt repayment flow**

"상환 기록" button → BottomSheet: amount + memo + date → calls function that:
1. Inserts `finance_debt_payments` row
2. Inserts `finance_transactions` row with `source: "debt"`, `group_id: "obligation"`, `item_id: "debt"`
3. Checks if total_paid >= total_amount → marks debt as completed

- [ ] **Step 3: Test in browser**

Navigate to `/finance/obligation`. Verify items list, budget progress, debt cards, repayment flow, auto-transaction creation.

- [ ] **Step 4: Commit**

```bash
git add src/app/finance/obligation/
git commit -m "feat(finance): add obligation group page with debt management"
```

---

### Task 11: Necessity Group Page

**Files:**
- Create: `src/app/finance/necessity/page.tsx`

- [ ] **Step 1: Implement necessity page**

Layout:
1. Back + "필요사항" header
2. Group summary (same pattern as obligation)
3. Item cards — emphasis on progress bar: "식비 23만 / 30만 (77%)". 80%+ orange, 100%+ red.
4. Tap item → expand recent transactions list
5. "+" button on each item for inline input (pre-selects group=necessity, item=tapped item)

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/app/finance/necessity/
git commit -m "feat(finance): add necessity group page with budget tracking"
```

---

### Task 12: Sowing / Heaven Bank Page

**Files:**
- Create: `src/app/finance/sowing/page.tsx`

- [ ] **Step 1: Implement heaven bank passbook page**

Layout (bank app style):
1. Back + "하늘은행" header (royal purple theme)
2. Balance display: large ₩1,200,000 (bold, center). Sub-text: "총 심음 ₩X · 총 거둠 ₩Y"
3. Transaction list (newest first): date | description | sow(blue +) or reap(red -) | running balance. Monthly dividers.
4. Two action buttons: "심기" and "거두기"

- [ ] **Step 2: Implement sow/reap input**

"심기" → BottomSheet:
- Target: preset chips (교회 헌금, 선교 후원, 이웃 돕기, 감사 헌금) + "직접 입력"
- Amount + Date
- Save → dual-write: `heaven_bank` row + `finance_transactions` row (`source: "heaven_bank"`, `group_id: "sowing"`, `type: "expense"`)

"거두기" → BottomSheet:
- Description + Amount + Date
- Save → dual-write: `heaven_bank` row + `finance_transactions` row (`source: "heaven_bank"`, `group_id: "sowing"`, `type: "income"`)

- [ ] **Step 3: Extend use-heaven-bank hook**

Add `balance` (cumulative sow - cumulative reap), running balance calculation per row, dual-write logic.

- [ ] **Step 4: Test in browser, commit**

```bash
git add src/app/finance/sowing/ src/lib/hooks/use-heaven-bank.ts
git commit -m "feat(finance): add heaven bank passbook page with dual-write"
```

---

### Task 13: Want Group / Wishlist Page

**Files:**
- Create: `src/app/finance/want/page.tsx`
- Create: `src/lib/hooks/use-wishlist.ts`

- [ ] **Step 1: Implement use-wishlist hook**

API:
- `wishes` — sorted by priority
- `loading`
- `addWish(title, targetAmount, priority)` → insert
- `updateSaved(id, addAmount)` → increment saved_amount
- `reorderWishes(orderedIds)` → update priorities
- `completeWish(id)` → mark completed + create finance_transaction (source: "manual", group: "want")
- `deleteWish(id)`

- [ ] **Step 2: Implement want page**

Layout:
1. Back + "요망사항" header
2. Group summary (budget/actual)
3. Wishlist section — priority-ordered cards: rank badge (#1, #2...) + title + target amount + saved + progress bar. "저축하기" button per card. Drag to reorder.
4. "위시 추가" button → BottomSheet: title + target amount + priority
5. Want spending list — this month's want-group transactions

- [ ] **Step 3: Test in browser, commit**

```bash
git add src/app/finance/want/ src/lib/hooks/use-wishlist.ts
git commit -m "feat(finance): add want group page with wishlist"
```

---

### Task 14: Cashbook Page

**Files:**
- Rewrite: `src/app/finance/cashbook/page.tsx`

- [ ] **Step 1: Implement cashbook with 2 tabs**

Tab 1 — Daily (default):
- MonthPicker
- Date-grouped transaction list. Date header: "4월 17일 (목)" + daily income/expense subtotals
- Each transaction: `<TransactionRow>` with group dot, description, badge, amount
- Tap transaction → edit/delete options

Tab 2 — Monthly:
- Summary cards (income/expense/balance)
- 4-group spending table: Group | Budget | Actual | % with progress bars + total row
- Date × Group matrix table: rows=dates, cols=obligation|necessity|sowing|want|total. Cell tap → expand transactions. Mobile: horizontal scroll.

- [ ] **Step 2: Add FAB for adding transactions from cashbook**

Same BottomSheet as hub, but opened from cashbook context.

- [ ] **Step 3: Handle source-based display rules**

Transactions with `source: "installment"`, `"debt"`, `"heaven_bank"` show read-only with source badge. Only `"manual"` and `"recurring"` are editable.

- [ ] **Step 4: Test in browser, commit**

```bash
git add src/app/finance/cashbook/
git commit -m "feat(finance): rebuild cashbook with daily/monthly tabs and date-group matrix"
```

---

### Task 15: Budget Page

**Files:**
- Rewrite: `src/app/finance/budget/page.tsx`

- [ ] **Step 1: Implement budget setup/edit page**

Layout:
1. MonthPicker
2. Income display: "4월 수입 ₩2,550,000" (tap to edit)
3. Total budget / unallocated bar
4. 4 group budget cards — each: group name + guide range + current % + amount. Item list with inline AmountInput fields. Debounce auto-save (1000ms). Range warning (soft orange border + text when outside percentMin~percentMax). "항목 추가" button.
5. Bottom: donut chart preview + "저장됨" indicator

- [ ] **Step 2: Implement first-time setup flow**

If no budgets exist for this month:
- "지난달 예산을 가져올까요?" prompt → copy from previous month
- OR "수입 기반 배분" → enter income → auto-distribute by group percentages → adjust → save

- [ ] **Step 3: Test in browser, commit**

```bash
git add src/app/finance/budget/
git commit -m "feat(finance): rebuild budget page with income-based distribution"
```

---

### Task 16: Delete Old Files & Update Navigation

**Files:**
- Delete: old finance pages (debts/, heaven-bank/, obligations/)
- Delete: old components (debt-card, heaven-bank-form, etc.)
- Delete: `src/lib/faith-budget-config.ts`, `src/lib/finance-sections.ts`
- Delete: `src/lib/hooks/use-cashbook.ts`, `src/lib/hooks/use-faith-budget.ts`
- Modify: `src/components/ui/tab-nav.tsx` and `src/components/ui/sidebar.tsx` — finance link points to `/finance`
- Modify: `src/lib/demo-data.ts` — update demo data to match new schema

- [ ] **Step 1: Delete old files**

Remove all files listed in "Files to Delete" section above. Additionally:
- Delete: `src/lib/hooks/use-finance.ts` (replaced by use-finance-hub)
- Delete: `src/lib/hooks/use-obligations.ts` (obligations table dropped)
- Delete: `src/lib/hooks/use-wants.ts` (replaced by use-wishlist)
- Delete: `src/components/finance/necessity-detail-modal.tsx`
- Rewrite: `src/components/dashboard/finance-summary.tsx` to use new `use-finance-hub` hook
- Update: `src/app/page.tsx` if it imports from deleted modules

- [ ] **Step 2: Update navigation components**

Ensure tab-nav and sidebar "재정" link goes to `/finance` (hub).

- [ ] **Step 3: Update demo data**

Update `demo-data.ts` to use new field names (`group_id`/`item_id`/`source` instead of `account_id`/`category_id`/`is_auto`).

- [ ] **Step 4: Build check**

Run: `npm run build`
Fix any import errors from deleted files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(finance): remove old finance files, update nav and demo data"
```

---

## Phase 2: Extension

### Task 17: Installments Page Rewrite

**Files:**
- Rewrite: `src/app/finance/installments/page.tsx`
- Modify: `src/lib/hooks/use-installments.ts`

- [ ] **Step 1: Extend use-installments hook**

Add `payMonth(id)` function that:
1. Increments `paid_months`
2. Creates `finance_transactions` entry (`source: "installment"`, `group_id: "obligation"`, `item_id: "installment"`, description: "맥북 프로 14 할부 6/12회")
3. Auto-completes if paid_months >= total_months

- [ ] **Step 2: Rebuild installments page**

Layout: summary header (active count + monthly total) → installment cards (title, progress bar, details, "이번 달 납부하기" button) → completed section (collapsed).

Add installment: BottomSheet with title/total/monthly/months/start date. Warn if monthly × months ≠ total.

- [ ] **Step 3: Test in browser, commit**

```bash
git add src/app/finance/installments/ src/lib/hooks/use-installments.ts
git commit -m "feat(finance): rebuild installments with auto cashbook recording"
```

---

### Task 18: Recurring Transactions

**Files:**
- Create: `src/lib/hooks/use-recurring.ts`

- [ ] **Step 1: Implement use-recurring hook**

API:
- `recurring` — all registered recurring transactions
- `loading`
- `addRecurring(data)` — register new
- `updateRecurring(id, data)` — edit
- `deleteRecurring(id)` — remove
- `executeRecurring(month)` — check and auto-execute for current month:
  1. Get all active recurring
  2. For each, check if `finance_recurring_logs` has entry for this month
  3. If not, and today >= day_of_month (adjusted for short months): create transaction + log
  4. Return count of executed transactions

- [ ] **Step 2: Wire execution into hub**

In hub dashboard `useEffect`, call `executeRecurring(currentMonth)` on load. Show toast: "반복 거래 N건이 자동 기록되었습니다" if count > 0.

- [ ] **Step 3: Test automation logic, commit**

```bash
git add src/lib/hooks/use-recurring.ts src/app/finance/page.tsx
git commit -m "feat(finance): add recurring transaction automation"
```

---

## Phase 3: Polish

### Task 19: Monthly Report Page

**Files:**
- Create: `src/app/finance/report/page.tsx`

- [ ] **Step 1: Implement report page**

MonthPicker + scrollable cards:
1. Income/Expense summary card (+ vs previous month delta)
2. 4-group donut chart card
3. Budget achievement card (group progress bars)
4. Income analysis card (category bar chart)
5. Heaven bank summary card
6. Debt/Installment status card
7. Recurring execution status card (checklist: ✓/✗)

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/app/finance/report/
git commit -m "feat(finance): add monthly report page"
```

---

### Task 20: Settings Page

**Files:**
- Create: `src/app/finance/settings/page.tsx`

- [ ] **Step 1: Implement settings page**

4 sections:
1. Group customization — edit group name, percent range, items (add/remove/rename/reorder). Edit opens BottomSheet per group.
2. Income categories — list with add/edit/delete.
3. Recurring transactions — list showing description|amount|day|group. Add/edit/delete.
4. Data — demo mode toggle, data reset (double confirm).

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/app/finance/settings/
git commit -m "feat(finance): add settings page with group customization"
```

---

### Task 21: Onboarding Flow

**Files:**
- Create: `src/app/finance/onboarding/page.tsx`
- Create: `src/lib/hooks/use-onboarding.ts`

- [ ] **Step 1: Implement use-onboarding hook**

API:
- `state` — { isCompleted, isDemoMode }
- `loading`
- `startDemo()` — set demo mode
- `exitDemo()` — clear demo data, go to step 2
- `completeOnboarding()` — mark completed

- [ ] **Step 2: Implement onboarding page**

4 steps:
1. Welcome: "둘러보기" / "바로 시작하기"
2. Income input with AmountInput
3. Auto-distribute to 4 groups (adjustable)
4. "첫 거래 기록하기" / "나중에 할게요"

- [ ] **Step 3: Wire into hub**

Hub checks `finance_onboarding.is_completed`. If false → redirect to `/finance/onboarding`.

- [ ] **Step 4: Test full flow, commit**

```bash
git add src/app/finance/onboarding/ src/lib/hooks/use-onboarding.ts src/app/finance/page.tsx
git commit -m "feat(finance): add onboarding flow with demo mode"
```

---

### Task 22: localStorage Migration & Final Cleanup

**Files:**
- Modify: `src/app/finance/page.tsx` (hub)
- Delete: remaining references to old localStorage keys

- [ ] **Step 1: Implement localStorage detection and migration**

On hub load, check for `faith-budget-*` keys in localStorage:
- If found → show one-time prompt: "기존 예산 데이터를 클라우드에 저장할까요?"
- Yes → parse localStorage data → insert into `finance_budgets` → clear localStorage
- No / Dismiss → mark as dismissed (localStorage flag)

- [ ] **Step 2: Final build and test**

Run: `npm run build` — verify zero errors.
Run: `npx vitest run` — verify all tests pass.
Run: `npm run dev` — full manual walkthrough of all pages.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(finance): add localStorage migration and final cleanup"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] Hub dashboard shows summary + donut + 4 group cards + today's transactions
- [ ] Each group page: input, view transactions, budget tracking works
- [ ] Obligation: debt management with repayment timeline and payoff prediction
- [ ] Sowing: heaven bank passbook with dual-write to transactions
- [ ] Want: wishlist with priority and manual savings
- [ ] Cashbook: daily (date-grouped) + monthly (table + matrix) views
- [ ] Budget: income-based setup, monthly copy, inline editing with auto-save
- [ ] Installments: payment → auto cashbook record
- [ ] Recurring: auto-execute on hub load
- [ ] Report: monthly cards with all summaries
- [ ] Settings: group customization, income categories, recurring management
- [ ] Onboarding: demo mode + guided setup
- [ ] All auto-generated transactions show correct source badges in cashbook
- [ ] Dark mode works on all pages
- [ ] Mobile responsive on all pages
- [ ] Build passes with zero errors
