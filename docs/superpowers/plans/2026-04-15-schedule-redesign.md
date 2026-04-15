# 일정 개편 + 주간 템플릿 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plumbline의 일정(Schedule) 시스템을 재구성하여 주간 뷰에 이벤트 스트립, 계획 없이 실제 직접 추가, 블록 폼에 날짜 필드, 월간 뷰 이벤트 CRUD, 그리고 주간 템플릿(반복 주간 루틴) 시스템을 도입한다.

**Architecture:** 기존 Supabase 테이블(`events`, `schedule_plans`, `schedule_actuals`, `schedule_presets`)에 `weekly_templates`/`weekly_template_blocks` 두 테이블을 추가한다. UI 계층은 현재 2-컬럼 계획/실제 그리드를 유지하되, 상단에 이벤트 스트립을 얹고 입력 폼(날짜 피커 + 실제로 기록 체크박스)을 확장한다. 템플릿 적용은 `plans`만 생성하고 `actuals`는 건드리지 않는 단방향 흐름이다.

**Tech Stack:** Next.js 15 (App Router) / React 19 / TypeScript / Supabase (Postgres + RLS) / Tailwind / Vitest

**Prerequisites (이미 완료):**
- 일요일 시작 마이그레이션 (`getWeekStart`/`getWeekDates`, 요일 헤더 전역 반영) — 2026-04-15 완료
- `useEvents`/`useSchedule` 훅 기본 CRUD 존재

**관련 문서:**
- 스펙: `docs/superpowers/specs/2026-04-15-schedule-redesign.md`
- 관련 타입: `src/types/database.ts` (`Event`, `SchedulePlan`, `ScheduleActual`)

---

## File Structure

### 신규 파일 (9)

| 경로 | 책임 |
|------|------|
| `supabase/migrations/00009_weekly_templates.sql` | 신규 테이블 2개 + RLS |
| `src/components/schedule/event-form.tsx` | 이벤트 추가/편집 폼 |
| `src/components/schedule/events-strip.tsx` | 주간 뷰 상단 이벤트 띠 |
| `src/components/schedule/event-list-modal.tsx` | 월간 날짜 탭 시 이벤트 목록/편집 모달 |
| `src/components/schedule/template-apply-modal.tsx` | 템플릿 적용 확인(덮어쓰기/합치기) 모달 |
| `src/components/schedule/template-editor.tsx` | 템플릿 편집 화면 (7일 그리드) |
| `src/app/schedule/templates/page.tsx` | 템플릿 목록 페이지 |
| `src/app/schedule/templates/[id]/page.tsx` | 템플릿 편집 페이지 |
| `src/lib/hooks/use-templates.ts` | 템플릿 CRUD + 적용 훅 |

### 수정 파일 (7)

| 경로 | 변경 요약 |
|------|----------|
| `src/types/database.ts` | `WeeklyTemplate`, `WeeklyTemplateBlock` 타입 추가 |
| `src/app/schedule/page.tsx` | 헤더 버튼 분리 (`+ 블록` / `+ 이벤트` / `📋 템플릿`), 이벤트 모달 연결 |
| `src/components/schedule/weekly-view.tsx` | 이벤트 스트립 embed, 실제 컬럼 빈칸 클릭 지원, `addActual` prop 추가 |
| `src/components/schedule/monthly-view.tsx` | 날짜 탭 시 이벤트 목록/편집 모달, `+ 이벤트` 진입 지원 |
| `src/components/schedule/block-form.tsx` | 날짜 필드(`date`), "실제로 기록" 체크박스 추가 |
| `src/lib/hooks/use-schedule.ts` | `addActual`을 페이지에서 호출할 수 있도록 이미 export; 추가로 `deleteActual` 노출 |
| `src/lib/hooks/use-events.ts` | `updateEvent` 추가 |

---

## Phase 1 — 인프라 (타입 · DB · 훅)

### Task 1: `weekly_templates` 마이그레이션 생성

**Files:**
- Create: `supabase/migrations/00009_weekly_templates.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
CREATE TABLE weekly_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weekly_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES weekly_templates(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#c8d4e8'
);

CREATE INDEX idx_weekly_template_blocks_template_id
  ON weekly_template_blocks(template_id);

ALTER TABLE weekly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_template_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON weekly_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own template blocks"
  ON weekly_template_blocks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM weekly_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM weekly_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  ));
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/00009_weekly_templates.sql
git commit -m "feat(schedule): add weekly_templates schema"
```

---

### Task 2: 타입 정의 추가

**Files:**
- Modify: `src/types/database.ts` (끝부분)

- [ ] **Step 1: 타입 추가**

```ts
export interface WeeklyTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTemplateBlock {
  id: string;
  template_id: string;
  day_of_week: number; // 0=일, 1=월, ..., 6=토
  start_time: string;
  end_time: string;
  title: string;
  color: string;
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: PASS (에러 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/types/database.ts
git commit -m "feat(schedule): add WeeklyTemplate types"
```

---

### Task 3: 날짜 유틸 함수 `getDateFromWeekStart` 추가 (TDD)

목적: `weekStart + day_of_week` → `YYYY-MM-DD` 매핑 유틸. 템플릿 적용 시 사용.

**Files:**
- Modify: `src/lib/utils/date.ts`
- Modify: `src/lib/utils/__tests__/date.test.ts`

- [ ] **Step 1: 실패 테스트 먼저**

`src/lib/utils/__tests__/date.test.ts` 끝에 추가:

```ts
import { getDateFromWeekStart } from "../date";

describe("getDateFromWeekStart", () => {
  it("returns the Sunday itself for day 0", () => {
    expect(getDateFromWeekStart("2026-04-12", 0)).toBe("2026-04-12");
  });

  it("returns Monday for day 1 (Sunday-start convention)", () => {
    expect(getDateFromWeekStart("2026-04-12", 1)).toBe("2026-04-13");
  });

  it("returns Saturday for day 6", () => {
    expect(getDateFromWeekStart("2026-04-12", 6)).toBe("2026-04-18");
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx vitest run src/lib/utils/__tests__/date.test.ts
```

Expected: FAIL — "getDateFromWeekStart is not exported"

- [ ] **Step 3: 구현**

`src/lib/utils/date.ts` 끝에 추가:

```ts
/**
 * Given a week-start date (Sunday) and a day_of_week (0=Sun..6=Sat),
 * return the calendar date for that slot as 'YYYY-MM-DD'.
 */
export function getDateFromWeekStart(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + dayOfWeek);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/lib/utils/__tests__/date.test.ts
```

Expected: PASS — 모든 테스트 (기존 + 3개 신규)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/utils/date.ts src/lib/utils/__tests__/date.test.ts
git commit -m "feat(utils): add getDateFromWeekStart helper"
```

---

### Task 4: `useEvents` 에 `updateEvent` 추가

**Files:**
- Modify: `src/lib/hooks/use-events.ts`

- [ ] **Step 1: `updateEvent` 추가**

`deleteEvent` 바로 위에 삽입:

```ts
async function updateEvent(
  eventId: string,
  patch: Partial<Omit<Event, "id" | "user_id">>
) {
  await supabase.from("events").update(patch).eq("id", eventId);
  await loadEvents();
  await loadUpcoming();
}
```

반환 객체에도 추가:

```ts
return { events, upcoming, loading, addEvent, updateEvent, deleteEvent };
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/hooks/use-events.ts
git commit -m "feat(schedule): add updateEvent to useEvents"
```

---

### Task 5: `useTemplates` 훅 생성

**Files:**
- Create: `src/lib/hooks/use-templates.ts`

- [ ] **Step 1: 훅 작성**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { WeeklyTemplate, WeeklyTemplateBlock } from "@/types/database";

export function useTemplates() {
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("weekly_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setTemplates(data);
    } catch {
      setTemplates([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTemplate(name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("weekly_templates")
      .insert({ user_id: FIXED_USER_ID, name })
      .select("id")
      .single();
    await load();
    return error ? null : (data?.id ?? null);
  }

  async function renameTemplate(id: string, name: string) {
    await supabase
      .from("weekly_templates")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  }

  async function deleteTemplate(id: string) {
    await supabase.from("weekly_templates").delete().eq("id", id);
    await load();
  }

  async function loadBlocks(templateId: string): Promise<WeeklyTemplateBlock[]> {
    const { data } = await supabase
      .from("weekly_template_blocks")
      .select("*")
      .eq("template_id", templateId)
      .order("day_of_week")
      .order("start_time");
    return data ?? [];
  }

  async function addBlock(block: Omit<WeeklyTemplateBlock, "id">) {
    await supabase.from("weekly_template_blocks").insert(block);
  }

  async function updateBlock(
    id: string,
    patch: Partial<Omit<WeeklyTemplateBlock, "id" | "template_id">>
  ) {
    await supabase.from("weekly_template_blocks").update(patch).eq("id", id);
  }

  async function deleteBlock(id: string) {
    await supabase.from("weekly_template_blocks").delete().eq("id", id);
  }

  return {
    templates,
    loading,
    createTemplate,
    renameTemplate,
    deleteTemplate,
    loadBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
  };
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/hooks/use-templates.ts
git commit -m "feat(schedule): add useTemplates hook"
```

---

### Task 6: `useSchedule`에 `deleteActual` 노출 및 `applyTemplate` 추가

**Files:**
- Modify: `src/lib/hooks/use-schedule.ts`

- [ ] **Step 1: `deleteActual`와 `applyTemplate` 추가**

`deletePlan` 아래에 추가:

```ts
async function deleteActual(actualId: string) {
  await supabase.from("schedule_actuals").delete().eq("id", actualId);
  await loadWeek();
}

/**
 * Apply a weekly template to the given weekStart.
 * - mode "overwrite": delete all existing plans in this week, then insert template blocks
 * - mode "merge": keep existing plans, add template blocks
 * Only plans are affected; actuals are untouched.
 */
async function applyTemplate(
  blocks: Array<{ day_of_week: number; start_time: string; end_time: string; title: string; color: string }>,
  targetWeekStart: string,
  mode: "overwrite" | "merge"
) {
  const weekDatesLocal: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetWeekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    weekDatesLocal.push(`${y}-${m}-${day}`);
  }

  if (mode === "overwrite") {
    await supabase
      .from("schedule_plans")
      .delete()
      .in("date", weekDatesLocal);
  }

  const rows = blocks.map((b) => ({
    user_id: FIXED_USER_ID,
    date: weekDatesLocal[b.day_of_week],
    start_time: b.start_time,
    end_time: b.end_time,
    title: b.title,
    color: b.color,
  }));

  if (rows.length > 0) {
    await supabase.from("schedule_plans").insert(rows);
  }
  await loadWeek();
}
```

반환 객체에 추가:

```ts
return {
  plans, actuals, presets, loading, weekDates,
  completePlan, editAndComplete, addPlan, addActual,
  savePreset, deletePlan, deleteActual, applyTemplate,
};
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/hooks/use-schedule.ts
git commit -m "feat(schedule): add deleteActual and applyTemplate to useSchedule"
```

---

## Phase 2 — 블록 폼 개편 + 실제 직접 추가

### Task 7: `BlockForm`에 날짜 필드 + "실제로 기록" 체크박스

**Files:**
- Modify: `src/components/schedule/block-form.tsx`

- [ ] **Step 1: Props 확장 및 state 추가**

`BlockFormProps` 변경:

```ts
interface BlockFormProps {
  onSave: (data: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    color: string;
    saveAsPreset: boolean;
    asActual: boolean;
  }) => void;
  onCancel: () => void;
  timeSlots: string[];
  defaultDate: string;           // 필수: YYYY-MM-DD
  defaultStartTime?: string;
  defaultTitle?: string;
  defaultColor?: string;
  defaultDurationMinutes?: number;
  defaultAsActual?: boolean;     // 기본 false(=계획)
}
```

state에 추가:

```ts
const [date, setDate] = useState(defaultDate);
const [asActual, setAsActual] = useState(defaultAsActual ?? false);
```

- [ ] **Step 2: 날짜 input 및 asActual 체크박스 렌더**

`title` 입력 위에 삽입:

```tsx
<div>
  <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1 pl-1">
    날짜
  </label>
  <input
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
  />
</div>
```

`saveAsPreset` 체크박스 바로 아래에:

```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={asActual}
    onChange={(e) => setAsActual(e.target.checked)}
    className="w-4 h-4 rounded accent-primary-500"
  />
  <span className="text-sm text-gray-600 dark:text-gray-300">
    실제로 기록 (계획이 아닌 완료된 일로 저장)
  </span>
</label>
```

- [ ] **Step 3: `handleSubmit` 업데이트**

```ts
onSave({
  title: title.trim(),
  date,
  start_time: startTime,
  end_time: endTime,
  color,
  saveAsPreset,
  asActual,
});
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 호출하는 쪽(`src/app/schedule/page.tsx`)에서 에러 — 다음 Task에서 수정.

- [ ] **Step 5: 커밋**

```bash
git add src/components/schedule/block-form.tsx
git commit -m "feat(schedule): add date field and asActual checkbox to BlockForm"
```

---

### Task 8: 스케줄 페이지 — `BlockForm` 신규 계약 적용 + 실제 직접 추가

**Files:**
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: `formInitial` 에 `asActual` 필드 추가**

```ts
const [formInitial, setFormInitial] = useState<{
  date: string;
  start?: string;
  title?: string;
  color?: string;
  duration?: number;
  presetId?: string;
  asActual?: boolean; // 실제 컬럼 빈칸 클릭일 때 true
} | null>(null);
```

- [ ] **Step 2: `handleSave`를 신규 계약에 맞게 수정**

```ts
async function handleSave(data: {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  saveAsPreset: boolean;
  asActual: boolean;
}) {
  if (data.asActual) {
    await schedule.addActual({
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title,
      color: data.color,
    });
  } else {
    await schedule.addPlan({
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title,
      color: data.color,
      preset_id: formInitial?.presetId,
    });
  }
  if (data.saveAsPreset) {
    const [sh, sm] = data.start_time.split(":").map(Number);
    const [eh, em] = data.end_time.split(":").map(Number);
    const duration = eh * 60 + em - (sh * 60 + sm);
    await schedule.savePreset({
      title: data.title,
      color: data.color,
      duration,
    });
  }
  setFormOpen(false);
  setFormInitial(null);
}
```

- [ ] **Step 3: `openAdd`에 `asActual` 파라미터 추가**

```ts
function openAdd(date: string, start?: string, asActual: boolean = false) {
  setFormInitial({ date, start, asActual });
  setPresetOpen(true);
}
```

- [ ] **Step 4: `BlockForm` 호출에 `defaultDate`/`defaultAsActual` 전달**

Modal 안의 `<BlockForm ... />` 에 추가:

```tsx
<BlockForm
  timeSlots={timeSlots}
  defaultDate={formInitial.date}
  defaultStartTime={formInitial.start}
  defaultTitle={formInitial.title}
  defaultColor={formInitial.color}
  defaultDurationMinutes={formInitial.duration}
  defaultAsActual={formInitial.asActual}
  onSave={handleSave}
  onCancel={() => {
    setFormOpen(false);
    setFormInitial(null);
  }}
/>
```

- [ ] **Step 5: 상단 `+ 추가` 버튼 콜백 수정**

```tsx
onClick={() => openAdd(today, undefined, false)}
```

(이 버튼은 다음 Task에서 `+ 블록`/`+ 이벤트`로 분리됨 — 임시로만 둡니다.)

- [ ] **Step 6: 타입 체크 + 빌드**

```bash
npx tsc --noEmit
npm run build
```

Expected: 성공. `WeeklyView`의 `onAddSlot`도 신규 시그니처를 필요로 하므로 다음 Task에서 전달.

- [ ] **Step 7: 커밋**

```bash
git add src/app/schedule/page.tsx
git commit -m "feat(schedule): support direct actual creation via BlockForm"
```

---

### Task 9: 주간 뷰 — 실제 컬럼 빈칸 클릭 지원

**Files:**
- Modify: `src/components/schedule/weekly-view.tsx`

- [ ] **Step 1: `onAddSlot` prop 시그니처 확장**

```ts
onAddSlot?: (date: string, startTime: string | undefined, asActual: boolean) => void;
```

- [ ] **Step 2: `handleColumnClick`에서 `col` 전달**

```ts
function handleColumnClick(
  date: string,
  e: React.MouseEvent<HTMLDivElement>,
  col: "plan" | "actual"
) {
  if (!onAddSlot) return;
  const target = e.target as HTMLElement;
  if (target.closest("[data-time-block]")) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const minutes = Math.floor(y / (slotHeight / timeUnit));
  const [dayH, dayM] = dayStartTime.split(":").map(Number);
  const abs = dayH * 60 + dayM + Math.floor(minutes / timeUnit) * timeUnit;
  const h = String(Math.floor((abs / 60) % 24)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  onAddSlot(date, `${h}:${m}`, col === "actual");
}
```

- [ ] **Step 3: 실제 컬럼에도 클릭 핸들러 배선**

현재는 plan 컬럼에만 `onClick`이 있음. actual 컬럼 `<div>` (주석 `/* Actual column */` 아래)에 `role="button"`, `tabIndex={0}`, `onClick={(e) => handleColumnClick(date, e, "actual")}`, 키보드 핸들러 추가.

- [ ] **Step 4: 페이지 쪽 `onAddSlot` 콜백 업데이트**

`src/app/schedule/page.tsx` 주간 뷰 호출:

```tsx
onAddSlot={(date, start, asActual) => openAdd(date, start, asActual)}
```

- [ ] **Step 5: 타입 체크 + dev 서버에서 수동 확인**

```bash
npx tsc --noEmit
npm run dev
```

주간 뷰에서:
- 계획 컬럼 빈칸 클릭 → "실제로 기록" **체크 해제** 상태로 모달
- 실제 컬럼 빈칸 클릭 → "실제로 기록" **체크** 상태로 모달

- [ ] **Step 6: 커밋**

```bash
git add src/components/schedule/weekly-view.tsx src/app/schedule/page.tsx
git commit -m "feat(schedule): support direct actual creation via weekly grid"
```

---

## Phase 3 — 이벤트 폼 및 페이지 헤더 재구성

### Task 10: `EventForm` 컴포넌트 생성

**Files:**
- Create: `src/components/schedule/event-form.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useState } from "react";
import type { Event } from "@/types/database";

const COLOR_PRESETS = ["#d4c4b0", "#c8d4e8", "#c8dcc8", "#f0d4b4", "#e0e8f0", "#f9e8d4"];

interface EventFormProps {
  mode: "add" | "edit";
  initial?: Partial<Pick<Event, "title" | "start_date" | "end_date" | "color" | "memo">>;
  defaultDate?: string;
  onSave: (data: {
    title: string;
    start_date: string;
    end_date: string;
    color: string;
    memo: string | null;
    start_time: string | null;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function EventForm({ mode, initial, defaultDate, onSave, onCancel, onDelete }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? defaultDate ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? defaultDate ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [memo, setMemo] = useState(initial?.memo ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    if (endDate < startDate) return;
    onSave({
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      color,
      memo: memo.trim() ? memo.trim() : null,
      start_time: null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1 pl-1">시작 날짜</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 pl-1">종료 날짜</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" required />
        </div>
      </div>

      <input type="text" placeholder="이벤트 제목" value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
        required autoFocus />

      <div>
        <label className="block text-xs text-gray-400 mb-2 pl-1">색상</label>
        <div className="flex gap-2">
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined,
              }}
              aria-label={`색상 ${c}`} />
          ))}
        </div>
      </div>

      <textarea placeholder="메모 (선택)" value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm resize-none" />

      <div className="flex gap-3 pt-1">
        {mode === "edit" && onDelete && (
          <button type="button" onClick={onDelete}
            className="px-4 py-2.5 rounded-xl text-red-500 border border-red-200 dark:border-red-800 text-sm">
            삭제
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300">
          취소
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium">
          저장
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/schedule/event-form.tsx
git commit -m "feat(schedule): add EventForm component"
```

---

### Task 11: 스케줄 페이지 헤더 재구성 + 이벤트 모달 연결

**Files:**
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: import 추가**

```ts
import Link from "next/link";
import { EventForm } from "@/components/schedule/event-form";
import type { Event } from "@/types/database";
```

- [ ] **Step 2: 이벤트 모달 state**

```ts
const [eventFormOpen, setEventFormOpen] = useState(false);
const [editingEvent, setEditingEvent] = useState<Event | null>(null);

const { events, addEvent, updateEvent, deleteEvent } = useEvents();
```

- [ ] **Step 3: 헤더 UI 교체**

기존 `+ 추가` 버튼을 다음으로 교체:

```tsx
<div className="flex items-center gap-2">
  <div className="flex gap-1 bg-gray-100 dark:bg-[#1f242e] rounded-xl p-1">
    {/* 기존 주간/월간 토글 — 그대로 */}
  </div>
  {view === "weekly" && (
    <button
      type="button"
      onClick={() => openAdd(today, undefined, false)}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-sm font-semibold tap-press"
    >
      + 블록
    </button>
  )}
  <button
    type="button"
    onClick={() => { setEditingEvent(null); setEventFormOpen(true); }}
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary-500 text-primary-600 dark:text-primary-300 text-sm font-semibold tap-press"
  >
    + 이벤트
  </button>
  <Link
    href="/schedule/templates"
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 text-sm tap-press"
    aria-label="주간 템플릿"
  >
    📋
  </Link>
</div>
```

- [ ] **Step 4: 이벤트 저장 핸들러**

```tsx
async function handleSaveEvent(data: {
  title: string;
  start_date: string;
  end_date: string;
  color: string;
  memo: string | null;
  start_time: string | null;
}) {
  if (editingEvent) {
    await updateEvent(editingEvent.id, data);
  } else {
    await addEvent(data);
  }
  setEventFormOpen(false);
  setEditingEvent(null);
}

async function handleDeleteEvent() {
  if (!editingEvent) return;
  await deleteEvent(editingEvent.id);
  setEventFormOpen(false);
  setEditingEvent(null);
}
```

- [ ] **Step 5: 이벤트 모달 추가**

`BlockForm` Modal 뒤에:

```tsx
<Modal
  isOpen={eventFormOpen}
  onClose={() => { setEventFormOpen(false); setEditingEvent(null); }}
  title={editingEvent ? "이벤트 편집" : "이벤트 추가"}
>
  <EventForm
    mode={editingEvent ? "edit" : "add"}
    initial={editingEvent ?? undefined}
    defaultDate={today}
    onSave={handleSaveEvent}
    onCancel={() => { setEventFormOpen(false); setEditingEvent(null); }}
    onDelete={editingEvent ? handleDeleteEvent : undefined}
  />
</Modal>
```

- [ ] **Step 6: 빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 7: 커밋**

```bash
git add src/app/schedule/page.tsx
git commit -m "feat(schedule): restructure header with +블록 / +이벤트 / 📋 템플릿"
```

---

## Phase 4 — 주간 뷰 이벤트 스트립

### Task 12: `EventsStrip` 컴포넌트 생성

다일 이벤트는 시작~종료 범위에 걸친 가로 막대, 단일 이벤트는 해당 날짜 칸에만 표시. 이벤트가 없으면 아무것도 렌더하지 않음.

**Files:**
- Create: `src/components/schedule/events-strip.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import type { Event } from "@/types/database";

interface EventsStripProps {
  weekDates: string[];
  events: Event[];
  onEventClick: (event: Event) => void;
}

interface Lane {
  rows: Array<{ event: Event; startCol: number; span: number }>;
}

/**
 * Arrange events into non-overlapping lanes for the 7-day grid.
 * Each event clipped to the visible week (weekDates[0]..weekDates[6]).
 */
function arrangeLanes(weekDates: string[], events: Event[]): Lane[] {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const clipped = events
    .filter((e) => e.end_date >= weekStart && e.start_date <= weekEnd)
    .map((e) => {
      const from = e.start_date < weekStart ? weekStart : e.start_date;
      const to = e.end_date > weekEnd ? weekEnd : e.end_date;
      return {
        event: e,
        startCol: weekDates.indexOf(from),
        span: weekDates.indexOf(to) - weekDates.indexOf(from) + 1,
      };
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const lanes: Lane[] = [];
  for (const item of clipped) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane.rows[lane.rows.length - 1];
      if (!last || last.startCol + last.span <= item.startCol) {
        lane.rows.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push({ rows: [item] });
  }
  return lanes;
}

export function EventsStrip({ weekDates, events, onEventClick }: EventsStripProps) {
  const lanes = arrangeLanes(weekDates, events);
  if (lanes.length === 0) return null;

  return (
    <div className="space-y-0.5 py-1">
      {lanes.map((lane, idx) => (
        <div key={idx} className="grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((_, col) => {
            const row = lane.rows.find((r) => r.startCol === col);
            if (!row) {
              const covered = lane.rows.some(
                (r) => r.startCol < col && r.startCol + r.span > col
              );
              return covered ? null : <div key={col} />;
            }
            return (
              <button
                key={col}
                type="button"
                onClick={() => onEventClick(row.event)}
                className="text-left truncate text-[11px] font-medium leading-tight rounded px-1.5 py-0.5"
                style={{
                  gridColumn: `span ${row.span} / span ${row.span}`,
                  backgroundColor: (row.event.color || "#d4c4b0") + "30",
                  color: row.event.color || "#7575d8",
                }}
                title={row.event.title}
              >
                {row.event.title}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/schedule/events-strip.tsx
git commit -m "feat(schedule): add EventsStrip component with lane arrangement"
```

---

### Task 13: 주간 뷰에 `EventsStrip` 통합

**Files:**
- Modify: `src/components/schedule/weekly-view.tsx`
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: `WeeklyView`에 `events`, `onEventClick` prop 추가**

```ts
interface WeeklyViewProps {
  // ...기존 props
  events: Event[];
  onEventClick: (event: Event) => void;
}
```

(`Event` import 추가: `import type { SchedulePlan, ScheduleActual, Event } from "@/types/database";`)

- [ ] **Step 2: 날짜 헤더 아래에 스트립 렌더**

7일이 모두 보이는 **`visibleCount === 7`** 상황에서만 스트립 표시. 모바일(1일)·태블릿(3일)은 스펙 V1에서 제외 가능하지만, 단순성을 위해 모든 뷰에서 `visibleDates` 기준으로 렌더한다.

날짜 헤더 바로 아래(시간 그리드 위)에:

```tsx
{visibleCount === 7 && (
  <EventsStrip
    weekDates={weekDates}
    events={events}
    onEventClick={onEventClick}
  />
)}
```

(태블릿/모바일은 V2에서 축약 처리)

`import { EventsStrip } from "./events-strip";` 추가.

- [ ] **Step 3: 페이지에서 prop 전달**

`src/app/schedule/page.tsx`의 `<WeeklyView ... />` 에:

```tsx
events={events}
onEventClick={(e) => { setEditingEvent(e); setEventFormOpen(true); }}
```

- [ ] **Step 4: dev 서버에서 확인**

```bash
npm run dev
```

주간 뷰 데스크톱(lg+) 에서:
- 다일 이벤트 → 가로 막대가 시작~종료 범위에 렌더
- 클릭 시 편집 모달 오픈
- 이벤트 0개 시 스트립 높이 0

- [ ] **Step 5: 커밋**

```bash
git add src/components/schedule/weekly-view.tsx src/app/schedule/page.tsx
git commit -m "feat(schedule): render events strip above weekly grid"
```

---

## Phase 5 — 월간 뷰 이벤트 CRUD

### Task 14: `EventListModal` 생성

특정 날짜에 걸친 이벤트 목록 + 편집/삭제 + 새로 추가.

**Files:**
- Create: `src/components/schedule/event-list-modal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { Modal } from "@/components/ui/modal";
import type { Event } from "@/types/database";

interface EventListModalProps {
  date: string | null;
  events: Event[];
  onClose: () => void;
  onEdit: (event: Event) => void;
  onAddNew: (date: string) => void;
}

export function EventListModal({ date, events, onClose, onEdit, onAddNew }: EventListModalProps) {
  if (!date) return null;
  const visible = events.filter((e) => e.start_date <= date && e.end_date >= date);

  return (
    <Modal isOpen={!!date} onClose={onClose} title={`${date} 이벤트`}>
      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">이벤트가 없어요</p>
        ) : (
          visible.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onEdit(ev)}
              className="w-full text-left rounded-xl px-3 py-2 flex items-center gap-2 tap-press"
              style={{ backgroundColor: (ev.color || "#d4c4b0") + "20" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ev.color }}
              />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                {ev.title}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {ev.start_date}
                {ev.start_date !== ev.end_date && ` ~ ${ev.end_date}`}
              </span>
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => onAddNew(date)}
          className="w-full py-2.5 rounded-xl border border-dashed border-primary-300 text-primary-600 text-sm font-medium"
        >
          + 새 이벤트
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/schedule/event-list-modal.tsx
git commit -m "feat(schedule): add EventListModal"
```

---

### Task 15: 월간 뷰 — 날짜 탭 동작 변경

**Files:**
- Modify: `src/components/schedule/monthly-view.tsx`
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: `MonthlyView`의 날짜 탭 콜백 시그니처 변경**

현재 `onSelectDate(dateStr)` 는 주간 뷰 이동용. 스펙에 따라 **월간 날짜 탭은 이벤트 목록 모달을 열어야** 한다. prop을 다음으로 교체:

```ts
interface MonthlyViewProps {
  events: Event[];
  onDateTap: (date: string) => void;         // 이벤트 목록 모달 열기 (신규)
  onAddEvent?: ...                           // 기존 유지 (선택)
  onDeleteEvent?: ...                        // 기존 유지 (선택)
}
```

`onSelectDate` → `onDateTap`로 내부 이름 변경. 기존 `setDetail` 단일 이벤트 모달 로직은 제거 (이제 List 모달에서 편집).

- [ ] **Step 2: 페이지에서 모달 state와 콜백 연결**

`src/app/schedule/page.tsx`:

```ts
const [eventListDate, setEventListDate] = useState<string | null>(null);
```

`<MonthlyView ... />`:

```tsx
<MonthlyView
  events={events}
  onDateTap={(date) => setEventListDate(date)}
/>
```

모달 렌더 (다른 Modal 근처):

```tsx
<EventListModal
  date={eventListDate}
  events={events}
  onClose={() => setEventListDate(null)}
  onEdit={(ev) => {
    setEventListDate(null);
    setEditingEvent(ev);
    setEventFormOpen(true);
  }}
  onAddNew={(date) => {
    setEventListDate(null);
    setEditingEvent(null);
    setEventFormOpen(true);
    // defaultDate 동기화
    setTimeout(() => {
      // EventForm이 이미 열린 뒤에는 initial/defaultDate가 재적용되도록 key 전략 고려
    }, 0);
  }}
/>
```

**디테일:** `+ 새 이벤트`로 `EventForm`의 `defaultDate`를 선택한 날짜로 맞추려면, 페이지의 별도 state `eventDefaultDate`를 두고 `EventForm`에 전달. `defaultDate={eventDefaultDate ?? today}` 로 바인딩.

```ts
const [eventDefaultDate, setEventDefaultDate] = useState<string | null>(null);

onAddNew={(date) => {
  setEventListDate(null);
  setEditingEvent(null);
  setEventDefaultDate(date);
  setEventFormOpen(true);
}}
```

`EventForm`: `defaultDate={eventDefaultDate ?? today}`.

모달 close 시 `setEventDefaultDate(null)` 도 초기화.

- [ ] **Step 3: `import { EventListModal } from "@/components/schedule/event-list-modal";`**

- [ ] **Step 4: 빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/schedule/monthly-view.tsx src/app/schedule/page.tsx
git commit -m "feat(schedule): monthly view date tap opens event list modal"
```

---

## Phase 6 — 주간 템플릿 관리 페이지

### Task 16: 템플릿 목록 페이지

**Files:**
- Create: `src/app/schedule/templates/page.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { useTemplates } from "@/lib/hooks/use-templates";

export default function TemplatesPage() {
  const { templates, loading, createTemplate, deleteTemplate } = useTemplates();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const id = await createTemplate(newName.trim());
    setCreating(false);
    setNewName("");
    if (id) {
      window.location.href = `/schedule/templates/${id}`;
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/schedule" aria-label="일정으로 돌아가기"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">주간 템플릿</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="새 템플릿 이름 (예: 평일 루틴)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          <Plus size={16} className="inline mr-1" />생성
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          아직 템플릿이 없어요.<br />위 입력창에 이름을 넣어 만들어보세요.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id}
              className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <Link href={`/schedule/templates/${t.id}`}
                className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-primary-500">
                {t.name}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`"${t.name}" 템플릿을 삭제할까요?`)) deleteTemplate(t.id);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]"
                aria-label="템플릿 삭제">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/schedule/templates/page.tsx
git commit -m "feat(schedule): add template list page"
```

---

### Task 17: `TemplateEditor` 컴포넌트 + 편집 페이지

**Files:**
- Create: `src/components/schedule/template-editor.tsx`
- Create: `src/app/schedule/templates/[id]/page.tsx`

- [ ] **Step 1: `TemplateEditor` 작성**

7일 그리드(일·월·화·수·목·금·토)에 블록을 배치한다. 블록 클릭 → 편집/삭제 모달, 빈칸 클릭 → 추가 모달. `BlockForm`을 재사용하되 `date` 필드 대신 `day_of_week` 를 사용하므로 별도 내부 폼을 둔다(단순 `TemplateBlockForm`).

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { WeeklyTemplateBlock } from "@/types/database";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const COLOR_PRESETS = ["#d4c4b0", "#c8d4e8", "#c8dcc8", "#f0d4b4", "#e0e8f0", "#f9e8d4"];

interface TemplateEditorProps {
  templateId: string;
  loadBlocks: (id: string) => Promise<WeeklyTemplateBlock[]>;
  onAdd: (block: Omit<WeeklyTemplateBlock, "id">) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<WeeklyTemplateBlock, "id" | "template_id">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TemplateEditor({ templateId, loadBlocks, onAdd, onUpdate, onDelete }: TemplateEditorProps) {
  const [blocks, setBlocks] = useState<WeeklyTemplateBlock[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WeeklyTemplateBlock | null>(null);
  const [initDay, setInitDay] = useState<number>(0);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  const refresh = async () => setBlocks(await loadBlocks(templateId));
  useEffect(() => { refresh(); }, [templateId]);

  function openAddForDay(day: number) {
    setEditing(null);
    setInitDay(day);
    setTitle(""); setStartTime("09:00"); setEndTime("10:00"); setColor(COLOR_PRESETS[0]);
    setOpen(true);
  }
  function openEdit(b: WeeklyTemplateBlock) {
    setEditing(b);
    setInitDay(b.day_of_week);
    setTitle(b.title); setStartTime(b.start_time.slice(0, 5)); setEndTime(b.end_time.slice(0, 5)); setColor(b.color);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (editing) {
      await onUpdate(editing.id, { day_of_week: initDay, start_time: startTime, end_time: endTime, title: title.trim(), color });
    } else {
      await onAdd({ template_id: templateId, day_of_week: initDay, start_time: startTime, end_time: endTime, title: title.trim(), color });
    }
    setOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!editing) return;
    await onDelete(editing.id);
    setOpen(false);
    await refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 dark:text-gray-500">
        {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((_, day) => {
          const dayBlocks = blocks.filter((b) => b.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <button
              key={day}
              type="button"
              onClick={() => openAddForDay(day)}
              className="min-h-[140px] rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 space-y-1 text-left"
            >
              {dayBlocks.length === 0 && <span className="text-[10px] text-gray-300">+ 추가</span>}
              {dayBlocks.map((b) => (
                <div
                  key={b.id}
                  onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                  className="rounded-md px-1.5 py-1 text-[10px] font-medium cursor-pointer"
                  style={{ backgroundColor: (b.color || "#c8d4e8") + "30", color: b.color }}
                >
                  <div className="tabular-nums">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</div>
                  <div className="truncate">{b.title}</div>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "블록 편집" : "블록 추가"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1 pl-1">요일</label>
            <select value={initDay} onChange={(e) => setInitDay(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm">
              {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
            </select>
          </div>
          <input type="text" placeholder="제목" value={title}
            onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" />
          </div>
          <div className="flex gap-2">
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }} />
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            {editing && (
              <button type="button" onClick={handleDelete}
                className="px-3 py-2 rounded-xl text-red-500 border border-red-200 dark:border-red-800 text-sm">삭제</button>
            )}
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm">취소</button>
            <button type="submit" className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm">저장</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: 편집 페이지**

```tsx
// src/app/schedule/templates/[id]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTemplates } from "@/lib/hooks/use-templates";
import { TemplateEditor } from "@/components/schedule/template-editor";

export default function TemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { templates, renameTemplate, loadBlocks, addBlock, updateBlock, deleteBlock } = useTemplates();
  const template = templates.find((t) => t.id === id);
  const [name, setName] = useState(template?.name ?? "");

  useEffect(() => { if (template) setName(template.name); }, [template?.name]);

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/schedule/templates" aria-label="목록으로"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]">
          <ArrowLeft size={18} />
        </Link>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name !== template?.name) renameTemplate(id, name.trim()); }}
          className="flex-1 text-xl font-bold bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
        />
      </div>
      <TemplateEditor
        templateId={id}
        loadBlocks={loadBlocks}
        onAdd={addBlock}
        onUpdate={updateBlock}
        onDelete={deleteBlock}
      />
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인 + dev 서버**

```bash
npx tsc --noEmit && npm run build
npm run dev
```

`/schedule/templates` → 새 템플릿 생성 → 편집 페이지에서 블록 추가/편집/삭제 가능 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/schedule/template-editor.tsx src/app/schedule/templates/[id]/page.tsx
git commit -m "feat(schedule): add template editor page"
```

---

## Phase 7 — 템플릿 적용 흐름

### Task 18: `TemplateApplyModal` 컴포넌트

**Files:**
- Create: `src/components/schedule/template-apply-modal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { WeeklyTemplate, WeeklyTemplateBlock } from "@/types/database";

interface TemplateApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WeeklyTemplate[];
  loadBlocks: (id: string) => Promise<WeeklyTemplateBlock[]>;
  targetWeekStart: string;
  hasExistingPlans: boolean;
  onApply: (
    blocks: Array<{ day_of_week: number; start_time: string; end_time: string; title: string; color: string }>,
    mode: "overwrite" | "merge"
  ) => Promise<void>;
}

export function TemplateApplyModal({
  isOpen, onClose, templates, loadBlocks, targetWeekStart, hasExistingPlans, onApply,
}: TemplateApplyModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<WeeklyTemplateBlock[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) { setSelectedId(null); setBlocks([]); setConfirming(false); }
  }, [isOpen]);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setBlocks(await loadBlocks(id));
    if (!hasExistingPlans) {
      setConfirming(false); // 바로 적용 단계
    } else {
      setConfirming(true);
    }
  }

  async function apply(mode: "overwrite" | "merge") {
    if (!selectedId) return;
    await onApply(
      blocks.map((b) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        title: b.title,
        color: b.color,
      })),
      mode
    );
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={confirming ? "이 주에 이미 일정이 있어요" : `${targetWeekStart} 주에 템플릿 적용`}>
      {!selectedId && (
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">템플릿이 없어요. 먼저 만들어주세요.</p>
          ) : templates.map((t) => (
            <button key={t.id} type="button" onClick={() => handleSelect(t.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] hover:bg-gray-50 dark:hover:bg-[#1f242e] text-sm">
              {t.name}
            </button>
          ))}
        </div>
      )}

      {selectedId && !confirming && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{blocks.length}개 블록을 이 주에 추가합니다.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm">취소</button>
            <button type="button" onClick={() => apply("merge")}
              className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm">적용</button>
          </div>
        </div>
      )}

      {selectedId && confirming && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            기존 계획을 어떻게 처리할까요? (실제는 변경되지 않습니다.)
          </p>
          <div className="grid gap-2">
            <button type="button" onClick={() => apply("overwrite")}
              className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-medium">
              덮어쓰기 (기존 계획 전부 삭제 후 템플릿 적용)
            </button>
            <button type="button" onClick={() => apply("merge")}
              className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-medium">
              합치기 (기존 계획 유지하고 템플릿 추가)
            </button>
            <button type="button" onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm">취소</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/schedule/template-apply-modal.tsx
git commit -m "feat(schedule): add TemplateApplyModal"
```

---

### Task 19: 스케줄 페이지에 템플릿 적용 진입점 연결

**Files:**
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: import 및 훅**

```ts
import { TemplateApplyModal } from "@/components/schedule/template-apply-modal";
import { useTemplates } from "@/lib/hooks/use-templates";
```

```ts
const { templates, loadBlocks } = useTemplates();
const [applyOpen, setApplyOpen] = useState(false);
```

- [ ] **Step 2: 헤더 `📋` 버튼을 템플릿 메뉴로 교체**

`📋` Link를 버튼으로 바꾸고 작은 드롭다운(또는 바로 관리/적용 선택 모달)을 넣는다. 단순화를 위해: **두 개 버튼으로 분리**.

```tsx
<Link href="/schedule/templates"
  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 text-xs tap-press"
  aria-label="템플릿 관리">
  📋 관리
</Link>
<button
  type="button"
  onClick={() => setApplyOpen(true)}
  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-primary-300 text-primary-600 dark:text-primary-300 text-xs tap-press"
  aria-label="템플릿 적용">
  📥 적용
</button>
```

- [ ] **Step 3: 모달 렌더**

```tsx
<TemplateApplyModal
  isOpen={applyOpen}
  onClose={() => setApplyOpen(false)}
  templates={templates}
  loadBlocks={loadBlocks}
  targetWeekStart={weekStart}
  hasExistingPlans={schedule.plans.length > 0}
  onApply={(blocks, mode) => schedule.applyTemplate(blocks, weekStart, mode)}
/>
```

- [ ] **Step 4: 빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 5: 수동 검증 (dev 서버)**

1. `/schedule/templates` → 템플릿 생성 → 블록 3개 추가
2. `/schedule` → `📥 적용` → 템플릿 선택 → (빈 주면) 바로 적용 확인
3. 기존 계획이 있는 주로 이동 → 적용 모달에서 덮어쓰기/합치기 둘 다 확인
4. 적용 후 실제(actuals) 컬럼은 변화 없음을 확인

- [ ] **Step 6: 커밋**

```bash
git add src/app/schedule/page.tsx
git commit -m "feat(schedule): wire template apply flow into schedule page"
```

---

## Phase 8 — 통합 검증 및 마무리

### Task 20: 전체 빌드 + 테스트

- [ ] **Step 1: 타입 체크 + 린트 + 테스트 + 빌드**

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```

Expected: 모두 통과.

- [ ] **Step 2: 체크리스트 (수동 검증)**

- [ ] 주간 뷰에 이벤트 스트립 표시 (데스크톱)
- [ ] 주간 뷰 계획 컬럼 빈칸 클릭 → 날짜/시간 미리 채워진 BlockForm, 실제 체크 해제
- [ ] 주간 뷰 실제 컬럼 빈칸 클릭 → 같은 흐름, 실제 체크 활성화
- [ ] 상단 `+ 블록` 버튼 → 오늘 날짜로 BlockForm
- [ ] 상단 `+ 이벤트` 버튼 → EventForm (추가 모드)
- [ ] 월간 뷰 날짜 탭 → EventListModal (목록 + 편집 + 새로 추가)
- [ ] 월간 뷰 `+ 새 이벤트` → 해당 날짜로 EventForm 오픈
- [ ] 이벤트 편집 → EventForm에 기존 값 채워짐, 삭제 버튼 동작
- [ ] `📋 관리` → `/schedule/templates` 이동, 목록/생성/삭제
- [ ] 템플릿 편집: 요일별 블록 추가/편집/삭제
- [ ] `📥 적용`: 빈 주에 적용 시 바로 적용, 기존 계획 있는 주는 덮어쓰기/합치기
- [ ] 적용 후 실제(actuals)는 건드리지 않음
- [ ] 일요일 시작 유지 확인 (주간 뷰 일→토 순서)

- [ ] **Step 3: 최종 커밋 (변경 사항 없으면 스킵)**

```bash
git status
# 변경이 있다면
git add -A && git commit -m "chore: finalize schedule redesign"
```

---

## Out of Scope / V2 참고

- **태블릿/모바일 이벤트 스트립 축약 표시**: Task 13에서 `visibleCount === 7` 조건으로 lg+ 에만 렌더. 모바일 대응은 V2.
- **반복 이벤트** (매주 스터디 등): 별도 스펙 필요.
- **현재 주를 템플릿으로 저장** (역방향 생성): V2.
- **체중 메뉴**: 별도 스펙 (`2026-04-15-weight-menu-design.md` 예정).

## Risk / Notes

- **Supabase 마이그레이션 적용**: `00009_weekly_templates.sql` 은 로컬 `supabase db push` 나 대시보드 SQL Editor에서 수동 적용 필요. 자동 실행 단계는 계획에 포함되지 않음 — 프로젝트 관행 따름.
- **데모 데이터 폴백**: 현재 데모 데이터에는 템플릿이 없다. `useTemplates`는 에러 시 `[]`로 폴백하므로 데모 모드에서 "템플릿 없음" 상태만 노출된다. 스펙대로 허용.
- **실제(actuals) 직접 추가 시 `plan_id`**: `addActual`은 `plan_id` 없이 insert; `is_from_plan=false` 기본값 유지.
- **날짜 범위 validation**: `EventForm` 에서 `endDate < startDate` 시 submit 차단 (inline). 토스트 메시지는 없음 — V2에서 UX 개선 여지.
- **RLS와 demo 사용자**: 현재 앱은 `FIXED_USER_ID` 기반. `auth.uid()` 정책 하에서는 실제 Supabase 연동 시만 유효. 로컬 데모에서는 실패 시 `[]` 폴백.
