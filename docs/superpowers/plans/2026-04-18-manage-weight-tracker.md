# 관리 탭 — 체중 트래커 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plumbline PWA에 "관리" 탭을 추가하고 체중 트래커(입력/그래프/비교/기록)를 한 스크롤 페이지로 구현한다.

**Architecture:** Supabase 두 테이블(`weight_entries`, `weight_goal`) + 단일 훅(`use-weight`) + 순수 유틸(`weight-utils`) 위에 7개 컴포넌트. 재정 허브와 동일한 페이지 패턴(`PageHeader` / `FinanceCard` 스타일 / `BottomSheet` / `Fab`). 차트는 기존 의존성인 `recharts`를 그대로 사용.

**Tech Stack:** Next.js 15 (App Router, client components), Supabase JS v2, Tailwind v3, recharts, lucide-react, vitest + @testing-library/react

**참조 스펙:** `docs/superpowers/specs/2026-04-18-manage-weight-tracker-design.md`

---

## 선행 조건
- 브랜치: `feature/finance-redesign` (또는 새 `feature/manage-weight` 브랜치로 분기해도 됨)
- Supabase CLI가 연결돼 있고 로컬 DB에 마이그레이션 실행 가능
- `npm run dev` 정상 동작 확인
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 세팅됨

## 파일 구조 개요

**새로 만들 파일:**
```
supabase/migrations/00019_add_weight_tables.sql

src/types/database.ts          ← 기존 파일에 타입 추가 (Modify)

src/lib/weight-utils.ts
src/lib/__tests__/weight-utils.test.ts
src/lib/hooks/use-weight.ts

src/components/manage/weight-hero.tsx
src/components/manage/weight-chart.tsx
src/components/manage/weight-comparisons.tsx
src/components/manage/weight-log-list.tsx
src/components/manage/weight-input-sheet.tsx
src/components/manage/weight-goal-sheet.tsx
src/components/manage/__tests__/weight-hero.test.tsx
src/components/manage/__tests__/weight-comparisons.test.tsx

src/app/manage/page.tsx
```

**수정할 파일:**
```
src/components/ui/sidebar.tsx   ← nav items에 관리 추가
src/components/ui/tab-nav.tsx   ← tabs에 관리 추가
src/types/database.ts           ← WeightEntry, WeightGoal 타입 추가
```

---

## Task 1: DB 마이그레이션 + 타입 정의

**Files:**
- Create: `supabase/migrations/00019_add_weight_tables.sql`
- Modify: `src/types/database.ts` (파일 끝에 타입 추가)

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- 체중 관리 테이블 (weight_entries + weight_goal)
BEGIN;

CREATE TABLE IF NOT EXISTS weight_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  weighed_on  DATE NOT NULL,
  weight_kg   NUMERIC(5,1) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date
  ON weight_entries (user_id, weighed_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS weight_goal (
  user_id     TEXT PRIMARY KEY,
  target_kg   NUMERIC(5,1) NOT NULL CHECK (target_kg > 0 AND target_kg < 1000),
  deadline    DATE NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
```

- [ ] **Step 2: 로컬 DB에 적용 + 검증**

Run: `npx supabase migration up` (로컬 개발 DB에만 적용. 원격 prod에 밀지 않도록 `db push`는 사용 금지)
Expected: 새 테이블 2개 생성. 에러 없이 종료.

검증: Supabase Studio 또는 `psql`로 `\d weight_entries` 확인 — 5개 컬럼과 인덱스 존재

- [ ] **Step 3: 타입 정의 추가**

`src/types/database.ts` 파일 끝에:

```ts
// ── Weight tracker ──────────────────────────────────────────
export interface WeightEntry {
  id: string;
  user_id: string;
  weighed_on: string;    // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
  updated_at: string;
}

export interface WeightGoal {
  user_id: string;
  target_kg: number;
  deadline: string;      // YYYY-MM-DD
  updated_at: string;
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 0개

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00019_add_weight_tables.sql src/types/database.ts
git commit -m "feat(manage): add weight_entries and weight_goal tables"
```

---

## Task 2: 순수 유틸 함수 TDD — `weight-utils.ts`

**Files:**
- Create: `src/lib/weight-utils.ts`
- Test: `src/lib/__tests__/weight-utils.test.ts`

목적: 컴포넌트 밖으로 순수 계산 로직 전부 빼기 — 테스트 쉽고 재사용 쉬움.

- [ ] **Step 1: 실패하는 테스트 파일 작성**

```ts
// src/lib/__tests__/weight-utils.test.ts
import { describe, it, expect } from "vitest";
import {
  filterByRange,
  calcComparison,
  calcWeeklyPace,
  calcStats,
  type WeightEntryLite,
} from "@/lib/weight-utils";

const entries: WeightEntryLite[] = [
  { weighed_on: "2026-04-18", weight_kg: 67.3, created_at: "2026-04-18T08:00:00Z" },
  { weighed_on: "2026-04-11", weight_kg: 67.8, created_at: "2026-04-11T08:00:00Z" },
  { weighed_on: "2026-03-18", weight_kg: 69.1, created_at: "2026-03-18T08:00:00Z" },
  { weighed_on: "2026-01-18", weight_kg: 70.5, created_at: "2026-01-18T08:00:00Z" },
  { weighed_on: "2025-04-19", weight_kg: 73.5, created_at: "2025-04-19T08:00:00Z" },
];
const today = new Date("2026-04-18T12:00:00Z");

describe("filterByRange", () => {
  it("returns all when range=all", () => {
    expect(filterByRange(entries, "all", today)).toHaveLength(5);
  });
  it("returns last 1 month entries", () => {
    const out = filterByRange(entries, "1M", today);
    expect(out.map((e) => e.weighed_on)).toEqual(["2026-04-18", "2026-04-11", "2026-03-18"]);
  });
  it("returns empty on empty entries", () => {
    expect(filterByRange([], "3M", today)).toEqual([]);
  });
});

describe("calcComparison", () => {
  it("finds closest entry within tolerance for 7 days ago", () => {
    const r = calcComparison(entries, 7, 7, today);
    expect(r.refDate).toBe("2026-04-11");
    expect(r.diffKg).toBeCloseTo(-0.5, 1);
  });
  it("returns null when outside tolerance", () => {
    const sparse = [entries[0]]; // only today
    expect(calcComparison(sparse, 30, 14, today).diffKg).toBeNull();
  });
  it("returns null when entries empty", () => {
    expect(calcComparison([], 7, 7, today).diffKg).toBeNull();
  });
});

describe("calcWeeklyPace", () => {
  it("returns needed kg/week to reach goal", () => {
    // 현재 67.3, 목표 62.0, 데드라인 35일 뒤 = 5주
    const r = calcWeeklyPace(67.3, 62.0, "2026-05-23", today);
    expect(r).toBeCloseTo(1.06, 2); // (67.3-62)/5
  });
  it("returns null when deadline passed", () => {
    expect(calcWeeklyPace(67.3, 62.0, "2026-04-01", today)).toBeNull();
  });
  it("returns null when already achieved", () => {
    expect(calcWeeklyPace(61.0, 62.0, "2026-05-23", today)).toBeNull();
  });
});

describe("calcStats", () => {
  it("aggregates current/start/lost/remain", () => {
    const s = calcStats(entries, { target_kg: 62.0, deadline: "2026-05-23" } as any, today);
    expect(s.currentKg).toBe(67.3);
    expect(s.startKg).toBe(73.5);
    expect(s.lostKg).toBeCloseTo(6.2, 1);
    expect(s.remainKg).toBeCloseTo(5.3, 1);
  });
  it("returns null-ish when no entries", () => {
    const s = calcStats([], null, today);
    expect(s.currentKg).toBeNull();
    expect(s.startKg).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm run test -- weight-utils`
Expected: FAIL — "Cannot find module '@/lib/weight-utils'"

- [ ] **Step 3: `weight-utils.ts` 구현**

```ts
// src/lib/weight-utils.ts

export type RangeKey = "all" | "1M" | "3M" | "6M" | "1Y";

export interface WeightEntryLite {
  weighed_on: string;     // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
}

export interface GoalLite {
  target_kg: number;
  deadline: string;       // YYYY-MM-DD
}

export interface Comparison {
  diffKg: number | null;
  refDate: string | null;
  reason?: "insufficient";
}

export interface Stats {
  currentKg: number | null;
  startKg: number | null;
  lostKg: number | null;
  remainKg: number | null;
  daysLeft: number | null;
  weeklyPace: number | null;
  comparisons: {
    w1: Comparison;
    m1: Comparison;
    m3: Comparison;
    y1: Comparison;
  };
}

// ── Helpers ──────────────────────────────────────────────────
function parseDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// ── filterByRange ────────────────────────────────────────────
const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

export function filterByRange(
  entries: WeightEntryLite[],
  range: RangeKey,
  now: Date = new Date()
): WeightEntryLite[] {
  if (range === "all") return entries.slice();
  const months = RANGE_MONTHS[range];
  const threshold = new Date(now);
  threshold.setUTCMonth(threshold.getUTCMonth() - months);
  return entries.filter((e) => parseDate(e.weighed_on).getTime() >= threshold.getTime());
}

// ── calcComparison ───────────────────────────────────────────
export function calcComparison(
  entries: WeightEntryLite[],
  daysAgo: number,
  toleranceDays: number,
  now: Date = new Date()
): Comparison {
  if (entries.length === 0) {
    return { diffKg: null, refDate: null, reason: "insufficient" };
  }
  // 현재 체중: entries[0] (가장 최근)
  const latest = entries[0];
  const targetMs = now.getTime() - daysAgo * 86_400_000;

  let best: WeightEntryLite | null = null;
  let bestDist = Infinity;
  for (const e of entries) {
    const d = Math.abs(parseDate(e.weighed_on).getTime() - targetMs);
    if (d <= toleranceDays * 86_400_000 && d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  if (!best || best === latest) {
    return { diffKg: null, refDate: null, reason: "insufficient" };
  }
  return {
    diffKg: Math.round((latest.weight_kg - best.weight_kg) * 10) / 10,
    refDate: best.weighed_on,
  };
}

// ── calcWeeklyPace ───────────────────────────────────────────
export function calcWeeklyPace(
  currentKg: number,
  targetKg: number,
  deadline: string,
  now: Date = new Date()
): number | null {
  const daysLeft = dayDiff(parseDate(deadline), now);
  if (daysLeft <= 0) return null;
  const remain = currentKg - targetKg;
  if (remain <= 0) return null;
  const weeks = daysLeft / 7;
  return Math.round((remain / weeks) * 100) / 100;
}

// ── calcStats ────────────────────────────────────────────────
export function calcStats(
  entries: WeightEntryLite[],
  goal: GoalLite | null,
  now: Date = new Date()
): Stats {
  const sorted = [...entries].sort((a, b) => {
    if (a.weighed_on !== b.weighed_on) return b.weighed_on.localeCompare(a.weighed_on);
    return b.created_at.localeCompare(a.created_at);
  });
  const currentKg = sorted[0]?.weight_kg ?? null;
  const startKg = sorted[sorted.length - 1]?.weight_kg ?? null;

  const lostKg =
    currentKg != null && startKg != null
      ? Math.round((startKg - currentKg) * 10) / 10
      : null;

  const remainKg =
    currentKg != null && goal
      ? Math.round((currentKg - goal.target_kg) * 10) / 10
      : null;

  const daysLeft = goal ? dayDiff(parseDate(goal.deadline), now) : null;
  const weeklyPace =
    currentKg != null && goal ? calcWeeklyPace(currentKg, goal.target_kg, goal.deadline, now) : null;

  const cmp = (days: number, tol: number) => calcComparison(sorted, days, tol, now);

  return {
    currentKg,
    startKg,
    lostKg,
    remainKg,
    daysLeft,
    weeklyPace,
    comparisons: {
      w1: cmp(7, 7),
      m1: cmp(30, 14),
      m3: cmp(90, 30),
      y1: cmp(365, 30),
    },
  };
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm run test -- weight-utils`
Expected: PASS — 모든 describe block green

- [ ] **Step 5: Commit**

```bash
git add src/lib/weight-utils.ts src/lib/__tests__/weight-utils.test.ts
git commit -m "feat(manage): weight-utils with TDD (range/comparison/pace/stats)"
```

---

## Task 3: Supabase 훅 — `use-weight.ts`

**Files:**
- Create: `src/lib/hooks/use-weight.ts`

- [ ] **Step 1: 훅 구현**

```ts
// src/lib/hooks/use-weight.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { calcStats, type Stats } from "@/lib/weight-utils";
import type { WeightEntry, WeightGoal } from "@/types/database";

export interface UseWeight {
  entries: WeightEntry[];
  goal: WeightGoal | null;
  stats: Stats;
  loading: boolean;
  error: string | null;
  addEntry: (weight_kg: number, weighed_on: string) => Promise<{ ok: boolean; error?: string }>;
  updateEntry: (id: string, weight_kg: number, weighed_on: string) => Promise<{ ok: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ ok: boolean; error?: string }>;
  setGoal: (target_kg: number, deadline: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => void;
}

export function useWeight(): UseWeight {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoalState] = useState<WeightGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const [entriesRes, goalRes] = await Promise.all([
        supabase
          .from("weight_entries")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .order("weighed_on", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("weight_goal")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (entriesRes.error) setError(entriesRes.error.message);
      else setEntries(entriesRes.data as WeightEntry[]);

      if (goalRes.error) setError(goalRes.error.message);
      else setGoalState((goalRes.data as WeightGoal | null) ?? null);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const addEntry = useCallback(async (weight_kg: number, weighed_on: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("weight_entries")
      .insert({ user_id: FIXED_USER_ID, weight_kg, weighed_on });
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh]);

  const updateEntry = useCallback(async (id: string, weight_kg: number, weighed_on: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("weight_entries")
      .update({ weight_kg, weighed_on, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh]);

  const deleteEntry = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("weight_entries").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh]);

  const setGoal = useCallback(async (target_kg: number, deadline: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("weight_goal")
      .upsert({ user_id: FIXED_USER_ID, target_kg, deadline, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  }, [refresh]);

  const stats = calcStats(entries, goal);

  return { entries, goal, stats, loading, error, addEntry, updateEntry, deleteEntry, setGoal, refresh };
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 0개

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-weight.ts
git commit -m "feat(manage): use-weight hook with CRUD + derived stats"
```

---

## Task 4: 네비게이션에 "관리" 탭 추가

**Files:**
- Modify: `src/components/ui/sidebar.tsx`
- Modify: `src/components/ui/tab-nav.tsx`

- [ ] **Step 1: `sidebar.tsx` 수정**

Line 5 근처 import에 `Scale` 추가:
```ts
import { Home, BookOpen, Calendar, Wallet, Settings, Scale } from "lucide-react";
```

Line 7-12의 `navItems`에 항목 추가:
```ts
const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/basics", label: "베이직", icon: BookOpen },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/finance", label: "재정", icon: Wallet },
  { href: "/manage", label: "관리", icon: Scale },
];
```

- [ ] **Step 2: `tab-nav.tsx` 수정**

Line 5의 import에 `Scale` 추가:
```ts
import { Home, BookOpen, Calendar, Wallet, Scale } from "lucide-react";
```

Line 7-12의 `tabs`에 항목 추가:
```ts
const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/basics", label: "베이직", icon: BookOpen },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/finance", label: "재정", icon: Wallet },
  { href: "/manage", label: "관리", icon: Scale },
];
```

- [ ] **Step 3: 브라우저 확인**

Run: `npm run dev` (이미 돌고 있다면 skip)
- 모바일 뷰(DevTools 400px): 하단 탭에 "관리" 저울 아이콘이 보임, 5개 탭이 `max-w-lg` 내에 균등 배분
- 데스크톱 뷰: 사이드바에 "관리" 항목이 추가됨
- 탭 클릭 시 `/manage` 로 이동하는데 지금은 404 (다음 태스크에서 페이지 만듦)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sidebar.tsx src/components/ui/tab-nav.tsx
git commit -m "feat(manage): add 관리 tab to sidebar and tab-nav"
```

---

## Task 5: `WeightInputSheet` 컴포넌트

**Files:**
- Create: `src/components/manage/weight-input-sheet.tsx`

이 시트는 입력과 수정에 모두 쓰이므로 먼저 만든다.

- [ ] **Step 1: 컴포넌트 구현**

```tsx
// src/components/manage/weight-input-sheet.tsx
"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/finance/bottom-sheet";

interface WeightInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: { weight_kg: number; weighed_on: string };
  onSubmit: (weight_kg: number, weighed_on: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saving?: boolean;
}

const TODAY = () => new Date().toLocaleDateString("sv-SE");

export function WeightInputSheet({
  isOpen,
  onClose,
  mode,
  initial,
  onSubmit,
  onDelete,
  saving,
}: WeightInputSheetProps) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(TODAY());
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDel(false);
      return;
    }
    if (initial) {
      setWeight(initial.weight_kg.toFixed(1));
      setDate(initial.weighed_on);
    } else {
      setWeight("");
      setDate(TODAY());
    }
  }, [isOpen, initial]);

  const parsed = parseFloat(weight);
  const valid =
    Number.isFinite(parsed) && parsed >= 20 && parsed <= 300 && date <= TODAY();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={mode === "edit" ? "기록 수정" : "체중 입력"}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">체중 (kg)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="67.3"
            autoFocus
            className="w-full min-h-[56px] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
          <input
            type="date"
            value={date}
            max={TODAY()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => valid && onSubmit(parsed, date)}
            disabled={!valid || saving}
            className="flex-1 min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirmDel) {
                  onDelete();
                } else {
                  setConfirmDel(true);
                }
              }}
              disabled={saving}
              className={`min-h-[48px] px-4 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                confirmDel
                  ? "bg-red-500 text-white"
                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              }`}
            >
              {confirmDel ? "정말 삭제" : "삭제"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 0개

- [ ] **Step 3: Commit**

```bash
git add src/components/manage/weight-input-sheet.tsx
git commit -m "feat(manage): WeightInputSheet (create/edit modes, inline delete confirm)"
```

---

## Task 6: 페이지 스켈레톤 + `WeightHero` + FAB

첫 통합 마일스톤: 페이지가 뜨고, 입력 시트로 체중 기록을 추가하면 히어로에 "현재 체중"이 바뀌는 흐름.

**Files:**
- Create: `src/app/manage/page.tsx`
- Create: `src/components/manage/weight-hero.tsx`

- [ ] **Step 1: `WeightHero` 컴포넌트**

```tsx
// src/components/manage/weight-hero.tsx
"use client";

import type { Stats } from "@/lib/weight-utils";
import type { WeightGoal } from "@/types/database";

interface Props {
  stats: Stats;
  goal: WeightGoal | null;
  onOpenGoal?: () => void;
}

function formatKg(n: number | null): string {
  return n == null ? "—" : `${n.toFixed(1)}`;
}

export function WeightHero({ stats, goal, onOpenGoal }: Props) {
  const { currentKg, startKg, remainKg, daysLeft, weeklyPace } = stats;
  const hasCurrent = currentKg != null;

  // 데드라인 배지 상태
  const deadlinePassed = daysLeft != null && daysLeft <= 0 && remainKg != null && remainKg > 0;
  const achieved = remainKg != null && remainKg <= 0;

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        현재 체중
      </p>
      <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {hasCurrent ? `${formatKg(currentKg)} kg` : "—"}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <MetricCell label="목표" value={goal ? `${formatKg(goal.target_kg)} kg` : null} onClick={!goal ? onOpenGoal : undefined} />
        <MetricCell
          label="차이"
          value={remainKg == null ? "—" : `${remainKg > 0 ? "-" : "+"}${Math.abs(remainKg).toFixed(1)} kg`}
          colorClass={
            remainKg == null
              ? ""
              : remainKg > 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-500 dark:text-red-400"
          }
        />
        <MetricCell label="시작" value={startKg != null ? `${formatKg(startKg)} kg` : "—"} />
      </div>

      {goal && hasCurrent && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {achieved ? (
            <span className="text-emerald-600 dark:text-emerald-400">🎉 목표 달성! {Math.abs(remainKg!).toFixed(1)}kg 초과 감량 · 유지중</span>
          ) : deadlinePassed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">🕐 데드라인 지남 · 목표 재설정 필요</span>
          ) : (
            <>🎯 {goal.deadline}까지 {daysLeft}일 남음 · 주 {weeklyPace?.toFixed(2)}kg 필요</>
          )}
        </p>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  colorClass = "",
  onClick,
}: {
  label: string;
  value: string | null;
  colorClass?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${colorClass || "text-gray-900 dark:text-gray-100"}`}>
        {value ?? "목표 설정"}
      </p>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="text-left rounded-xl bg-gray-50 dark:bg-[#262c38] px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors">
      {content}
    </button>
  ) : (
    <div className="rounded-xl bg-gray-50 dark:bg-[#262c38] px-3 py-2">{content}</div>
  );
}
```

- [ ] **Step 2: 페이지 스켈레톤 작성**

```tsx
// src/app/manage/page.tsx
"use client";

import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { Fab } from "@/components/finance/fab";
import { useWeight } from "@/lib/hooks/use-weight";
import { WeightHero } from "@/components/manage/weight-hero";
import { WeightInputSheet } from "@/components/manage/weight-input-sheet";

export default function ManagePage() {
  const { entries, goal, stats, loading, addEntry } = useWeight();
  const { toast } = useToast();
  const [inputOpen, setInputOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(weight_kg: number, weighed_on: string) {
    setSaving(true);
    const res = await addEntry(weight_kg, weighed_on);
    setSaving(false);
    if (res.ok) {
      toast(`${weight_kg.toFixed(1)}kg 기록됨`, "success");
      setInputOpen(false);
    } else {
      toast(res.error ?? "저장 실패", "error");
    }
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader
        title="관리"
        contentMaxWidth="max-w-3xl"
        rightAction={
          <button
            type="button"
            aria-label="목표 설정"
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors"
          >
            <SettingsIcon size={20} />
          </button>
        }
      />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <div className="h-40 rounded-2xl bg-gray-100 dark:bg-[#1a2030] animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="rounded-2xl p-8 text-center bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">첫 체중을 기록해보세요</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">우측 하단 + 버튼으로 시작</p>
          </div>
        ) : (
          <WeightHero stats={stats} goal={goal} />
        )}
      </div>

      <Fab onClick={() => setInputOpen(true)} label="체중 기록" />

      <WeightInputSheet
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        mode="create"
        onSubmit={handleAdd}
        saving={saving}
      />
    </div>
  );
}
```

**참고:** `PageHeader`는 이미 `rightAction?: ReactNode` prop을 지원함(`src/components/ui/page-header.tsx:8`). PageHeader 수정 불필요.

- [ ] **Step 3: 브라우저에서 통합 확인**

Run: `npm run dev`
1. `/manage` 열기 → 빈 상태 카드 + FAB 표시
2. FAB 탭 → 바텀시트 열림 → `67.3` + 오늘 날짜 입력 → 저장
3. 토스트 `"67.3kg 기록됨"` 뜨고, 빈 상태가 히어로 카드로 바뀜 (현재 67.3kg 표시)
4. 한번 더 입력 `66.8` 하면 히어로의 현재가 갱신되고 시작값은 67.3 유지

- [ ] **Step 4: Commit**

```bash
git add src/app/manage/page.tsx src/components/manage/weight-hero.tsx
# PageHeader 수정했다면 그것도 추가
git commit -m "feat(manage): page skeleton with WeightHero and entry FAB"
```

---

## Task 7: `WeightLogList` + 수정/삭제 연결

**Files:**
- Create: `src/components/manage/weight-log-list.tsx`
- Modify: `src/app/manage/page.tsx` (리스트 렌더 + 수정 시트 상태 추가)

- [ ] **Step 1: `WeightLogList` 구현**

```tsx
// src/components/manage/weight-log-list.tsx
"use client";

import type { WeightEntry } from "@/types/database";

interface Props {
  entries: WeightEntry[];
  onTap: (entry: WeightEntry) => void;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, "0")} (${DOW[d.getDay()]})`;
}

export function WeightLogList({ entries, onTap }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        📅 기록
      </p>
      <ul className="rounded-2xl overflow-hidden bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] divide-y divide-gray-100 dark:divide-[#2d3748]">
        {entries.map((e, i) => {
          const next = entries[i + 1];
          const diff = next ? Math.round((e.weight_kg - next.weight_kg) * 10) / 10 : null;
          const diffColor =
            diff == null
              ? "text-gray-400"
              : diff < 0
              ? "text-blue-600 dark:text-blue-400"
              : diff > 0
              ? "text-red-500 dark:text-red-400"
              : "text-gray-400";
          const diffLabel =
            diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}${diff < 0 ? "↓" : diff > 0 ? "↑" : ""}`;
          return (
            <li key={e.id}>
              <button
                onClick={() => onTap(e)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                  {formatDate(e.weighed_on)}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {e.weight_kg.toFixed(1)} kg
                </span>
                <span className={`text-xs font-medium tabular-nums ${diffColor} w-16 text-right`}>
                  {diffLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: 페이지에 리스트 + 수정 시트 연결**

`src/app/manage/page.tsx`에서:
- `useState<WeightEntry | null>(null)` for `editing`
- 리스트 row 탭 시 `setEditing(e)` + `setInputOpen(true)`
- `WeightInputSheet`에 `mode`, `initial`, `onDelete` 전달
- `handleUpdate`, `handleDelete` 함수 추가

```tsx
// 추가할 부분 (기존 page.tsx에 병합)
import { WeightLogList } from "@/components/manage/weight-log-list";
import type { WeightEntry } from "@/types/database";

// ⚠️ 중요: `useWeight()`는 페이지 전체에서 정확히 한 번만 호출해야 함.
// 훅이 두 번 호출되면 독립된 state 2벌이 생겨서 한쪽 refresh가 반영 안 됨.
// Task 6에서 이미 `const { entries, goal, stats, loading, addEntry } = useWeight();` 이 있다면,
// 여기서는 그 한 줄을 다음처럼 확장하는 것으로 처리:
//
//   const { entries, goal, stats, loading, addEntry, updateEntry, deleteEntry } = useWeight();
//
// 새로운 `useWeight()` 호출을 추가하지 말 것.

const [editing, setEditing] = useState<WeightEntry | null>(null);

async function handleSubmit(weight_kg: number, weighed_on: string) {
  setSaving(true);
  const res = editing
    ? await updateEntry(editing.id, weight_kg, weighed_on)
    : await addEntry(weight_kg, weighed_on);
  setSaving(false);
  if (res.ok) {
    toast(editing ? "기록이 수정됨" : `${weight_kg.toFixed(1)}kg 기록됨`, "success");
    setInputOpen(false);
    setEditing(null);
  } else {
    toast(res.error ?? "저장 실패", "error");
  }
}

async function handleDelete() {
  if (!editing) return;
  const res = await deleteEntry(editing.id);
  if (res.ok) {
    toast("기록이 삭제됨", "success");
    setInputOpen(false);
    setEditing(null);
  } else {
    toast(res.error ?? "삭제 실패", "error");
  }
}

// JSX:
<WeightLogList entries={entries} onTap={(e) => { setEditing(e); setInputOpen(true); }} />

<WeightInputSheet
  isOpen={inputOpen}
  onClose={() => { setInputOpen(false); setEditing(null); }}
  mode={editing ? "edit" : "create"}
  initial={editing ? { weight_kg: editing.weight_kg, weighed_on: editing.weighed_on } : undefined}
  onSubmit={handleSubmit}
  onDelete={editing ? handleDelete : undefined}
  saving={saving}
/>
```

- [ ] **Step 3: 브라우저 통합 확인**
1. `/manage`에서 기록 두세 개 입력 → 리스트에 역순으로 나열
2. 각 row 아래 "직전 대비" 파랑(↓)/빨강(↑) 색 확인
3. row 탭 → 바텀시트에 기존 값 프리필 + "기록 수정" 타이틀 + "삭제" 버튼
4. 수정 → 리스트 업데이트
5. 삭제 → "정말 삭제" 1차 → 2번째 탭에서 실제 삭제

- [ ] **Step 4: Commit**

```bash
git add src/components/manage/weight-log-list.tsx src/app/manage/page.tsx
git commit -m "feat(manage): log list with vs-prev diff + edit/delete flow"
```

---

## Task 8: `WeightChart` — 레인지 탭 + 목표 점선

**Files:**
- Create: `src/components/manage/weight-chart.tsx`
- Modify: `src/app/manage/page.tsx`

- [ ] **Step 1: 컴포넌트 구현**

```tsx
// src/components/manage/weight-chart.tsx
"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { filterByRange, type RangeKey } from "@/lib/weight-utils";
import type { WeightEntry, WeightGoal } from "@/types/database";

const RANGES: RangeKey[] = ["all", "1M", "3M", "6M", "1Y"];
const RANGE_LABEL: Record<RangeKey, string> = {
  all: "전체",
  "1M": "1개월",
  "3M": "3개월",
  "6M": "6개월",
  "1Y": "1년",
};

interface Props {
  entries: WeightEntry[];
  goal: WeightGoal | null;
}

export function WeightChart({ entries, goal }: Props) {
  const [range, setRange] = useState<RangeKey>("3M");

  const data = useMemo(() => {
    // 시간 오름차순 (차트 X축용)
    const filtered = filterByRange(entries, range);
    return [...filtered]
      .sort((a, b) =>
        a.weighed_on !== b.weighed_on
          ? a.weighed_on.localeCompare(b.weighed_on)
          : a.created_at.localeCompare(b.created_at)
      )
      .map((e) => ({
        date: e.weighed_on,
        weight: e.weight_kg,
      }));
  }, [entries, range]);

  const yDomain = useMemo<[number, number] | ["auto", "auto"]>(() => {
    const kgs = data.map((d) => d.weight);
    if (goal) kgs.push(goal.target_kg);
    if (kgs.length === 0) return ["auto", "auto"];
    return [Math.floor(Math.min(...kgs) - 2), Math.ceil(Math.max(...kgs) + 2)];
  }, [data, goal]);

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#262c38] mb-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 min-h-[32px] rounded-lg text-xs font-medium transition-all ${
              range === r
                ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <div className="h-48 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
          기록이 더 쌓이면 그래프가 그려져요
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00");
                  return `${d.getMonth() + 1}월`;
                }}
                tick={{ fontSize: 11 }}
                minTickGap={20}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)} kg`, "체중"]}
                labelFormatter={(l: string) => l}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  border: "1px solid rgba(125,125,125,0.2)",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              {goal && (
                <ReferenceLine
                  y={goal.target_kg}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: `목표 ${goal.target_kg}kg`, fontSize: 10, fill: "#94a3b8", position: "right" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 페이지에 차트 추가**

`src/app/manage/page.tsx`에서 히어로 바로 아래에:
```tsx
import { WeightChart } from "@/components/manage/weight-chart";
// ...
<WeightHero stats={stats} goal={goal} />
<WeightChart entries={entries} goal={goal} />
```

- [ ] **Step 3: 브라우저 확인**
1. 기록 2개 이상 있을 때 차트가 그려지는지
2. 레인지 탭 전환 시 데이터 필터링
3. 목표가 설정되면(다음 태스크에서) 점선 오버레이

- [ ] **Step 4: Commit**

```bash
git add src/components/manage/weight-chart.tsx src/app/manage/page.tsx
git commit -m "feat(manage): line chart with range tabs + goal reference line"
```

---

## Task 9: `WeightComparisons` — 2×2 비교 그리드

**Files:**
- Create: `src/components/manage/weight-comparisons.tsx`
- Modify: `src/app/manage/page.tsx`

- [ ] **Step 1: 컴포넌트 구현**

```tsx
// src/components/manage/weight-comparisons.tsx
"use client";

import type { Comparison } from "@/lib/weight-utils";

interface Props {
  comparisons: {
    w1: Comparison;
    m1: Comparison;
    m3: Comparison;
    y1: Comparison;
  };
}

const CELLS: Array<{ key: keyof Props["comparisons"]; label: string }> = [
  { key: "w1", label: "1주 전 대비" },
  { key: "m1", label: "1달 전 대비" },
  { key: "m3", label: "3달 전 대비" },
  { key: "y1", label: "1년 전 대비" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, "0")} 기준`;
}

export function WeightComparisons({ comparisons }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CELLS.map(({ key, label }) => {
        const c = comparisons[key];
        const isEmpty = c.diffKg == null;
        const color = isEmpty
          ? "text-gray-400"
          : c.diffKg! < 0
          ? "text-blue-600 dark:text-blue-400"
          : c.diffKg! > 0
          ? "text-red-500 dark:text-red-400"
          : "text-gray-500";
        return (
          <div key={key} className="rounded-2xl p-4 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold tabular-nums ${color}`}>
              {isEmpty
                ? "—"
                : `${c.diffKg! > 0 ? "+" : ""}${c.diffKg!.toFixed(1)} kg`}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {isEmpty ? "기록 부족" : formatDate(c.refDate)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 페이지에 삽입**

```tsx
import { WeightComparisons } from "@/components/manage/weight-comparisons";
// ...
<WeightChart entries={entries} goal={goal} />
<WeightComparisons comparisons={stats.comparisons} />
<WeightLogList ... />
```

- [ ] **Step 3: 브라우저 확인**
- 기록 1개뿐일 땐 모두 `—` / `기록 부족`
- 기록을 옛날 날짜로 여러 개 추가해서 1주/1달 칸이 채워지는지 확인 (예: 7일 전 날짜로 입력)

- [ ] **Step 4: Commit**

```bash
git add src/components/manage/weight-comparisons.tsx src/app/manage/page.tsx
git commit -m "feat(manage): 2x2 comparison grid (1w/1m/3m/1y)"
```

---

## Task 10: `WeightGoalSheet` + 헤더 톱니 연결

**Files:**
- Create: `src/components/manage/weight-goal-sheet.tsx`
- Modify: `src/app/manage/page.tsx`

- [ ] **Step 1: 컴포넌트 구현**

```tsx
// src/components/manage/weight-goal-sheet.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { calcWeeklyPace } from "@/lib/weight-utils";
import type { WeightGoal } from "@/types/database";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentKg: number | null;
  initial: WeightGoal | null;
  onSubmit: (target_kg: number, deadline: string) => Promise<void> | void;
  saving?: boolean;
}

const TOMORROW = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
};

export function WeightGoalSheet({ isOpen, onClose, currentKg, initial, onSubmit, saving }: Props) {
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState(TOMORROW());

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setTarget(initial.target_kg.toFixed(1));
      setDeadline(initial.deadline);
    } else {
      setTarget("");
      setDeadline(TOMORROW());
    }
  }, [isOpen, initial]);

  const parsed = parseFloat(target);
  const valid =
    Number.isFinite(parsed) &&
    parsed >= 20 &&
    parsed <= 300 &&
    deadline > new Date().toLocaleDateString("sv-SE");

  const preview = useMemo(() => {
    if (!valid || currentKg == null) return null;
    const pace = calcWeeklyPace(currentKg, parsed, deadline);
    const daysLeft = Math.round((new Date(deadline + "T00:00:00").getTime() - Date.now()) / 86_400_000);
    const remain = Math.round((currentKg - parsed) * 10) / 10;
    return { pace, daysLeft, remain };
  }, [valid, parsed, deadline, currentKg]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="목표 설정">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">목표 체중 (kg)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="62.0"
            autoFocus
            className="w-full min-h-[56px] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">달성 목표일</p>
          <input
            type="date"
            value={deadline}
            min={TOMORROW()}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        {preview && (
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-3 text-xs text-indigo-800 dark:text-indigo-200">
            📊 지금 {currentKg?.toFixed(1)}kg → {preview.remain > 0 ? `${preview.remain.toFixed(1)}kg 감량` : `유지`} /{" "}
            {preview.daysLeft}일{preview.pace ? ` · 주 ${preview.pace.toFixed(2)}kg 필요` : ""}
          </div>
        )}

        <button
          type="button"
          onClick={() => valid && onSubmit(parsed, deadline)}
          disabled={!valid || saving}
          className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: 페이지에 연결**

```tsx
import { WeightGoalSheet } from "@/components/manage/weight-goal-sheet";

// ⚠️ 기존 useWeight() 분해에 `setGoal`을 추가. 새 호출 만들지 말 것.
// 최종 분해는 이렇게 됨:
//   const { entries, goal, stats, loading, addEntry, updateEntry, deleteEntry, setGoal } = useWeight();

const [goalOpen, setGoalOpen] = useState(false);
const [savingGoal, setSavingGoal] = useState(false);

async function handleSaveGoal(target_kg: number, deadline: string) {
  setSavingGoal(true);
  const res = await setGoal(target_kg, deadline);
  setSavingGoal(false);
  if (res.ok) {
    toast("목표가 저장되었어요", "success");
    setGoalOpen(false);
  } else {
    toast(res.error ?? "저장 실패", "error");
  }
}

// PageHeader의 rightAction prop에 연결 (기존 Task 6에서 만든 헤더의 버튼에 onClick 추가)
<PageHeader
  title="관리"
  contentMaxWidth="max-w-3xl"
  rightAction={
    <button onClick={() => setGoalOpen(true)} aria-label="목표 설정" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors">
      <SettingsIcon size={20} />
    </button>
  }
/>

// WeightHero의 onOpenGoal에도 연결
<WeightHero stats={stats} goal={goal} onOpenGoal={() => setGoalOpen(true)} />

// 시트 렌더
<WeightGoalSheet
  isOpen={goalOpen}
  onClose={() => setGoalOpen(false)}
  currentKg={stats.currentKg}
  initial={goal}
  onSubmit={handleSaveGoal}
  saving={savingGoal}
/>
```

- [ ] **Step 3: 브라우저 확인**
1. 헤더 ⚙︎ 탭 → 시트 열림
2. 62.0 + 5월 말 날짜 입력 → 미리보기 문구 실시간 갱신
3. 저장 → 토스트 + 히어로에 "목표", "차이", 데드라인 인사이트 표시
4. 그래프에 목표 점선 오버레이
5. 히어로의 "목표" 자리가 비어있을 때 (목표 없음) 탭하면 시트 열림

- [ ] **Step 4: Commit**

```bash
git add src/components/manage/weight-goal-sheet.tsx src/app/manage/page.tsx
git commit -m "feat(manage): WeightGoalSheet with live pace preview"
```

---

## Task 11: 컴포넌트 테스트 — Hero + Comparisons

**Files:**
- Create: `src/components/manage/__tests__/weight-hero.test.tsx`
- Create: `src/components/manage/__tests__/weight-comparisons.test.tsx`

- [ ] **Step 1: `weight-hero.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightHero } from "@/components/manage/weight-hero";
import type { Stats } from "@/lib/weight-utils";

const baseStats: Stats = {
  currentKg: 67.3,
  startKg: 73.5,
  lostKg: 6.2,
  remainKg: 5.3,
  daysLeft: 35,
  weeklyPace: 1.06,
  comparisons: {
    w1: { diffKg: null, refDate: null, reason: "insufficient" },
    m1: { diffKg: null, refDate: null, reason: "insufficient" },
    m3: { diffKg: null, refDate: null, reason: "insufficient" },
    y1: { diffKg: null, refDate: null, reason: "insufficient" },
  },
};

describe("WeightHero", () => {
  it("renders current weight", () => {
    render(<WeightHero stats={baseStats} goal={null} />);
    expect(screen.getByText("67.3 kg")).toBeInTheDocument();
  });
  it("shows achievement message when remainKg<=0", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, remainKg: -1.0 }}
        goal={{ user_id: "u", target_kg: 68, deadline: "2026-05-23", updated_at: "" }}
      />
    );
    expect(screen.getByText(/목표 달성/)).toBeInTheDocument();
  });
  it("shows deadline-passed badge", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, daysLeft: -3, weeklyPace: null }}
        goal={{ user_id: "u", target_kg: 62, deadline: "2026-04-01", updated_at: "" }}
      />
    );
    expect(screen.getByText(/데드라인 지남/)).toBeInTheDocument();
  });
  it("shows empty dash when no current weight", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, currentKg: null, startKg: null, lostKg: null, remainKg: null }}
        goal={null}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: `weight-comparisons.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightComparisons } from "@/components/manage/weight-comparisons";

describe("WeightComparisons", () => {
  it("renders positive diff in red", () => {
    const { container } = render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: 0.5, refDate: "2026-04-11" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getByText(/\+0\.5 kg/)).toBeInTheDocument();
    expect(container.querySelector(".text-red-500, .text-red-400")).toBeTruthy();
  });

  it("renders negative diff in blue", () => {
    const { container } = render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: -0.5, refDate: "2026-04-11" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getByText(/-0\.5 kg/)).toBeInTheDocument();
    expect(container.querySelector(".text-blue-600, .text-blue-400")).toBeTruthy();
  });

  it("renders '기록 부족' for insufficient comparisons", () => {
    render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: null, refDate: null, reason: "insufficient" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getAllByText("기록 부족").length).toBe(4);
  });
});
```

- [ ] **Step 3: 테스트 실행**

Run: `npm run test -- manage`
Expected: 모든 테스트 PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/manage/__tests__
git commit -m "test(manage): WeightHero and WeightComparisons component tests"
```

---

## Task 12: 수동 QA 체크리스트 & 마무리

최종 통합 확인 — 실제 브라우저에서 시나리오대로 돌려본다.

- [ ] **Step 1: 시나리오 QA (체크리스트)**

```
[ ] 모바일 뷰(DevTools iPhone 14, 390px): 하단 5개 탭 간격 정상, 44px 터치 타겟
[ ] 데스크톱 뷰(1440px): 사이드바 "관리" 항목 강조 정상
[ ] /manage 초기 진입 (기록 0): 빈 상태 카드 + FAB만 보임
[ ] 체중 입력 → 히어로 / 리스트 즉시 업데이트
[ ] 두 번째 기록 → "직전 대비" 색 코딩 (파랑/빨강) 정상
[ ] 리스트 row 탭 → 수정 시트, 프리필 확인
[ ] 수정 저장 → 리스트/히어로 동기화
[ ] 삭제 2탭 확정 → 즉시 제거
[ ] 목표 설정 시트 열기 → 실시간 미리보기 갱신
[ ] 목표 저장 → 그래프 점선 + 히어로 데드라인 문구 표시
[ ] 레인지 탭 전환(전체/1M/3M/6M/1Y) → 차트 재렌더
[ ] 기록 1개뿐 → 그래프 "더 쌓이면..." 안내
[ ] 비교 수치: 기록 부족 칸 "—" + "기록 부족"
[ ] 다크모드 토글: 히어로 / 차트 / 비교 / 리스트 모두 색 대비 OK
[ ] 오프라인 상태로 저장 시도 → 에러 토스트
[ ] 새로고침(F5) 후 상태 복원 확인
```

- [ ] **Step 2: 전체 타입체크 + 린트**

Run:
```bash
npx tsc --noEmit
npm run lint
npm run test
```
Expected: 에러/실패 0개

- [ ] **Step 3: 전체 테스트 실행 (기존 테스트 회귀 확인)**

Run: `npm run test`
Expected: 전체 PASS — 기존 finance/basics 테스트도 영향 없음

- [ ] **Step 4: (선택) 메모리 업데이트**

`NEXT-SESSION.md` 또는 auto memory에 "관리 탭 + 체중 트래커 구현 완료" 기록

- [ ] **Step 5: 최종 Commit (비어있으면 skip)**

QA 중 발견한 이슈가 있다면 별도 커밋. 없으면 skip.

---

## 완료 기준 (Definition of Done)

1. 모든 태스크의 체크박스 완료
2. `npm run test` 전체 PASS (기존 + 신규)
3. `npx tsc --noEmit` 에러 0개
4. `npm run lint` 에러 0개
5. 수동 QA 체크리스트 전부 통과
6. 커밋 히스토리가 태스크 경계와 일치 (rebase 없이도 태스크별 revert 가능)

## 롤백 전략

- DB 마이그레이션 롤백: `supabase/migrations/00020_revert_weight_tables.sql` 형태로 새 마이그레이션 작성 (`DROP TABLE weight_entries; DROP TABLE weight_goal;`)
- 코드 롤백: 각 태스크의 커밋을 역순으로 `git revert`
- 네비 항목만 잠시 숨기려면: Task 4의 navItems/tabs에서 "관리" 항목만 주석 처리 후 재커밋
