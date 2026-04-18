# 요망사항 지출 재분류 & 월간 이월 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 요망사항을 지출로 재분류하고 그룹별 월간 이월 기능을 추가한다.

**Architecture:** `finance_transactions.wishlist_id` 컬럼 추가로 위시별 누적을 트랜잭션 기반 파생값으로 전환. 이월은 `finance_budgets`/`finance_transactions`의 전월 합산을 on-the-fly 계산하는 전용 훅(`use-rollover.ts`) 도입. 공통 기여 함수(`finance-actions.ts`)로 금전출납부와 위시 페이지 이중 진입점 통합.

**Tech Stack:** Next.js 15, React, TypeScript, Supabase (Postgres), Vitest, Tailwind.

**Spec reference:** `docs/superpowers/specs/2026-04-18-want-expense-and-rollover-design.md`

---

## File Structure

### 신규 파일 (Create)
- `supabase/migrations/00018_want_wishlist_transaction_link.sql` — DB 스키마 변경
- `src/lib/finance-actions.ts` — 공통 기여 함수 (`addWishContribution`)
- `src/lib/rollover.ts` — 순수 이월 계산 유틸 (훅 아닌 pure function)
- `src/lib/hooks/use-rollover.ts` — 전월 데이터 fetch + `useMemo` wrap
- `src/lib/__tests__/rollover.test.ts` — 이월 유틸 단위 테스트
- `src/lib/__tests__/finance-actions.test.ts` — 공통 기여 함수 테스트

### 수정 파일 (Modify)
- `src/types/database.ts` — `FinanceTransaction`에 `wishlist_id` 추가
- `src/lib/finance-config.ts` — `ROLLOVER_START_MONTH`, `ROLLOVER_POLICY` 상수
- `src/lib/hooks/use-finance-transactions.ts` — SELECT/INSERT에 `wishlist_id` 포함
- `src/lib/hooks/use-wishlist.ts` — `updateSaved` 제거, `cumulative_saved` 파생, `addContribution` 위임
- `src/lib/hooks/use-finance-hub.ts` — `effectiveBudgets`, `rollovers` 노출
- `src/app/finance/cashbook/page.tsx` — 요망사항 그룹 선택 시 위시 picker
- `src/app/finance/want/page.tsx` — 각 위시 카드에 "+" 버튼
- `src/app/finance/budget/page.tsx` — 이월 배지 + 드릴다운
- `src/app/finance/report/page.tsx` — 요망사항/하늘은행 섹션 업데이트

---

## Task 1: DB 마이그레이션 — `wishlist_id` 컬럼 추가

**Files:**
- Create: `supabase/migrations/00018_want_wishlist_transaction_link.sql`

- [ ] **Step 1-1: 마이그레이션 SQL 작성**

```sql
-- 요망사항 트랜잭션에 위시 연결
BEGIN;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS wishlist_id UUID NULL REFERENCES finance_wishlist(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_wishlist_id
  ON finance_transactions(wishlist_id)
  WHERE wishlist_id IS NOT NULL;

COMMENT ON COLUMN finance_wishlist.saved_amount IS
  'Legacy baseline: 2026-05-01 이전까지 모은 저축 스냅샷. 이후 누적은 finance_transactions.wishlist_id 링크로 계산.';

COMMIT;
```

- [ ] **Step 1-2: 로컬 supabase에 적용**

Run: `npx supabase migration up` (또는 `npx supabase db reset`으로 전체 재적용)
Expected: 00018 마이그레이션 성공. `\d finance_transactions`에서 `wishlist_id` 컬럼 확인.

- [ ] **Step 1-3: 커밋**

```bash
git add supabase/migrations/00018_want_wishlist_transaction_link.sql
git commit -m "feat(finance): 00018 migration - wishlist_id column on finance_transactions"
```

---

## Task 2: `FinanceTransaction` 타입 확장

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 2-1: `wishlist_id` 필드 추가**

기존 `FinanceTransaction` 인터페이스에 `wishlist_id: string | null`을 수입/카테고리 관련 필드 인근에 추가.

- [ ] **Step 2-2: 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 타입 에러 없음.

- [ ] **Step 2-3: 커밋**

```bash
git add src/types/database.ts
git commit -m "feat(finance): add wishlist_id to FinanceTransaction type"
```

---

## Task 3: 이월 정책 상수 추가

**Files:**
- Modify: `src/lib/finance-config.ts`

- [ ] **Step 3-1: 상수 추가**

```typescript
export const ROLLOVER_START_MONTH = '2026-05';

export type RolloverPolicy = 'clamp_positive' | 'none';

export const ROLLOVER_POLICY: Record<string, RolloverPolicy> = {
  obligation: 'clamp_positive',
  necessity:  'clamp_positive',
  sowing:     'clamp_positive',
  want:       'none',
};
```

- [ ] **Step 3-2: 기존 테스트 실행**

Run: `pnpm vitest src/lib/__tests__/finance-config.test.ts`
Expected: 모든 기존 테스트 통과 (새 상수는 별도 테스트 파일에서 검증).

- [ ] **Step 3-3: 커밋**

```bash
git add src/lib/finance-config.ts
git commit -m "feat(finance): add rollover policy constants"
```

---

## Task 4: 이월 계산 유틸 (`rollover.ts`) — TDD

**Files:**
- Create: `src/lib/rollover.ts`
- Create: `src/lib/__tests__/rollover.test.ts`

- [ ] **Step 4-1: 실패하는 테스트 작성**

```typescript
// src/lib/__tests__/rollover.test.ts
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
```

- [ ] **Step 4-2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest src/lib/__tests__/rollover.test.ts`
Expected: FAIL — `Cannot find module '../rollover'`

- [ ] **Step 4-3: 최소 구현**

```typescript
// src/lib/rollover.ts
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
```

- [ ] **Step 4-4: 테스트 통과 확인**

Run: `pnpm vitest src/lib/__tests__/rollover.test.ts`
Expected: PASS (전체 7개 테스트).

- [ ] **Step 4-5: 커밋**

```bash
git add src/lib/rollover.ts src/lib/__tests__/rollover.test.ts
git commit -m "feat(finance): rollover util with clamp_positive/none policies"
```

---

## Task 5: 전월 데이터 fetch 훅 (`use-rollover.ts`)

**Files:**
- Create: `src/lib/hooks/use-rollover.ts`

- [ ] **Step 5-1: 훅 구현**

```typescript
// src/lib/hooks/use-rollover.ts
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { shiftMonth } from "@/lib/finance-utils";
import { getGroupRollover } from "@/lib/rollover";
import { ROLLOVER_POLICY } from "@/lib/finance-config";

interface PrevMonthAggregate {
  budgetByGroup: Record<string, number>;
  expenseByGroup: Record<string, number>;
}

export function useRollover(month: string) {
  const [agg, setAgg] = useState<PrevMonthAggregate>({
    budgetByGroup: {},
    expenseByGroup: {},
  });
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);
  const prev = shiftMonth(month, -1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const [budgetsRes, txRes] = await Promise.all([
        supabase
          .from("finance_budgets")
          .select("group_id, amount")
          .eq("user_id", FIXED_USER_ID)
          .eq("month", prev),
        supabase
          .from("finance_transactions")
          .select("group_id, amount, type")
          .eq("user_id", FIXED_USER_ID)
          .gte("date", `${prev}-01`)
          .lt("date", `${month}-01`),
      ]);

      if (cancelled) return;

      const budgetByGroup: Record<string, number> = {};
      for (const r of budgetsRes.data ?? []) {
        if (!r.group_id) continue;
        budgetByGroup[r.group_id] = (budgetByGroup[r.group_id] ?? 0) + r.amount;
      }

      const expenseByGroup: Record<string, number> = {};
      for (const r of txRes.data ?? []) {
        if (!r.group_id || r.type !== "expense") continue;
        expenseByGroup[r.group_id] = (expenseByGroup[r.group_id] ?? 0) + r.amount;
      }

      setAgg({ budgetByGroup, expenseByGroup });
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, month, prev]);

  const rollovers = useMemo(() => {
    const result: Record<string, number> = {};
    for (const groupId of Object.keys(ROLLOVER_POLICY)) {
      result[groupId] = getGroupRollover(groupId, month, {
        prevBudget: agg.budgetByGroup[groupId] ?? 0,
        prevExpense: agg.expenseByGroup[groupId] ?? 0,
      });
    }
    return result;
  }, [agg, month]);

  return { rollovers, loading };
}
```

- [ ] **Step 5-2: 빌드 체크**

Run: `pnpm tsc --noEmit`
Expected: 타입 에러 없음.

- [ ] **Step 5-3: 커밋**

```bash
git add src/lib/hooks/use-rollover.ts
git commit -m "feat(finance): use-rollover hook fetches prev month aggregates"
```

---

## Task 6: 공통 기여 함수 (`finance-actions.ts`) — TDD

**Files:**
- Create: `src/lib/finance-actions.ts`
- Create: `src/lib/__tests__/finance-actions.test.ts`

- [ ] **Step 6-1: 실패 테스트 작성 (모킹된 supabase client 사용)**

```typescript
// src/lib/__tests__/finance-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addWishContribution } from '../finance-actions';

// Supabase 클라이언트 모킹 - factory chain
const makeMockClient = (insertResult: { data?: unknown; error?: unknown } = { data: { id: 'tx-1' }, error: null }) => {
  const insertMock = vi.fn().mockResolvedValue(insertResult);
  const fromMock = vi.fn(() => ({
    insert: () => ({
      select: () => ({
        single: insertMock,
      }),
    }),
  }));
  return { fromMock, insertMock, from: fromMock };
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';

describe('addWishContribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts expense transaction linked to wishlist', async () => {
    const mock = makeMockClient();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    const result = await addWishContribution({
      wishId: 'wish-1',
      amount: 100000,
      date: '2026-05-10',
      description: '등록금 저축',
    });

    expect(result.ok).toBe(true);
    expect(result.transactionId).toBe('tx-1');
    expect(mock.fromMock).toHaveBeenCalledWith('finance_transactions');
  });

  it('returns error when insert fails', async () => {
    const mock = makeMockClient({ data: null, error: { message: 'insert failed' } });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    const result = await addWishContribution({
      wishId: 'wish-1',
      amount: 100000,
      date: '2026-05-10',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('insert failed');
  });

  it('uses default description when not provided', async () => {
    const mock = makeMockClient();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    await addWishContribution({
      wishId: 'wish-1',
      amount: 50000,
      date: '2026-05-10',
    });

    expect(mock.fromMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6-2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest src/lib/__tests__/finance-actions.test.ts`
Expected: FAIL — `Cannot find module '../finance-actions'`

- [ ] **Step 6-3: 최소 구현**

```typescript
// src/lib/finance-actions.ts
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";

export interface WishContributionInput {
  wishId: string;
  amount: number;
  date: string;
  description?: string;
}

export interface WishContributionResult {
  ok: boolean;
  transactionId?: string;
  error?: string;
}

export async function addWishContribution(
  input: WishContributionInput
): Promise<WishContributionResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: FIXED_USER_ID,
      date: input.date,
      type: "expense",
      group_id: "want",
      item_id: "want",
      amount: input.amount,
      description: input.description ?? "요망사항 기여",
      wishlist_id: input.wishId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, transactionId: (data as { id: string }).id };
}
```

- [ ] **Step 6-4: 테스트 통과 확인**

Run: `pnpm vitest src/lib/__tests__/finance-actions.test.ts`
Expected: PASS (3개 테스트).

- [ ] **Step 6-5: 커밋**

```bash
git add src/lib/finance-actions.ts src/lib/__tests__/finance-actions.test.ts
git commit -m "feat(finance): addWishContribution shared function for dual entry points"
```

---

## Task 7: `use-finance-transactions.ts` — `wishlist_id` 지원

**Files:**
- Modify: `src/lib/hooks/use-finance-transactions.ts`

- [ ] **Step 7-1: SELECT 프로젝션 확인**

파일에서 `.select()` 호출 위치 확인. `select("*")`인 경우 추가 작업 불필요. 특정 컬럼 나열이면 `wishlist_id` 추가.

- [ ] **Step 7-2: insert/update 시 `wishlist_id` 전달 허용**

`addTransaction` / `updateTransaction` 시그니처에 `wishlist_id?: string | null` 파라미터 추가하고 upsert payload에 포함.

- [ ] **Step 7-3: 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 타입 에러 없음.

- [ ] **Step 7-4: 기존 테스트 확인**

Run: `pnpm vitest src/lib/__tests__/ --run`
Expected: 모든 기존 테스트 통과.

- [ ] **Step 7-5: 커밋**

```bash
git add src/lib/hooks/use-finance-transactions.ts
git commit -m "feat(finance): use-finance-transactions wishlist_id insert/select"
```

---

## Task 8: `use-wishlist.ts` 리팩토링 — derived `cumulative_saved`

**Files:**
- Modify: `src/lib/hooks/use-wishlist.ts`

- [ ] **Step 8-1: `updateSaved` 제거, `addContribution` 신규 추가**

기존 `updateSaved` 함수를 제거하고, `addContribution(wishId, amount, date?)` 함수를 추가하되 내부적으로 `addWishContribution`(from `finance-actions.ts`)을 호출.

- [ ] **Step 8-2: `cumulative_saved` 파생 노출**

훅이 반환하는 각 `wish`에 `cumulative_saved` 필드를 추가. 계산: `saved_amount(baseline) + sum(linked transactions where date >= '2026-05-01' and type === 'expense')`

Fetch 시 `finance_transactions`에서 `wishlist_id IN (...)` 쿼리 1회로 전체 위시 누적 매핑 구성.

- [ ] **Step 8-3: 기존 consumer 업데이트**

`updateSaved` 호출처가 있다면 `addContribution`로 교체. grep으로 사용처 확인:
Run: `grep -rn "updateSaved" src/`
Expected: wishlist 내부 외 사용 없음 (있으면 교체).

- [ ] **Step 8-4: 타입 체크 + 테스트**

Run: `pnpm tsc --noEmit && pnpm vitest --run`
Expected: 통과.

- [ ] **Step 8-5: 커밋**

```bash
git add src/lib/hooks/use-wishlist.ts
git commit -m "refactor(finance): wishlist cumulative_saved derived from transactions"
```

---

## Task 9: `use-finance-hub.ts` — `effectiveBudgets` / `rollovers` 노출

**Files:**
- Modify: `src/lib/hooks/use-finance-hub.ts`

- [ ] **Step 9-1: `useRollover` 통합**

`useFinanceHub` 안에서 `useRollover(month)` 호출. `rollovers` (그룹별) 상태 획득.

- [ ] **Step 9-2: `effectiveBudgets` 계산**

```typescript
const effectiveBudgets = useMemo(() => {
  const result: Record<string, number> = {};
  for (const g of groups) {
    result[g.id] = (groupTotals[g.id] ?? 0) + (rollovers[g.id] ?? 0);
  }
  return result;
}, [groups, groupTotals, rollovers]);
```

- [ ] **Step 9-3: 반환 객체에 추가**

`return { ..., effectiveBudgets, rollovers }`

- [ ] **Step 9-4: 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 타입 에러 없음.

- [ ] **Step 9-5: 커밋**

```bash
git add src/lib/hooks/use-finance-hub.ts
git commit -m "feat(finance): expose effectiveBudgets and rollovers from hub"
```

---

## Task 10: 금전출납부 요망사항 picker UI

**Files:**
- Modify: `src/app/finance/cashbook/page.tsx`

- [ ] **Step 10-1: 위시 picker bottom sheet 추가**

그룹 "요망사항" 선택 직후, `item` 선택 대신 활성 위시 목록을 보여주는 picker bottom sheet 렌더. 각 항목에 진행도(`cumulative_saved / target`) 표시.

"+ 새 요망사항 만들기" 버튼 → 인라인 form (title + target_amount) → `addWish` 호출 후 즉시 선택 상태 갱신.

- [ ] **Step 10-2: 저장 시 `wishlist_id` 포함**

지출 트랜잭션 insert 호출 시 선택된 위시 ID를 `wishlist_id`로 전달. 혹은 `addWishContribution` 직접 호출.

- [ ] **Step 10-3: 로컬 수동 검증**

Run: `pnpm dev` 후 브라우저에서 `/finance/cashbook` 이동
- 요망사항 그룹 선택 → picker 표시
- 위시 선택 후 금액 입력 → 저장
- `/finance/want` 페이지에서 해당 위시 진행도 증가 확인
- 새 요망사항 생성 플로우 검증

- [ ] **Step 10-4: 커밋**

```bash
git add src/app/finance/cashbook/page.tsx
git commit -m "feat(finance): cashbook wish picker for want group"
```

---

## Task 11: 요망사항 페이지 "+" 버튼

**Files:**
- Modify: `src/app/finance/want/page.tsx`

- [ ] **Step 11-1: 각 위시 카드에 "+" 버튼 추가**

버튼 탭 시 bottom sheet 열어 금액 입력 → `addWishContribution` 호출 (금전출납부 경로와 완전 동일).

- [ ] **Step 11-2: 목표 초과 경고**

입력값 + `cumulative_saved > target_amount` 시 `ConfirmDialog`로 경고. 확인 시 진행.

- [ ] **Step 11-3: 로컬 수동 검증**

Run: `pnpm dev`
- `/finance/want` 페이지에서 위시 카드 "+" 탭 → bottom sheet 입력 → 저장
- 진행도 갱신 확인
- 목표 초과 시 경고 대화상자 확인

- [ ] **Step 11-4: 커밋**

```bash
git add src/app/finance/want/page.tsx
git commit -m "feat(finance): want page inline + button contribution"
```

---

## Task 12: 예산 페이지 이월 배지 + 드릴다운

**Files:**
- Modify: `src/app/finance/budget/page.tsx`

- [ ] **Step 12-1: `useFinanceHub`에서 `effectiveBudgets`, `rollovers` 수신**

기존 `useBudgetSettings` + `useBudget` 외에 추가.

- [ ] **Step 12-2: 그룹 카드 상단에 effective_budget 표시**

기존 `{Math.round(percent)}% ({formatCurrency(groupTotal)}원)` 부분을 `effectiveBudget` 기준으로 업데이트. 이월 있을 시 `+{formatCurrency(rollover)}` 작은 배지 우측 표시.

- [ ] **Step 12-3: 탭으로 분해 보기 토글**

카드 헤더 클릭 시 local state로 `expandedGroupId` 토글. 확장 시 3줄 요약:
```
기본 배분    {formatCurrency(baseBudget)}원
지난달 이월  +{formatCurrency(rollover)}원
이번 달 여유 {formatCurrency(effectiveBudget)}원
```

- [ ] **Step 12-4: 요망사항 카드 — 그룹 이월 없음 메시지**

`rollover === 0 && group.id === 'want'` 이면 "위시별 누적으로 추적 중" 대체 문구.

- [ ] **Step 12-5: 로컬 수동 검증**

Run: `pnpm dev`
- `/finance/budget` 이동
- 이전 달 지출 차액이 이월로 보이는지 (DB에 4월 데이터 있어야 5월에 가능; 없으면 0 표시 확인)
- 탭 시 분해 보기 펼침 확인

- [ ] **Step 12-6: 커밋**

```bash
git add src/app/finance/budget/page.tsx
git commit -m "feat(finance): budget page rollover badge + drilldown"
```

---

## Task 13: 리포트 페이지 업데이트

**Files:**
- Modify: `src/app/finance/report/page.tsx`

- [ ] **Step 13-1: 요망사항 섹션 — 위시별 cumulative_saved**

`useWishlist` 사용처에서 `wish.cumulative_saved`로 표시값 교체. 기존 `saved_amount` 직접 사용 부분 제거.

- [ ] **Step 13-2: 하늘은행 섹션 — 이월 정보 추가**

기존 카드에 "이월" 라인 추가 (`rollovers.sowing`).

- [ ] **Step 13-3: 로컬 수동 검증**

Run: `pnpm dev`
- `/finance/report`에서 위시별 누적 / 하늘은행 이월 표시 확인

- [ ] **Step 13-4: 커밋**

```bash
git add src/app/finance/report/page.tsx
git commit -m "feat(finance): report page cumulative_saved + sowing rollover"
```

---

## Task 14: 전체 회귀 테스트 + 수동 QA

**Files:** 없음 (검증만)

- [ ] **Step 14-1: 전체 단위 테스트**

Run: `pnpm vitest --run`
Expected: 모든 테스트 통과.

- [ ] **Step 14-2: 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 14-3: Lint**

Run: `pnpm lint`
Expected: 에러 없음 (warning은 허용).

- [ ] **Step 14-4: 빌드**

Run: `pnpm build`
Expected: 빌드 성공.

- [ ] **Step 14-5: 수동 QA 체크리스트 돌파**

다음 시나리오 하나씩 검증:

- [ ] 금전출납부 요망사항 선택 → picker 표시
- [ ] picker "+ 새 요망사항" → 인라인 생성 + 자동 선택
- [ ] 저장 후 위시 진행도 증가
- [ ] 위시 페이지 "+" 버튼 동일 결과
- [ ] 목표 초과 경고 동작
- [ ] 예산 페이지 그룹 카드 이월 배지
- [ ] 카드 탭 → 분해 보기 펼침
- [ ] 4월 진입 시 이월 0 (적용 전)
- [ ] 5월 진입 시 4월 차액 반영
- [ ] 4월 트랜잭션 수정 → 5월 이월 즉시 반영 (파생)
- [ ] 의무/필요 초과 지출 → 이월 0
- [ ] 하늘은행 통장 잔액 리포트 표시
- [ ] 기존 `saved_amount` 손상 없음
- [ ] 기존 보고서/홈 카드 정상

- [ ] **Step 14-6: 최종 커밋 (수동 QA 로그 / 빈 커밋 불필요)**

QA 통과 시 추가 커밋 없음. 미통과 이슈 나오면 해당 태스크로 되돌아가 수정.

---

## 완료 기준

- ✅ 14개 태스크 모두 체크박스 완료
- ✅ `pnpm vitest --run` 전부 통과
- ✅ `pnpm tsc --noEmit` 에러 0
- ✅ `pnpm build` 성공
- ✅ 수동 QA 체크리스트 모두 통과
