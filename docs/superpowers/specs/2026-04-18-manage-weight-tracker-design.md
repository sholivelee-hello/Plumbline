# 관리 탭 — 체중 트래커 설계

- **작성일**: 2026-04-18
- **작성자**: shinhee4915 (+ Claude 브레인스토밍)
- **브랜치**: feature/finance-redesign (또는 별도 feature 브랜치로 분기)
- **상태**: 승인 대기

## 1. 개요

개인 라이프 매니지먼트 PWA Plumbline에 **"관리"** 탭을 신규로 추가한다. 이 탭은 현재 시점 기준 체중 트래커 단일 기능을 담고, 네비게이션에서 기존 "홈 · 베이직 · 일정 · 재정" 뒤에 다섯 번째 탭으로 자리한다.

사용자는 자유로운 시점에 체중을 입력(주 1회 리듬이지만 강제하지 않음)하고, 목표 체중/데드라인을 설정하여 감량 진행 상황을 추적한다. 모든 UI는 단일 스크롤 페이지에 배치되어 한눈에 "현재 vs 목표", 추세 그래프, 기간별 비교 수치, 누적 기록을 볼 수 있다.

## 2. 목표 및 비목표

### 2.1 목표
- 현재 체중, 목표 체중, 둘의 차이를 한 화면 최상단에서 즉시 확인
- 측정 기록을 꺾은선 그래프로 시각화 (전체 / 1M / 3M / 6M / 1Y 레인지 선택)
- 그래프에 목표 체중 점선을 오버레이
- "1주 / 1달 / 3달 / 1년 전 대비" 변화량을 수치로 제공
- 기록 리스트에서 "직전 기록 대비" 증감을 색상(감량=파랑, 증량=빨강)으로 표시
- 잘못된 입력을 수정/삭제할 수 있는 경로 제공

### 2.2 비목표 (YAGNI)
- 미래 체중 예측선/추세 분석
- 목표 변경 이력 추적
- 체지방률·근육량 등 추가 지표
- 체중계 블루투스 연동
- 데이터 export (CSV 등)
- 푸시 알림 리마인더
- 체중 사진/메모 첨부

## 3. 정보 구조 & 네비게이션

### 3.1 라우팅
- URL: `/manage`
- 파일: `src/app/manage/page.tsx` (client component, 재정 허브와 동일 패턴)
- 서브 페이지 없음 (단일 스크롤 페이지)

### 3.2 네비게이션
- `src/components/ui/sidebar.tsx`와 `src/components/ui/tab-nav.tsx`의 `navItems`/`tabs` 배열에 항목 추가:
  ```ts
  { href: "/manage", label: "관리", icon: Scale }
  ```
- 위치: 재정 다음 (마지막)
- 아이콘: `lucide-react`의 `Scale`
- 모바일 탭: 4개 → 5개. 기존 `max-w-lg mx-auto justify-around flex` 레이아웃으로 자동 재배분. iPhone SE(320px) 기준 탭당 ~64px 폭이 확보되어 44px 터치 타겟 유지 가능.

### 3.3 페이지 헤더
- `PageHeader`(기존 컴포넌트) 재사용, 제목 `"관리"`
- 헤더 우측: 톱니 버튼(`Settings` icon) → 목표 설정 바텀시트 오픈

## 4. 데이터 모델 (Supabase)

### 4.1 테이블: `weight_entries` (체중 기록)
```sql
create table weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,          -- 고정 FIXED_USER_ID
  weighed_on  date not null,          -- 측정 날짜
  weight_kg   numeric(5,1) not null,  -- 소수점 1자리 (0.0 ~ 999.9)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index weight_entries_user_date_idx
  on weight_entries (user_id, weighed_on desc, created_at desc);
```
- `weighed_on`은 PK가 아님 → 같은 날 여러 번 입력 가능
- 정렬: `weighed_on desc` 동률 시 `created_at desc`로 입력 순서 유지

### 4.2 테이블: `weight_goal` (목표 설정)
```sql
create table weight_goal (
  user_id     text primary key,
  target_kg   numeric(5,1) not null,
  deadline    date not null,
  updated_at  timestamptz default now()
);
```
- 1인 앱이라 `user_id`가 PK, upsert로 단일 레코드 유지
- 목표 수정 이력은 남기지 않음

### 4.3 파생값 (DB 저장하지 않음, 훅에서 계산)
| 이름 | 정의 |
|---|---|
| `currentKg` | 가장 최근 `weight_entries.weight_kg` |
| `startKg` | 가장 오래된 `weight_entries.weight_kg` |
| `lostKg` | `startKg - currentKg` |
| `remainKg` | `currentKg - targetKg` |
| `daysLeft` | `deadline - today` (일 단위) |
| `weeklyPace` | `remainKg / (daysLeft / 7)` · **반환 규약**: `daysLeft <= 0` 또는 `remainKg <= 0`(이미 달성)인 경우 `null` 반환. UI는 7.2의 배지로 치환 |

### 4.4 훅 구조
- 파일: `src/lib/hooks/use-weight.ts`
- 반환값: `{ entries, goal, loading, stats, refresh }`
  - `stats`: `{ currentKg, startKg, lostKg, remainKg, daysLeft, weeklyPace, comparisons: {w1, m1, m3, y1} }`
  - `comparisons`의 각 항목: `{ diffKg: number | null, refDate: string | null, reason?: "insufficient" }`
- 메서드: `addEntry(weight, date)`, `updateEntry(id, weight, date)`, `deleteEntry(id)`, `setGoal(targetKg, deadline)`

## 5. UI 컴포넌트

### 5.1 히어로 카드 — `src/components/manage/weight-hero.tsx`
- 최상단 큰 카드, 현재 체중을 `text-4xl font-bold tabular-nums`로 표시
- 하단 3분할 서브 metric: **목표 / 차이 / 시작**
  - "차이" = `remainKg`: 음수는 파란색(감량 진행 중), 양수는 빨간색(목표 초과)
- 데드라인 인사이트 한 줄:
  - 정상: `🎯 {deadlineLabel}까지 {daysLeft}일 남음 · 주 {weeklyPace}kg 필요`
  - 달성: `🎉 목표 달성! {overAchievementKg}kg 초과 감량` (필요 페이스 자리)
  - 데드라인 지남: `🕐 데드라인 지남 · 목표 재설정 필요` (노란 배지)

### 5.2 그래프 카드 — `src/components/manage/weight-chart.tsx`
- **라이브러리**: `recharts` (`package.json` 기존 의존성)
- 상단 세그먼트 탭: `[전체 | 1M | 3M | 6M | 1Y]` — 5개 버튼, 클릭 시 필터링된 데이터로 재렌더
  - "전체": 가장 오래된 기록일부터 오늘까지 모두
  - "1M/3M/6M/1Y": **기준점은 항상 "오늘"**, `오늘 - N개월 ~ 오늘`. (마지막 기록이 한참 전이어서 해당 레인지에 데이터가 없어도 빈 그래프로 유지. 의도된 동작)
- 날짜 라벨 포맷은 프로젝트 내 기존 날짜 유틸 재사용 (신규 포맷 헬퍼 도입 금지)
- 구조: `<LineChart><Line dataKey="weight_kg" /><ReferenceLine y={target_kg} strokeDasharray="4 4" /></LineChart>`
- 축 설정:
  - Y축: 자동 스케일 + `±2kg` 패딩 (평평한 데이터여도 시각적 변화 살림)
  - X축: 월 단위 라벨 (`M월` 또는 `'YY.MM`)
- 점(`dot={true}`), 호버 툴팁: `YYYY-MM-DD · 67.3 kg`
- 기록 1개 이하: 점 하나 + 안내 문구 `"기록이 더 쌓이면 그래프가 그려져요"`

### 5.3 비교 수치 카드 — `src/components/manage/weight-comparisons.tsx`
- **2×2 그리드**, 네 개 칸: `1주 전 / 1달 전 / 3달 전 / 1년 전`
- 각 칸 표시:
  - 제목 (회색 작은 글씨)
  - 차이값: `-0.5 kg` (감량=파란색, 증량=빨간색, 음수 기호 유지)
  - 실제 비교 기준일: `M/D 기준` (작은 회색 글씨)
- 기록 부족 시: `—` + `"기록 부족"` 회색 문구 (이하 "5.6 비교 탐색 규칙" 참조)

### 5.4 기록 리스트 — `src/components/manage/weight-log-list.tsx`
- 위에서 아래로 최신순 (`weighed_on desc`, `created_at desc`)
- 각 row:
  ```
  M/D (요일)  67.3 kg   -0.5↓
  ```
  - 차이: 리스트 정렬 기준 바로 다음 row(시간상 직전 기록)와 비교. **같은 날짜 동률일 경우 `created_at desc` 기준 다음 항목과 비교**
  - 감량: 파란색 + `↓`, 증량: 빨간색 + `↑`
  - 첫 기록(비교 대상 없음): `—` 회색
- 각 row 탭 → 수정/삭제 바텀시트 (5.2 인터랙션)
- 전체 렌더링 (현재 스케일에선 페이지네이션 불필요)

### 5.5 페이지 조립 순서 (위→아래)
1. `PageHeader` (제목 "관리" + 우측 ⚙︎)
2. `WeightHero`
3. `WeightChart`
4. `WeightComparisons`
5. `WeightLogList` (섹션 제목 "📅 기록")
6. `Fab` (우하단, `Plus` 아이콘) — 기록 입력 트리거

### 5.6 비교 탐색 규칙 (Q4-A 결정 반영)
- "가장 가까운 기록" 정책: 타깃 날짜(`오늘 - N일`)에서 가까운 순으로 탐색
- 허용 오차:
  - 1주 비교: ±7일
  - 1달 비교: ±14일
  - 3달 비교: ±30일
  - 1년 비교: ±30일
- 허용 오차 내 기록이 없으면 `{diffKg: null, reason: "insufficient"}` → UI는 `—`

## 6. 인터랙션

### 6.1 체중 입력 바텀시트
- 파일: `src/components/manage/weight-input-sheet.tsx`
- 트리거: 우하단 FAB
- 기존 `BottomSheet` 컴포넌트 재사용
- 필드:
  - 체중: `<input type="number" inputMode="decimal" step="0.1" placeholder="67.3" />` 큼직하게
  - 날짜: `<input type="date" />` 기본값=오늘, max=오늘
- 저장 버튼 활성화 조건: `20.0 <= weight_kg <= 300.0 && weighed_on <= today`
- 저장 성공: Supabase insert → 토스트 `"67.3kg 기록됨"` → 시트 닫힘 → 훅 refresh

### 6.2 기록 수정/삭제 바텀시트
- 트리거: 리스트 row 탭
- 동일한 `WeightInputSheet` 컴포넌트를 `mode: "edit"` prop으로 재사용
- 기존 값 프리필
- 버튼 2개:
  - **저장** (기본 색): update → 토스트 `"기록이 수정됨"`
  - **삭제** (빨간 텍스트): 기존 `ConfirmDialog` 띄움 → 확인 시 delete → 토스트 `"기록이 삭제됨"`

### 6.3 목표 설정 바텀시트
- 파일: `src/components/manage/weight-goal-sheet.tsx`
- 트리거: 페이지 헤더 우측 ⚙︎
- 필드:
  - 목표 체중: `<input type="number" step="0.1" />` (20.0~300.0)
  - 달성 목표일: `<input type="date" />` (min=내일)
- 실시간 미리보기 (입력 중에도 갱신): `"지금 {currentKg}kg → {remainKg}kg 감량 / {daysLeft}일 / 주 {weeklyPace}kg 필요"`
- 저장: `weight_goal` upsert → 토스트 `"목표가 저장되었어요"` → 시트 닫힘

### 6.4 빈 상태 (Empty States)
| 상황 | 표시 |
|---|---|
| 기록 0개 + 목표 X | 히어로 대신 "첫 체중을 기록해보세요" CTA 카드, 그래프·비교·리스트 영역 숨김 |
| 기록 1개, 목표 X | 히어로(현재만), "목표를 설정하면 진행률이 보여요" 힌트, 그래프 점 1개, 비교 전부 `—` |
| 기록 여러 개, 목표 X | 히어로의 "목표" 자리에 `"목표 설정"` 링크 칩, 그래프 목표 점선 없음 |
| 정상 | 전부 표시 |

## 7. 엣지 케이스 & 검증

### 7.1 입력 검증
| 필드 | 규칙 |
|---|---|
| `weight_kg` | `20.0 <= x <= 300.0` (범위 외 → 토스트 "현실적인 값을 입력해주세요") |
| `weighed_on` | `x <= today` (미래 날짜 차단) |
| `target_kg` | `20.0 <= x <= 300.0` |
| `deadline` | `x > today` (과거 데드라인 차단) |

### 7.2 데이터 이상 케이스
| 상황 | 처리 |
|---|---|
| 데드라인이 이미 지났는데 목표 미달성 | 히어로 하단을 노란 배지 `"🕐 데드라인 지남 · 목표 재설정 필요"`로 치환 |
| 이미 목표 달성 (`currentKg <= targetKg`) | `"🎉 목표 달성! {over}kg 초과 감량 · 유지중"` |
| 차트가 평평한 값 연속 | Y축 스케일 `min - 2, max + 2` 로 패딩 |
| 같은 날 여러 기록 | 그래프는 X축 같은 자리에 점 중첩, 리스트는 `created_at desc`로 분리 표시 |
| Supabase 실패 | 기존 `ToastProvider`로 "저장 실패" 에러 토스트, 옵티미스틱 업데이트는 롤백 |

## 8. 테스트 전략

### 8.1 유닛 테스트 — `vitest`
- `src/lib/__tests__/weight-utils.test.ts`
  - `calcComparison(entries, daysAgo, toleranceDays)`: 가장 가까운 기록 탐색
    - 엣지: 기록 0개 / 1개 / 동률 / 허용 오차 밖
  - `calcWeeklyPace(current, target, deadline)`: 주간 필요 감량 속도
    - 엣지: 데드라인=오늘, 데드라인<오늘, 이미 달성
  - `filterByRange(entries, range)`: 레인지탭별 데이터 필터
    - 엣지: 빈 entries, 모든 기록이 레인지 밖
- 모든 date 계산은 `Date` 기반이지만 로컬 타임존 함정을 피하기 위해 `YYYY-MM-DD` 문자열과 `Date` 변환을 명시적 유틸로 분리

### 8.2 컴포넌트 테스트 — `@testing-library/react`
- `src/components/manage/__tests__/weight-hero.test.tsx`
  - 네 가지 상태별 렌더 (정상 / 목표달성 / 데드라인지남 / 기록없음)
  - 파란/빨간 색 클래스 검증
- `src/components/manage/__tests__/weight-comparisons.test.tsx`
  - 각 칸의 정상 / 기록부족 분기
  - 기준일 텍스트 정확성

### 8.3 수동 QA 체크리스트
- 체중 입력 → 히어로·그래프·리스트·비교 모두 즉시 반영
- 수정 후 이전 값이 사라지고 새 값으로 업데이트됨
- 삭제 후 해당 기록이 그래프/리스트/비교에서 즉시 제외됨
- 목표 설정 → 히어로 차이·그래프 점선·필요 페이스 모두 재계산
- 레인지탭 전환 시 빈 데이터에서도 UI 깨짐 없음
- 모바일 360px 폭에서 탭 5개 가독성 확인
- 다크모드에서 파란/빨간 색 대비 유지 확인

## 9. 구현 파일 요약

### 새로 만들 파일
- `src/app/manage/page.tsx`
- `src/components/manage/weight-hero.tsx`
- `src/components/manage/weight-chart.tsx`
- `src/components/manage/weight-comparisons.tsx`
- `src/components/manage/weight-log-list.tsx`
- `src/components/manage/weight-input-sheet.tsx`
- `src/components/manage/weight-goal-sheet.tsx`
- `src/lib/hooks/use-weight.ts`
- `src/lib/weight-utils.ts`
- `src/lib/__tests__/weight-utils.test.ts`
- `src/components/manage/__tests__/weight-hero.test.tsx`
- `src/components/manage/__tests__/weight-comparisons.test.tsx`
- Supabase 마이그레이션: `supabase/migrations/YYYYMMDDHHMMSS_add_weight_tables.sql`

### 수정할 파일
- `src/components/ui/sidebar.tsx` — navItems에 `관리` 추가
- `src/components/ui/tab-nav.tsx` — tabs에 `관리` 추가

## 10. 결정 이력 (브레인스토밍 요약)

| 질문 | 결정 | 근거 |
|---|---|---|
| Q1. 관리 탭 범위 | 몸무게만, 탭 라벨 "관리", URL `/manage` | 당장 다른 건강 지표 계획 없음, 네이밍은 추상 유지 |
| Q2. 입력 규칙 | 자유 입력, 날짜만 기록 | 주 1회 리듬은 강제하지 않음, 시간 정밀도 불필요 |
| Q3. 목표 설정 | 목표 + 데드라인 + 필요 페이스 | 동기부여를 위한 정량 가이드 원함 |
| Q4. 비교 기준 누락 | 가장 가까운 기록과 비교, 실제 날짜 병기 | 정직성 + 실용성 균형 |
| Q5. 수정/삭제 | 둘 다 가능, 리스트 row 탭 | 오타 복구 편의 |
| 화면 구성 | 단일 스크롤 페이지 | 정보량이 한 화면에 들어오고 재정 허브와 일관성 |
