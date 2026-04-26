# 통독·묵상 트래킹 — 설계

날짜: 2026-04-26

## 배경

베이직 페이지에 매일 통독(100일 사이클)과 묵상(시편 150편 사이클) 트래킹을 추가한다. 사용자는 시작일을 한 번 설정하고, 자동 day/사이클 계산, 사이클 완료 시 자동 1일차 복귀를 원한다.

## 요구사항

1. 통독 — 매일 정해진 범위(예: "창 1-10, 시 1-3")의 각 장을 행 단위로 체크. 카드 안에서 X/Y장 (Z%) 진행률 표시.
2. 묵상 — 매일 시편 1편씩(1→150→1 사이클). "오늘의 본문: 시편 N편" 텍스트 + 단일 체크 토글.
3. 시작일을 사용자가 설정. 시작일 미설정 시 카드는 안내 + 설정 링크.
4. 사이클 종료 후 별도 설정 없이 자동 1일차 복귀(`mod` 연산).
5. 베이직 주/월 통계에 두 카드 결과(0/1)가 일반 베이직 항목처럼 합산.

## 데이터 모델

### 새 테이블

#### `bible_reading_logs`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID | |
| `date` | DATE | UNIQUE(user_id, date) |
| `total_chapters` | INT | 그날 범위 총 행 수 |
| `checked_chapters` | INT | 체크된 행 수 |
| `completed_at` | TIMESTAMPTZ | 마지막 행이 체크되어 100% 도달한 시각 (NULL 가능) |

일별 진행률 빠른 조회/통계용 1 row.

#### `bible_reading_chapter_checks`
| 컬럼 | 타입 |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID |
| `date` | DATE |
| `ord` | INT |
| `label` | TEXT |
| `checked_at` | TIMESTAMPTZ |

UNIQUE(user_id, date, ord). 행이 존재하면 체크된 것으로 간주(언체크는 row 삭제).

#### `meditation_logs`
| 컬럼 | 타입 |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID |
| `date` | DATE |
| `psalm_number` | INT |
| `completed` | BOOLEAN |
| `completed_at` | TIMESTAMPTZ |

UNIQUE(user_id, date).

### `user_settings` 컬럼 추가

- `bible_reading_start_date DATE NULL`
- `meditation_start_date DATE NULL`

### 마이그레이션

`supabase/migrations/00023_bible_reading_meditation.sql` — 단일 사용자 모드(00013)에 맞춰 RLS 비활성.

## 100일 통독 매핑

`src/lib/bible/reading-plan.ts` — `dayChapters: string[][]` 길이 100. 각 원소는 그날의 행 라벨 배열(예: `["창세기 1", "창세기 2", ..., "시편 3"]`).

특수 케이스:
- 80~83일차 시 119편: `["시편 119:1-40"]`처럼 한 행으로 처리.
- 98일차 "요 1, 2, 3": 요한1서/요한2서/요한3서로 해석(신약 끝부분 컨텍스트).

런타임 파서 없이 미리 펼친 상수로 두어 정합성 보장.

## 사이클 계산

`src/lib/bible/cycle.ts`:
- `getReadingDay(today, start) → { day: 1..100, cycle: 1.. } | null`
- `getMeditationPsalm(today, start) → { psalm: 1..150, cycle: 1.. } | null`
- 시작일이 미래거나 미설정이면 `null`.
- 공식: `diff = floor((today - start) / 86400_000)`, `day = (diff mod L) + 1`, `cycle = floor(diff / L) + 1`.

## 컴포넌트·훅

### 훅
- `src/lib/hooks/use-meditation.ts` — `{ psalm, cycle, completed, loading, hasStartDate, isFuture, toggle() }`.
- `src/lib/hooks/use-bible-reading.ts` — `{ day, cycle, chapters, checkedSet, total, checkedCount, percent, loading, hasStartDate, isFuture, toggleChapter(ord) }`.

### 컴포넌트
- `src/components/basics/meditation-card.tsx` — 헤더 "오늘의 본문 · 시편 N편 (M회독)" + 단일 체크 토글 또는 안내.
- `src/components/basics/bible-reading-card.tsx` — 헤더 "통독 N일차 (M회독) · X/Y장 · Z%" + 진행률 바 + 행 리스트(체크박스+라벨) 또는 안내.

베이직 페이지 최상단(영성 카테고리 위)에 묵상 → 통독 순으로 고정 노출.

## 시작일 설정 UI

`src/app/basics/settings/page.tsx`에 새 섹션 "통독 / 묵상" 추가:
- "통독 1일차 시작일" date input (저장 즉시 반영).
- "묵상 1일차 시작일" date input.
- 시작일을 비우면 카드 안내 모드.
- `useSettings` 훅 또는 새 `useReadingSettings` 훅으로 `user_settings` 컬럼 read/write.

## 베이직 통계 합산

기존 `use-basics-stats`/`use-weekly-stats`/`use-monthly-stats`/`use-basics-category-trend`에서 일별 데이터를 만드는 시점에:
- 시작일이 설정되어 있고 그날이 시작일 이후인 경우에 한해서만 가상 항목 2개를 추가.
- 통독 가상 항목: `completed = (checked_chapters === total_chapters && total_chapters > 0)`.
- 묵상 가상 항목: `completed = meditation_logs.completed`.
- 카테고리는 `spiritual`로 합쳐 baseline 카테고리 차트에도 반영.

미설정 항목은 그날 분모/분자에서 제외하여 손실되지 않게 한다.

## 수용 기준

- [ ] 마이그레이션이 적용되고 user_settings 두 컬럼이 추가됨.
- [ ] 시작일 미설정 → 카드에 안내 + 설정 링크 표시.
- [ ] 시작일 설정 → 묵상은 (오늘-시작일) mod 150 기반 시편 표시 + 토글 동작.
- [ ] 시작일 설정 → 통독은 (오늘-시작일) mod 100 기반 범위 표시 + 행별 체크 + X/Y/Z% 갱신.
- [ ] 사이클이 완료되면 다음 날 자동으로 1일차/1편으로 복귀.
- [ ] 통독·묵상 결과가 베이직 주/월 통계에 합산.
- [ ] 100일 통독 매핑이 사용자가 제공한 표와 1:1 일치.
- [ ] 모바일 44px 터치 타겟 유지, 다크 모드 호환, 외부 차트 라이브러리 미사용.

## 비목표

- 절(verse) 단위 체크(시편 119편 분할만 예외).
- 다른 통독표 선택 옵션(현재는 100일 표 고정).
- 묵상 노트/메모 입력.
- 로그인된 다중 사용자 시나리오(단일 사용자 모드 유지).
