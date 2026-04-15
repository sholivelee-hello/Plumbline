# Basics 통계 탭 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **UI/UX Note:** UI 컴포넌트 구현 시 `ui-ux-pro-max` 스킬을 사용하여 디자인 품질을 확보할 것.

**Goal:** Basics 페이지에 주간/월간 통계 뷰를 추가하여 라인 차트, 캘린더 히트맵, 주차별 비교, 일간 테이블로 달성 현황을 시각화한다.

**Architecture:** 기존 "체크"/"통계" 탭 구조를 유지하되, "통계" 탭 콘텐츠를 새로운 StatsView 컴포넌트로 교체. StatsView 내부에서 주간/월간 토글. 데이터는 신규 `useWeeklyStats`/`useMonthlyStats` 훅으로 조회. 기존 `useBasicsStats` 훅과 `BasicsStats` 컴포넌트는 수정하지 않음 (대시보드 등에서 계속 사용).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase, recharts 3.8, Vitest

**Spec:** `docs/superpowers/specs/2026-04-14-basics-stats-redesign.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `supabase/migrations/00008_basics_deactivated_at.sql` | deactivated_at 컬럼 추가 마이그레이션 |
| `src/lib/utils/stats.ts` | 통계 계산 순수 함수 (달성률, 항목 존재 일수 등) |
| `src/lib/utils/__tests__/stats.test.ts` | stats 유틸 단위 테스트 |
| `src/lib/hooks/use-weekly-stats.ts` | 주간 통계 데이터 훅 |
| `src/lib/hooks/use-monthly-stats.ts` | 월간 통계 데이터 훅 |
| `src/components/basics/stats-view.tsx` | 통계 탭 메인 컨테이너 (주간/월간 토글) |
| `src/components/basics/weekly-stats.tsx` | 주간 통계 뷰 (달성률 + 라인차트 + 체크테이블) |
| `src/components/basics/monthly-stats.tsx` | 월간 통계 뷰 (달성률 + 히트맵 + 주차비교 + 일간테이블) |
| `src/components/basics/achievement-card.tsx` | 달성률 요약 카드 (주간/월간 공용) |
| `src/components/basics/category-line-chart.tsx` | 카테고리별 수치형 라인 차트 (recharts) |
| `src/components/basics/check-table.tsx` | 체크형 항목 주간 달성 테이블 |
| `src/components/basics/calendar-heatmap.tsx` | 월간 캘린더 히트맵 |
| `src/components/basics/weekly-comparison.tsx` | 월간 주차별 비교 막대 차트 (recharts) |
| `src/components/basics/daily-table.tsx` | 월간 항목별 일간 테이블 |

### Modified Files
| File | Change |
|------|--------|
| `src/types/database.ts:18-29` | BasicsTemplate에 `deactivated_at` 필드 추가 |
| `src/lib/hooks/use-basics.ts:111-117` | deactivateTemplate()에서 deactivated_at 설정 |
| `src/lib/demo-data.ts` | 통계용 데모 데이터 확장 (30일치) |
| `src/app/basics/page.tsx:109-118` | 통계 탭에서 StatsView 렌더링 |

---

## Task 1: Schema + Types 기반 작업

**Files:**
- Create: `supabase/migrations/00008_basics_deactivated_at.sql`
- Modify: `src/types/database.ts:18-29`
- Modify: `src/lib/hooks/use-basics.ts:111-117`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 00008_basics_deactivated_at.sql
ALTER TABLE basics_templates
ADD COLUMN deactivated_at TIMESTAMPTZ DEFAULT NULL;
```

- [ ] **Step 2: TypeScript 타입 업데이트**

`src/types/database.ts`의 `BasicsTemplate` 인터페이스에 추가:

```typescript
// line 28 (is_active 뒤에 추가)
deactivated_at: string | null;
```

- [ ] **Step 3: deactivateTemplate 함수 수정**

`src/lib/hooks/use-basics.ts`의 `deactivateTemplate` 함수(line 111-117)를 수정:

```typescript
const deactivateTemplate = useCallback(async (templateId: string) => {
  const supabase = createClient();
  await supabase
    .from("basics_templates")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", templateId);
  await loadTemplatesAndLogs();
}, [loadTemplatesAndLogs]);
```

- [ ] **Step 4: 데모 데이터에 deactivated_at 추가**

`src/lib/demo-data.ts`의 demoTemplates 각 항목에 `deactivated_at: null` 추가. 또한 기존 `created_at: ""`를 의미 있는 값으로 변경 (30일 전 날짜, 예: `new Date(Date.now() - 30 * 86400000).toISOString()`). 빈 문자열은 `new Date("")`가 Invalid Date를 생성하여 통계 계산이 NaN이 됨.

- [ ] **Step 5: 빌드 확인**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 타입 에러 없음

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/00008_basics_deactivated_at.sql src/types/database.ts src/lib/hooks/use-basics.ts src/lib/demo-data.ts
git commit -m "feat: add deactivated_at to basics_templates schema and types"
```

---

## Task 2: 통계 계산 유틸리티 함수 (TDD)

**Files:**
- Create: `src/lib/utils/stats.ts`
- Create: `src/lib/utils/__tests__/stats.test.ts`

핵심 순수 함수들을 먼저 테스트와 함께 작성한다.

- [ ] **Step 1: 테스트 파일 작성**

`src/lib/utils/__tests__/stats.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  getActiveDays,
  calcAchievementRate,
  isNumericAchieved,
  getDailyAchievementRate,
  getMonthWeeks,
} from "../stats";

describe("getActiveDays", () => {
  it("returns intersection of item range and query range", () => {
    // item created Apr 5, query range Apr 1-10 → 6 days (Apr 5-10)
    const days = getActiveDays(
      "2026-04-05", null, "2026-04-01", "2026-04-10"
    );
    expect(days).toBe(6);
  });

  it("handles deactivated items", () => {
    // item created Apr 3, deactivated Apr 7, query Apr 1-10 → 5 days (Apr 3-7)
    const days = getActiveDays(
      "2026-04-03", "2026-04-07T12:00:00Z", "2026-04-01", "2026-04-10"
    );
    expect(days).toBe(5);
  });

  it("returns 0 when item not yet created in range", () => {
    const days = getActiveDays(
      "2026-04-15", null, "2026-04-01", "2026-04-10"
    );
    expect(days).toBe(0);
  });

  it("returns 0 when item deactivated before range", () => {
    const days = getActiveDays(
      "2026-04-01", "2026-04-03T00:00:00Z", "2026-04-05", "2026-04-10"
    );
    expect(days).toBe(0);
  });
});

describe("isNumericAchieved", () => {
  it("returns true when value >= target", () => {
    expect(isNumericAchieved(30, 30)).toBe(true);
    expect(isNumericAchieved(35, 30)).toBe(true);
  });

  it("returns false when value < target", () => {
    expect(isNumericAchieved(25, 30)).toBe(false);
  });

  it("returns true when no target and value > 0", () => {
    expect(isNumericAchieved(5, null)).toBe(true);
  });

  it("returns false when no target and value is 0", () => {
    expect(isNumericAchieved(0, null)).toBe(false);
  });

  it("returns false when value is null", () => {
    expect(isNumericAchieved(null, 30)).toBe(false);
  });
});

describe("calcAchievementRate", () => {
  it("calculates percentage correctly", () => {
    expect(calcAchievementRate(3, 7)).toBeCloseTo(42.86, 1);
  });

  it("returns 0 when activeDays is 0", () => {
    expect(calcAchievementRate(0, 0)).toBe(0);
  });

  it("caps at 100", () => {
    expect(calcAchievementRate(10, 7)).toBe(100);
  });
});

describe("getDailyAchievementRate", () => {
  it("calculates rate from mixed logs", () => {
    const templates = [
      { id: "t1", type: "check" as const, target_value: null, created_at: "2026-04-01", deactivated_at: null },
      { id: "t2", type: "number" as const, target_value: 30, created_at: "2026-04-01", deactivated_at: null },
    ];
    const logs = [
      { template_id: "t1", completed: true, value: null },
      { template_id: "t2", completed: false, value: 35 },
    ];
    // t1: completed=true → achieved. t2: value(35) >= target(30) → achieved. Rate = 100%
    expect(getDailyAchievementRate(templates, logs)).toBe(100);
  });

  it("returns 0 when no templates", () => {
    expect(getDailyAchievementRate([], [])).toBe(0);
  });
});

describe("getMonthWeeks", () => {
  it("splits April 2026 into 4 weeks + remainder", () => {
    const weeks = getMonthWeeks("2026-04");
    expect(weeks).toEqual([
      { label: "1주차", start: 1, end: 7 },
      { label: "2주차", start: 8, end: 14 },
      { label: "3주차", start: 15, end: 21 },
      { label: "4주차", start: 22, end: 30 },
    ]);
  });

  it("handles February 2026 (28 days)", () => {
    const weeks = getMonthWeeks("2026-02");
    expect(weeks[3]).toEqual({ label: "4주차", start: 22, end: 28 });
  });
});
```

- [ ] **Step 2: 테스트 실행 - 실패 확인**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx vitest run src/lib/utils/__tests__/stats.test.ts 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: 유틸리티 구현**

`src/lib/utils/stats.ts`:

```typescript
/**
 * 항목이 조회 기간 내에서 활성 상태였던 일수를 계산한다.
 * createdAt ~ deactivatedAt 범위와 rangeStart ~ rangeEnd의 교집합.
 */
export function getActiveDays(
  createdAt: string,
  deactivatedAt: string | null,
  rangeStart: string,
  rangeEnd: string
): number {
  const created = new Date(createdAt.slice(0, 10));
  const deactivated = deactivatedAt
    ? new Date(deactivatedAt.slice(0, 10))
    : null;
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);

  const effectiveStart = created > start ? created : start;
  const effectiveEnd = deactivated && deactivated < end ? deactivated : end;

  if (effectiveStart > effectiveEnd) return 0;

  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 수치형 항목의 달성 여부를 현재 target_value 기준으로 판정한다.
 */
export function isNumericAchieved(
  value: number | null,
  targetValue: number | null
): boolean {
  if (value === null || value === undefined) return false;
  if (targetValue !== null && targetValue !== undefined) {
    return value >= targetValue;
  }
  return value > 0;
}

/**
 * 달성률을 계산한다 (0~100). activeDays가 0이면 0 반환.
 */
export function calcAchievementRate(
  achievedDays: number,
  activeDays: number
): number {
  if (activeDays <= 0) return 0;
  return Math.min(100, (achievedDays / activeDays) * 100);
}

/**
 * 특정 날짜의 전체 달성률을 계산한다.
 * 체크형: completed 필드 사용. 수치형: value vs target_value 실시간 비교.
 */
export function getDailyAchievementRate(
  templates: Array<{
    id: string;
    type: "check" | "number";
    target_value: number | null;
    created_at: string;
    deactivated_at: string | null;
  }>,
  logs: Array<{
    template_id: string;
    completed: boolean;
    value: number | null;
  }>
): number {
  if (templates.length === 0) return 0;

  const logMap = new Map(logs.map((l) => [l.template_id, l]));
  let achieved = 0;

  for (const t of templates) {
    const log = logMap.get(t.id);
    if (!log) continue;

    if (t.type === "check") {
      if (log.completed) achieved++;
    } else {
      if (isNumericAchieved(log.value, t.target_value)) achieved++;
    }
  }

  return calcAchievementRate(achieved, templates.length);
}

/**
 * 월을 4주차로 분할한다. 4주차는 22일~말일.
 */
export function getMonthWeeks(
  month: string
): Array<{ label: string; start: number; end: number }> {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();

  return [
    { label: "1주차", start: 1, end: 7 },
    { label: "2주차", start: 8, end: 14 },
    { label: "3주차", start: 15, end: 21 },
    { label: "4주차", start: 22, end: lastDay },
  ];
}
```

- [ ] **Step 4: 테스트 실행 - 통과 확인**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx vitest run src/lib/utils/__tests__/stats.test.ts 2>&1 | tail -10`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/stats.ts src/lib/utils/__tests__/stats.test.ts
git commit -m "feat: add stats calculation utility functions with tests"
```

---

## Task 3: useWeeklyStats 훅

**Files:**
- Create: `src/lib/hooks/use-weekly-stats.ts`

이 훅은 이번 주 7일간의 템플릿 + 로그 데이터를 조회하고, 카테고리별/전체 달성률을 계산한다.

- [ ] **Step 1: 훅 작성**

`src/lib/hooks/use-weekly-stats.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, getWeekStart, getWeekDates } from "@/lib/utils/date";
import {
  getActiveDays,
  isNumericAchieved,
  calcAchievementRate,
  getDailyAchievementRate,
} from "@/lib/utils/stats";
import { demoTemplates, demoLogs } from "@/lib/demo-data";

export interface WeeklyItemStat {
  template: BasicsTemplate;
  dailyLogs: Record<string, BasicsLog | null>; // date → log
  achievementRate: number;
}

export interface WeeklyStats {
  weekDates: string[];
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
  items: WeeklyItemStat[];
  loading: boolean;
}

export function useWeeklyStats(
  dayStartTime: string = "04:00",
  includeInactive: boolean = false
): WeeklyStats {
  const [items, setItems] = useState<WeeklyItemStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const today = getLogicalDate(dayStartTime);
      const weekStart = getWeekStart(today);
      const weekDates = getWeekDates(today);
      const weekEnd = weekDates[6];

      // Load templates
      let templateQuery = supabase
        .from("basics_templates")
        .select("*")
        .order("category")
        .order("sort_order");

      if (!includeInactive) {
        templateQuery = templateQuery.eq("is_active", true);
      }

      const { data: templates } = await templateQuery;
      if (!templates) throw new Error("No templates");

      // Load logs for the week
      const { data: logs } = await supabase
        .from("basics_logs")
        .select("*")
        .in("template_id", templates.map((t) => t.id))
        .gte("date", weekStart)
        .lte("date", weekEnd);

      const logsArr = logs || [];

      // Build per-item stats
      const result: WeeklyItemStat[] = templates.map((template) => {
        const templateLogs = logsArr.filter(
          (l) => l.template_id === template.id
        );
        const dailyLogs: Record<string, BasicsLog | null> = {};

        for (const date of weekDates) {
          const log = templateLogs.find((l) => l.date === date) || null;
          dailyLogs[date] = log;
        }

        // Calculate achievement for active days only
        const activeDays = getActiveDays(
          template.created_at, template.deactivated_at, weekStart, today
        );
        let achievedDays = 0;
        for (const date of weekDates) {
          if (date > today) continue;
          const log = dailyLogs[date];
          if (!log) continue;
          if (template.type === "check") {
            if (log.completed) achievedDays++;
          } else {
            if (isNumericAchieved(log.value, template.target_value)) achievedDays++;
          }
        }

        return {
          template,
          dailyLogs,
          achievementRate: calcAchievementRate(achievedDays, activeDays),
        };
      });

      setItems(result);
    } catch {
      // Demo fallback
      const today = getLogicalDate(dayStartTime);
      const weekDates = getWeekDates(today);

      const result: WeeklyItemStat[] = demoTemplates
        .filter((t) => includeInactive || t.is_active)
        .map((template) => {
          const templateLogs = demoLogs.filter(
            (l) => l.template_id === template.id
          );
          const dailyLogs: Record<string, BasicsLog | null> = {};
          for (const date of weekDates) {
            dailyLogs[date] = templateLogs.find((l) => l.date === date) || null;
          }
          return { template, dailyLogs, achievementRate: 0 };
        });

      setItems(result);
    } finally {
      setLoading(false);
    }
  }, [dayStartTime, includeInactive]);

  useEffect(() => { load(); }, [load]);

  // Compute aggregates
  const today = getLogicalDate(dayStartTime);
  const weekDates = getWeekDates(today);

  const activeItems = items.filter((i) => i.template.is_active);
  const spiritual = activeItems.filter((i) => i.template.category === "spiritual");
  const physical = activeItems.filter((i) => i.template.category === "physical");

  const avg = (arr: WeeklyItemStat[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, i) => s + i.achievementRate, 0) / arr.length;

  return {
    weekDates,
    overallRate: avg(activeItems),
    spiritualRate: avg(spiritual),
    physicalRate: avg(physical),
    items,
    loading,
  };
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-weekly-stats.ts
git commit -m "feat: add useWeeklyStats hook for weekly statistics data"
```

---

## Task 4: useMonthlyStats 훅

**Files:**
- Create: `src/lib/hooks/use-monthly-stats.ts`

이번 달 전체 데이터를 조회하고, 일별 달성률(히트맵용), 주차별 달성률, 항목별 일간 데이터를 제공한다.

- [ ] **Step 1: 훅 작성**

`src/lib/hooks/use-monthly-stats.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BasicsTemplate, BasicsLog } from "@/types/database";
import { getLogicalDate, getCurrentMonth } from "@/lib/utils/date";
import {
  getActiveDays,
  isNumericAchieved,
  calcAchievementRate,
  getDailyAchievementRate,
  getMonthWeeks,
} from "@/lib/utils/stats";
import { demoTemplates, demoLogs } from "@/lib/demo-data";

export interface MonthlyItemStat {
  template: BasicsTemplate;
  dailyLogs: Record<string, BasicsLog | null>; // "YYYY-MM-DD" → log
  achievementRate: number;
}

export interface DailyRate {
  date: string;
  rate: number;
}

export interface WeekComparison {
  label: string;
  spiritualRate: number;
  physicalRate: number;
}

export interface MonthlyStats {
  month: string; // "YYYY-MM"
  monthDates: string[];
  today: string;
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
  dailyRates: DailyRate[]; // for heatmap
  weekComparisons: WeekComparison[]; // for bar chart
  items: MonthlyItemStat[];
  loading: boolean;
}

export function useMonthlyStats(
  dayStartTime: string = "04:00",
  includeInactive: boolean = false
): MonthlyStats {
  const [items, setItems] = useState<MonthlyItemStat[]>([]);
  const [dailyRates, setDailyRates] = useState<DailyRate[]>([]);
  const [weekComparisons, setWeekComparisons] = useState<WeekComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [today, setToday] = useState(getLogicalDate(dayStartTime));

  const load = useCallback(async () => {
    setLoading(true);

    // Compute dates inside callback to avoid unstable dependencies
    const currentToday = getLogicalDate(dayStartTime);
    const currentMonth = getCurrentMonth();
    const [year, mon] = currentMonth.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthStart = `${currentMonth}-01`;
    const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;
    const dates: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
      dates.push(`${currentMonth}-${String(d).padStart(2, "0")}`);
    }

    setMonth(currentMonth);
    setMonthDates(dates);
    setToday(currentToday);

    try {
      const supabase = createClient();

      let templateQuery = supabase
        .from("basics_templates")
        .select("*")
        .order("category")
        .order("sort_order");

      if (!includeInactive) {
        templateQuery = templateQuery.eq("is_active", true);
      }

      const { data: templates } = await templateQuery;
      if (!templates) throw new Error("No templates");

      const { data: logs } = await supabase
        .from("basics_logs")
        .select("*")
        .in("template_id", templates.map((t) => t.id))
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const logsArr = logs || [];

      // Per-item stats
      const itemStats: MonthlyItemStat[] = templates.map((template) => {
        const templateLogs = logsArr.filter(
          (l) => l.template_id === template.id
        );
        const dailyLogs: Record<string, BasicsLog | null> = {};
        for (const date of dates) {
          dailyLogs[date] = templateLogs.find((l) => l.date === date) || null;
        }

        const activeDays = getActiveDays(
          template.created_at, template.deactivated_at, monthStart, currentToday < monthEnd ? currentToday : monthEnd
        );
        let achievedDays = 0;
        for (const date of dates) {
          if (date > currentToday) continue;
          const log = dailyLogs[date];
          if (!log) continue;
          if (template.type === "check") {
            if (log.completed) achievedDays++;
          } else {
            if (isNumericAchieved(log.value, template.target_value)) achievedDays++;
          }
        }

        return {
          template,
          dailyLogs,
          achievementRate: calcAchievementRate(achievedDays, activeDays),
        };
      });

      setItems(itemStats);

      // Daily rates (for heatmap)
      const activeTemplates = templates.filter((t) => t.is_active);
      const rates: DailyRate[] = dates
        .filter((date) => date <= currentToday)
        .map((date) => {
          const dayTemplates = activeTemplates.filter((t) => {
            const created = t.created_at.slice(0, 10);
            const deactivated = t.deactivated_at?.slice(0, 10);
            return created <= date && (!deactivated || deactivated >= date);
          });
          const dayLogs = logsArr.filter((l) => l.date === date);
          return {
            date,
            rate: getDailyAchievementRate(dayTemplates, dayLogs),
          };
        });
      setDailyRates(rates);

      // Week comparisons
      const weeks = getMonthWeeks(currentMonth);
      const comparisons: WeekComparison[] = weeks
        .filter((w) => {
          const weekStartDate = `${currentMonth}-${String(w.start).padStart(2, "0")}`;
          return weekStartDate <= currentToday;
        })
        .map((w) => {
          const weekDates = dates.filter((d) => {
            const day = parseInt(d.split("-")[2]);
            return day >= w.start && day <= w.end && d <= currentToday;
          });

          const calcCategoryRate = (category: "spiritual" | "physical") => {
            const catTemplates = activeTemplates.filter(
              (t) => t.category === category
            );
            if (catTemplates.length === 0) return 0;

            const rates = catTemplates.map((t) => {
              const activeDatesInWeek = weekDates.filter((date) => {
                const created = t.created_at.slice(0, 10);
                const deactivated = t.deactivated_at?.slice(0, 10);
                return created <= date && (!deactivated || deactivated >= date);
              });
              if (activeDatesInWeek.length === 0) return 0;

              let achieved = 0;
              for (const date of activeDatesInWeek) {
                const log = logsArr.find(
                  (l) => l.template_id === t.id && l.date === date
                );
                if (!log) continue;
                if (t.type === "check") {
                  if (log.completed) achieved++;
                } else {
                  if (isNumericAchieved(log.value, t.target_value)) achieved++;
                }
              }
              return calcAchievementRate(achieved, activeDatesInWeek.length);
            });

            return rates.reduce((s, r) => s + r, 0) / rates.length;
          };

          return {
            label: w.label,
            spiritualRate: calcCategoryRate("spiritual"),
            physicalRate: calcCategoryRate("physical"),
          };
        });
      setWeekComparisons(comparisons);
    } catch {
      // Demo fallback
      const activeTemplates = demoTemplates.filter(
        (t) => includeInactive || t.is_active
      );
      setItems(
        activeTemplates.map((t) => ({
          template: t,
          dailyLogs: {},
          achievementRate: 0,
        }))
      );
      setDailyRates([]);
      setWeekComparisons([]);
    } finally {
      setLoading(false);
    }
  }, [dayStartTime, includeInactive]);

  useEffect(() => { load(); }, [load]);

  const activeItems = items.filter((i) => i.template.is_active);
  const spiritual = activeItems.filter((i) => i.template.category === "spiritual");
  const physical = activeItems.filter((i) => i.template.category === "physical");

  const avg = (arr: MonthlyItemStat[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, i) => s + i.achievementRate, 0) / arr.length;

  return {
    month,
    monthDates,
    today,
    overallRate: avg(activeItems),
    spiritualRate: avg(spiritual),
    physicalRate: avg(physical),
    dailyRates,
    weekComparisons,
    items,
    loading,
  };
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-monthly-stats.ts
git commit -m "feat: add useMonthlyStats hook for monthly statistics data"
```

---

## Task 5: 공용 달성률 카드 컴포넌트

**Files:**
- Create: `src/components/basics/achievement-card.tsx`

주간/월간 모두에서 사용하는 달성률 요약 카드.

- [ ] **Step 1: 컴포넌트 작성**

> **Note:** UI 스타일링 시 `ui-ux-pro-max` 스킬을 참고하여 디자인 품질 확보.

`src/components/basics/achievement-card.tsx`:

```tsx
"use client";

import { ProgressBar } from "@/components/ui/progress-bar";

interface AchievementCardProps {
  title: string; // "이번 주 달성률" or "이번 달 달성률"
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
}

export function AchievementCard({
  title,
  overallRate,
  spiritualRate,
  physicalRate,
}: AchievementCardProps) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-4xl font-bold text-primary-500">
        {Math.round(overallRate)}%
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">영적</span>
            <span className="text-gray-500">{Math.round(spiritualRate)}%</span>
          </div>
          <ProgressBar percent={spiritualRate} color="bg-primary-300" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">신체적</span>
            <span className="text-gray-500">{Math.round(physicalRate)}%</span>
          </div>
          <ProgressBar percent={physicalRate} color="bg-primary-500" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/basics/achievement-card.tsx
git commit -m "feat: add reusable AchievementCard component"
```

---

## Task 6: 주간 통계 컴포넌트들

**Files:**
- Create: `src/components/basics/category-line-chart.tsx`
- Create: `src/components/basics/check-table.tsx`
- Create: `src/components/basics/weekly-stats.tsx`

> **Note:** 모든 UI 컴포넌트 구현 시 `ui-ux-pro-max` 스킬을 참고.

- [ ] **Step 1: 카테고리 라인 차트 작성**

`src/components/basics/category-line-chart.tsx` — recharts를 사용한 수치형 항목 라인 차트:

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { WeeklyItemStat } from "@/lib/hooks/use-weekly-stats";

interface CategoryLineChartProps {
  title: string; // "영적" or "신체적"
  items: WeeklyItemStat[];
  weekDates: string[];
  today: string;
}

const COLORS = [
  "var(--primary)",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function CategoryLineChart({
  title,
  items,
  weekDates,
  today,
}: CategoryLineChartProps) {
  // Only show number-type items
  const numericItems = items.filter((i) => i.template.type === "number");
  if (numericItems.length === 0) return null;

  // Need at least 2 days of data for a meaningful line chart
  const datesWithData = weekDates.filter((date) => {
    if (date > today) return false;
    return numericItems.some((item) => item.dailyLogs[date]?.value !== null && item.dailyLogs[date]?.value !== undefined);
  });
  if (datesWithData.length < 2) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          {title} 수치 추세
        </p>
        <p className="text-sm text-gray-400 text-center py-6">
          데이터가 쌓이면 추세를 보여드릴게요
        </p>
      </div>
    );
  }

  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

  const chartData = weekDates.map((date, idx) => {
    const point: Record<string, string | number | null> = {
      name: dayLabels[idx],
      date,
    };
    if (date > today) {
      // Future dates: null values
      numericItems.forEach((item) => {
        point[item.template.title] = null;
      });
    } else {
      numericItems.forEach((item) => {
        const log = item.dailyLogs[date];
        point[item.template.title] = log?.value ?? null;
      });
    }
    return point;
  });

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        {title} 수치 추세
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {numericItems.map((item, idx) => (
              <Line
                key={item.template.id}
                type="monotone"
                dataKey={item.template.title}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            ))}
            {/* Goal reference lines */}
            {numericItems
              .filter((i) => i.template.target_value)
              .map((item, idx) => (
                <ReferenceLine
                  key={`goal-${item.template.id}`}
                  y={item.template.target_value!}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 체크형 테이블 작성**

`src/components/basics/check-table.tsx` — 체크형 항목의 주간 달성 현황 테이블:

```tsx
"use client";

import { WeeklyItemStat } from "@/lib/hooks/use-weekly-stats";

interface CheckTableProps {
  items: WeeklyItemStat[];
  weekDates: string[];
  today: string;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function CheckTable({ items, weekDates, today }: CheckTableProps) {
  const checkItems = items.filter((i) => i.template.type === "check");
  if (checkItems.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        체크 항목 달성 현황
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 dark:text-gray-500">
              <th className="text-left py-2 pr-3 font-medium min-w-[80px]">항목</th>
              {DAY_LABELS.map((day) => (
                <th key={day} className="text-center py-2 px-1 font-medium w-8">
                  {day}
                </th>
              ))}
              <th className="text-right py-2 pl-3 font-medium">달성률</th>
            </tr>
          </thead>
          <tbody>
            {checkItems.map((item) => {
              const createdDate = item.template.created_at.slice(0, 10);
              return (
                <tr
                  key={item.template.id}
                  className={`border-t border-[var(--border)] ${
                    !item.template.is_active ? "opacity-40" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 text-gray-700 dark:text-gray-200">
                    {item.template.title}
                  </td>
                  {weekDates.map((date, idx) => {
                    const isFuture = date > today;
                    const notYetCreated = date < createdDate;
                    const log = item.dailyLogs[date];

                    let cell = "";
                    if (isFuture) cell = "";
                    else if (notYetCreated) cell = "-";
                    else if (log?.completed) cell = "●";
                    else cell = "○";

                    return (
                      <td
                        key={date}
                        className={`text-center py-2.5 px-1 ${
                          cell === "●"
                            ? "text-primary-500 font-bold"
                            : cell === "○"
                            ? "text-gray-300 dark:text-gray-600"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                  <td className="text-right py-2.5 pl-3 font-medium text-gray-600 dark:text-gray-300">
                    {Math.round(item.achievementRate)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 주간 통계 뷰 조합**

`src/components/basics/weekly-stats.tsx` — 위 컴포넌트들을 조합:

```tsx
"use client";

import { useWeeklyStats } from "@/lib/hooks/use-weekly-stats";
import { AchievementCard } from "./achievement-card";
import { CategoryLineChart } from "./category-line-chart";
import { CheckTable } from "./check-table";
import { getLogicalDate } from "@/lib/utils/date";

interface WeeklyStatsProps {
  dayStartTime: string;
  showInactive: boolean;
}

export function WeeklyStatsView({ dayStartTime, showInactive }: WeeklyStatsProps) {
  const {
    weekDates,
    overallRate,
    spiritualRate,
    physicalRate,
    items,
    loading,
  } = useWeeklyStats(dayStartTime, showInactive);

  const today = getLogicalDate(dayStartTime);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] p-8 border border-[var(--border)] text-center text-gray-400">
        아직 항목이 없어요. 체크 탭에서 항목을 추가해보세요
      </div>
    );
  }

  const spiritual = items.filter((i) => i.template.category === "spiritual");
  const physical = items.filter((i) => i.template.category === "physical");

  return (
    <div className="space-y-4">
      <AchievementCard
        title="이번 주 달성률"
        overallRate={overallRate}
        spiritualRate={spiritualRate}
        physicalRate={physicalRate}
      />

      <CategoryLineChart
        title="영적"
        items={spiritual}
        weekDates={weekDates}
        today={today}
      />

      <CategoryLineChart
        title="신체적"
        items={physical}
        weekDates={weekDates}
        today={today}
      />

      <CheckTable items={items} weekDates={weekDates} today={today} />
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add src/components/basics/category-line-chart.tsx src/components/basics/check-table.tsx src/components/basics/weekly-stats.tsx
git commit -m "feat: add weekly stats view with line charts and check table"
```

---

## Task 7: 월간 통계 컴포넌트들 - 히트맵 + 주차별 비교

**Files:**
- Create: `src/components/basics/calendar-heatmap.tsx`
- Create: `src/components/basics/weekly-comparison.tsx`

- [ ] **Step 1: 캘린더 히트맵 작성**

`src/components/basics/calendar-heatmap.tsx` — CSS Grid 기반 히트맵:

```tsx
"use client";

import { DailyRate } from "@/lib/hooks/use-monthly-stats";
import { formatMonthKR } from "@/lib/utils/date";

interface CalendarHeatmapProps {
  month: string; // "YYYY-MM"
  dailyRates: DailyRate[];
  today: string;
}

function getRateColor(rate: number): string {
  if (rate === 0) return "bg-gray-100 dark:bg-gray-800";
  if (rate <= 25) return "bg-primary-500/20";
  if (rate <= 50) return "bg-primary-500/40";
  if (rate <= 75) return "bg-primary-500/60";
  return "bg-primary-500/90";
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function CalendarHeatmap({
  month,
  dailyRates,
  today,
}: CalendarHeatmapProps) {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay(); // 0=Sun
  // Convert to Monday-based: Mon=0, Tue=1, ..., Sun=6
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const rateMap = new Map(dailyRates.map((d) => [d.date, d.rate]));

  const cells: Array<{ date: string | null; day: number | null; rate: number | null; isFuture: boolean }> = [];

  // Empty cells for offset
  for (let i = 0; i < offset; i++) {
    cells.push({ date: null, day: null, rate: null, isFuture: false });
  }

  // Day cells
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    const isFuture = dateStr > today;
    const rate = rateMap.get(dateStr) ?? null;
    cells.push({ date: dateStr, day: d, rate, isFuture });
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        {formatMonthKR(month)} 달성 히트맵
      </p>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-md flex items-center justify-center text-xs transition-colors ${
              cell.date === null
                ? ""
                : cell.isFuture
                ? "bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-600"
                : cell.rate !== null
                ? `${getRateColor(cell.rate)} text-gray-700 dark:text-gray-200`
                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            } ${cell.date === today ? "ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-900" : ""}`}
            title={
              cell.date && cell.rate !== null
                ? `${cell.date}: ${Math.round(cell.rate)}%`
                : undefined
            }
          >
            {cell.day}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-gray-400">
        <span>낮음</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/20" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/40" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/60" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/90" />
        <span>높음</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 주차별 비교 차트 작성**

`src/components/basics/weekly-comparison.tsx` — recharts 묶은 막대 차트:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { WeekComparison } from "@/lib/hooks/use-monthly-stats";

interface WeeklyComparisonProps {
  data: WeekComparison[];
}

export function WeeklyComparison({ data }: WeeklyComparisonProps) {
  if (data.length === 0) return null;

  const chartData = data.map((w) => ({
    name: w.label,
    영적: Math.round(w.spiritualRate),
    신체적: Math.round(w.physicalRate),
  }));

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        주차별 비교
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              formatter={(value: number) => `${value}%`}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar
              dataKey="영적"
              fill="var(--primary-light)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="신체적"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/basics/calendar-heatmap.tsx src/components/basics/weekly-comparison.tsx
git commit -m "feat: add calendar heatmap and weekly comparison chart components"
```

---

## Task 8: 월간 일간 테이블 + 월간 통계 뷰

**Files:**
- Create: `src/components/basics/daily-table.tsx`
- Create: `src/components/basics/monthly-stats.tsx`

- [ ] **Step 1: 일간 테이블 작성**

`src/components/basics/daily-table.tsx` — 좌우 스크롤 가능한 항목별 일간 테이블:

```tsx
"use client";

import { Fragment } from "react";
import { MonthlyItemStat } from "@/lib/hooks/use-monthly-stats";
import { isNumericAchieved } from "@/lib/utils/stats";

interface DailyTableProps {
  items: MonthlyItemStat[];
  monthDates: string[];
  today: string;
}

export function DailyTable({ items, monthDates, today }: DailyTableProps) {
  if (items.length === 0) return null;

  // Separate by category
  const spiritual = items.filter((i) => i.template.category === "spiritual");
  const physical = items.filter((i) => i.template.category === "physical");
  const orderedItems = [...spiritual, ...physical];

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        항목별 일간 현황
      </p>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="text-xs min-w-max">
          <thead>
            <tr className="text-gray-400 dark:text-gray-500">
              <th className="sticky left-0 bg-[var(--surface)] text-left py-1.5 pr-2 font-medium min-w-[72px] z-10">
                항목
              </th>
              {monthDates.map((date) => {
                const day = parseInt(date.split("-")[2]);
                return (
                  <th key={date} className="text-center py-1.5 px-0.5 font-medium w-6">
                    {day}
                  </th>
                );
              })}
              <th className="sticky right-0 bg-[var(--surface)] text-right py-1.5 pl-2 font-medium min-w-[40px] z-10">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.map((item, idx) => {
              const createdDate = item.template.created_at.slice(0, 10);
              const deactivatedDate = item.template.deactivated_at?.slice(0, 10);
              const isFirst = idx === 0 || orderedItems[idx - 1].template.category !== item.template.category;

              return (
                <Fragment key={item.template.id}>
                  {isFirst && (
                    <tr>
                      <td
                        colSpan={monthDates.length + 2}
                        className="pt-2 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500"
                      >
                        {item.template.category === "spiritual" ? "영적" : "신체적"}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-[var(--border)]/50 ${
                      !item.template.is_active ? "opacity-40" : ""
                    }`}
                  >
                    <td className="sticky left-0 bg-[var(--surface)] py-1.5 pr-2 text-gray-700 dark:text-gray-200 z-10 truncate max-w-[72px]">
                      {item.template.title}
                    </td>
                    {monthDates.map((date) => {
                      const isFuture = date > today;
                      const notCreated = date < createdDate;
                      const afterDeactivated = deactivatedDate && date > deactivatedDate;
                      const log = item.dailyLogs[date];

                      if (isFuture || notCreated || afterDeactivated) {
                        return (
                          <td key={date} className="text-center py-1.5 px-0.5 text-gray-200 dark:text-gray-700">
                            {notCreated || afterDeactivated ? "-" : ""}
                          </td>
                        );
                      }

                      if (item.template.type === "check") {
                        return (
                          <td
                            key={date}
                            className={`text-center py-1.5 px-0.5 ${
                              log?.completed
                                ? "text-primary-500 font-bold"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          >
                            {log?.completed ? "●" : "○"}
                          </td>
                        );
                      }

                      // Number type
                      const value = log?.value;
                      const achieved = isNumericAchieved(value ?? null, item.template.target_value);
                      return (
                        <td
                          key={date}
                          className={`text-center py-1.5 px-0.5 font-mono ${
                            value === null || value === undefined
                              ? "text-gray-300 dark:text-gray-600"
                              : achieved
                              ? "text-primary-500"
                              : "text-red-400"
                          }`}
                        >
                          {value ?? "-"}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 bg-[var(--surface)] text-right py-1.5 pl-2 font-medium text-gray-600 dark:text-gray-300 z-10">
                      {Math.round(item.achievementRate)}%
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 월간 통계 뷰 조합**

`src/components/basics/monthly-stats.tsx`:

```tsx
"use client";

import { useMonthlyStats } from "@/lib/hooks/use-monthly-stats";
import { AchievementCard } from "./achievement-card";
import { CalendarHeatmap } from "./calendar-heatmap";
import { WeeklyComparison } from "./weekly-comparison";
import { DailyTable } from "./daily-table";

interface MonthlyStatsProps {
  dayStartTime: string;
  showInactive: boolean;
}

export function MonthlyStatsView({ dayStartTime, showInactive }: MonthlyStatsProps) {
  const {
    month,
    monthDates,
    today,
    overallRate,
    spiritualRate,
    physicalRate,
    dailyRates,
    weekComparisons,
    items,
    loading,
  } = useMonthlyStats(dayStartTime, showInactive);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] p-8 border border-[var(--border)] text-center text-gray-400">
        아직 항목이 없어요. 체크 탭에서 항목을 추가해보세요
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AchievementCard
        title="이번 달 달성률"
        overallRate={overallRate}
        spiritualRate={spiritualRate}
        physicalRate={physicalRate}
      />

      <CalendarHeatmap month={month} dailyRates={dailyRates} today={today} />

      <WeeklyComparison data={weekComparisons} />

      <DailyTable items={items} monthDates={monthDates} today={today} />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/basics/daily-table.tsx src/components/basics/monthly-stats.tsx
git commit -m "feat: add monthly stats view with daily table"
```

---

## Task 9: StatsView 컨테이너 + 페이지 통합

**Files:**
- Create: `src/components/basics/stats-view.tsx`
- Modify: `src/app/basics/page.tsx:109-118`

- [ ] **Step 1: StatsView 컨테이너 작성**

`src/components/basics/stats-view.tsx` — 주간/월간 토글 + 삭제된 항목 토글:

```tsx
"use client";

import { useState } from "react";
import { WeeklyStatsView } from "./weekly-stats";
import { MonthlyStatsView } from "./monthly-stats";

interface StatsViewProps {
  dayStartTime: string;
}

export function StatsView({ dayStartTime }: StatsViewProps) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod("weekly")}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            period === "weekly"
              ? "bg-primary-500 text-white"
              : "bg-[var(--surface-muted)] text-gray-500 dark:text-gray-400"
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setPeriod("monthly")}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            period === "monthly"
              ? "bg-primary-500 text-white"
              : "bg-[var(--surface-muted)] text-gray-500 dark:text-gray-400"
          }`}
        >
          월간
        </button>
      </div>

      {/* Content */}
      {period === "weekly" ? (
        <WeeklyStatsView dayStartTime={dayStartTime} showInactive={showInactive} />
      ) : (
        <MonthlyStatsView dayStartTime={dayStartTime} showInactive={showInactive} />
      )}

      {/* Inactive toggle */}
      <button
        onClick={() => setShowInactive(!showInactive)}
        className="w-full text-center text-xs text-gray-400 dark:text-gray-500 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {showInactive ? "삭제된 항목 숨기기" : "삭제된 항목 보기"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: basics 페이지에 StatsView 통합**

`src/app/basics/page.tsx`에서 기존 통계 탭 콘텐츠를 교체.

현재 코드 (line 109-118 근처):
```tsx
{tab === "check" ? (
  <BasicsList templates={templates} logs={logs} onToggle={toggleCheck} onUpdateValue={updateValue} />
) : (
  <BasicsStats />
)}
```

변경:
```tsx
{tab === "check" ? (
  <>
    <BasicsList templates={templates} logs={logs} onToggle={toggleCheck} onUpdateValue={updateValue} />
    <div className="mt-4">
      <BasicsStats />
    </div>
  </>
) : (
  <StatsView dayStartTime={settings?.day_start_time || "04:00"} />
)}
```

이렇게 하면:
- "체크" 탭: 체크리스트 + 기존 달성률/스트릭 카드 함께 표시
- "통계" 탭: 새로운 주간/월간 통계 뷰

**Import 추가** (파일 상단):
```typescript
import { StatsView } from "@/components/basics/stats-view";
```

- [ ] **Step 3: 타입 체크**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/basics/stats-view.tsx src/app/basics/page.tsx
git commit -m "feat: integrate StatsView into basics page with weekly/monthly toggle"
```

---

## Task 10: 데모 데이터 확장 + 전체 테스트

**Files:**
- Modify: `src/lib/demo-data.ts`

기존 데모 데이터를 확장하여 통계 뷰에서도 의미 있는 폴백 데이터가 표시되도록 한다.

- [ ] **Step 1: 데모 데이터 확장**

`src/lib/demo-data.ts`에 30일치 데모 로그 생성 함수 추가. 기존 demoLogs는 그대로 두고, stats용 확장 데이터 함수를 추가:

```typescript
/** 최근 N일간의 데모 로그를 생성한다 (통계 뷰 폴백용) */
export function generateDemoStatsLogs(
  templates: BasicsTemplate[],
  days: number = 30
): BasicsLog[] {
  const logs: BasicsLog[] = [];
  const today = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = toLocalDateString(date);

    for (const t of templates) {
      // 70% 확률로 달성
      const completed = Math.random() < 0.7;
      const value =
        t.type === "number" && t.target_value
          ? completed
            ? t.target_value + Math.floor(Math.random() * 10)
            : Math.floor(t.target_value * Math.random() * 0.8)
          : null;

      logs.push({
        id: `demo-stat-${t.id}-${dateStr}`,
        user_id: "demo",
        template_id: t.id,
        date: dateStr,
        completed,
        value,
        completed_at: completed ? `${dateStr}T12:00:00Z` : null,
      });
    }
  }

  return logs;
}
```

참고: `toLocalDateString` 헬퍼가 demo-data.ts에 이미 있는지 확인 후, 없으면 date.ts에서 가져오거나 인라인으로 추가.

- [ ] **Step 2: useWeeklyStats, useMonthlyStats의 데모 폴백에서 확장 데이터 사용하도록 업데이트**

각 훅의 catch 블록에서 `generateDemoStatsLogs`를 사용하여 의미 있는 데모 데이터로 폴백.

- [ ] **Step 3: 전체 테스트 실행**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npx vitest run 2>&1 | tail -20`
Expected: 모든 테스트 PASS

- [ ] **Step 4: 개발 서버에서 확인**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npm run dev`

브라우저에서 확인 사항:
1. `/basics` 페이지 접속
2. "체크" 탭에 체크리스트 + 기존 달성률/스트릭 카드 함께 표시 확인
3. "통계" 탭 클릭 → 주간/월간 토글 표시 확인
4. 주간: 달성률 카드, 라인 차트 (수치형 있으면), 체크 테이블 확인
5. 월간: 달성률 카드, 캘린더 히트맵, 주차별 비교, 일간 테이블 확인
6. "삭제된 항목 보기" 토글 동작 확인
7. 빈 상태 (항목 없을 때) 메시지 확인
8. 다크 모드 전환 후 스타일 확인
9. 모바일 뷰포트에서 가로 스크롤 확인

- [ ] **Step 5: Commit**

```bash
git add src/lib/demo-data.ts src/lib/hooks/use-weekly-stats.ts src/lib/hooks/use-monthly-stats.ts
git commit -m "feat: extend demo data for stats view fallback"
```

- [ ] **Step 6: 빌드 확인**

Run: `cd /c/Users/MIR-NOT-DXD-003/Desktop/위클리 && npm run build 2>&1 | tail -10`
Expected: 빌드 성공

- [ ] **Step 7: 최종 Commit**

모든 미커밋 변경사항 확인 후 최종 커밋:
```bash
git status
# 남은 변경사항이 있으면
git add -A && git commit -m "feat: complete basics statistics tab implementation"
```
