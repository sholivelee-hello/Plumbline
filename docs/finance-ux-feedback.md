# 재정 섹션 UX 피드백 반영 계획

> 작성일: 2026-04-17
> UX 평가 최종 점수: 95/100 (10차 라운드)
> 사용자 테스트: 30대 여성 3명 시뮬레이션 완료

---

## 현재 완료된 것 (이번 세션)

- 칩 기반 빠른 입력 UX (4그룹 색상 코딩)
- 금액 자동 콤마 포매팅 (inputMode="numeric")
- Enter 키 플로우 (내역→금액→저장)
- Shake 유효성 검증 애니메이션
- 칩 폼 입장/퇴장 애니메이션
- 수입 모달 + 직접 입력 모달 (label-htmlFor 연결)
- Modal: useId(), role="alertdialog", aria-describedby
- ConfirmDialog: 삭제 확인 + 동시삭제 방지
- Toast 시스템 (success/info/error, error에 role="alert")
- 예산 페이지 인라인 편집 + 디바운스 저장 + "저장됨" 인디케이터
- 예산 vs 실적 비교 프로그레스 바 (3단계 색상)
- 출납부 날짜별 그룹핑 + 예산 게이지
- 3페이지 간 크로스 네비게이션 (ChevronRight)
- 44px 터치 타겟 전 요소 적용
- 글로벌 focus-visible 스타일
- Skeleton 로딩 + EmptyState
- 다크모드 전면 지원
- prefers-reduced-motion 대응

---

## P0: 즉시 반영 필요

### 1. "식비" 카테고리 추가

**문제**: 3명 전원 지적. 가계부에서 가장 빈번한 지출인 식비 카테고리가 없음. 현재 "생필품(grocery)"에 억지로 넣거나 "분류 없음"으로 기록해야 함.

**수정 대상 파일**: `src/lib/faith-budget-config.ts`

**구체적 변경**:
- `necessity` (필요사항) 그룹에 `food` (식비) 항목 추가
- 기존 `grocery` (생필품)는 유지하되, 식비와 분리
- 추천 배치:
  ```
  necessity.items = [
    { id: "food", title: "식비" },         // 신규 추가
    { id: "grocery", title: "생필품" },     // 기존 유지
    { id: "transport", title: "교통비" },
    { id: "savings", title: "저축" },
    { id: "leisure", title: "여가선용비" },
    { id: "allowance", title: "개인 용돈" },
  ]
  ```

**영향 범위**:
- `faith-budget-config.ts` — 항목 추가
- 데모 데이터 (`src/lib/demo-data.ts`) — 식비 샘플 데이터 추가
- DB의 기존 데이터는 `account_id` 기반이므로 기존 데이터에 영향 없음

---

### 2. 기록 수정(편집) 기능 추가

**문제**: 현재 삭제만 가능. 금액이나 메모를 잘못 입력했을 때 삭제 후 재입력해야 함. 박하은: "실수가 잦은 저한테는 스트레스예요."

**수정 대상 파일**:
- `src/lib/hooks/use-cashbook.ts` — `updateEntry` 함수 추가
- `src/app/finance/page.tsx` — 오늘 기록 항목 탭 시 편집 모드
- `src/app/finance/cashbook/page.tsx` — 출납부 항목 탭 시 편집 모드

**구체적 변경**:
- `use-cashbook.ts`에 `updateEntry(id, fields)` 함수 추가:
  ```typescript
  const updateEntry = useCallback(async (
    id: string,
    fields: { description?: string; amount?: number; account_id?: string | null }
  ): Promise<{ ok: boolean; error?: string }> => {
    // supabase.from("finance_transactions").update(fields).eq("id", id)
  }, [load]);
  ```
- 항목 행을 탭하면 인라인 편집 모달 또는 인라인 폼 열림
- 편집 모달: 기존 값 프리필, 금액/메모/카테고리 수정 가능
- 저장 시 토스트 피드백 ("수정됨")

**UX 제안**:
- 항목 행 탭 → 편집 모달 (삭제 버튼은 별도 유지)
- 또는 항목 행 길게 누르기(long press) → 편집/삭제 선택 메뉴

---

## P1: 다음 스프린트

### 3. 카테고리별 지출 분석/요약

**문제**: 김서연 "카테고리별 총합을 보고 싶다", 이지은 "시각적 데이터가 없다". 데이터를 넣기만 하고 인사이트를 얻을 수 없음.

**구현 방안**:
- 출납부 페이지 상단에 "요약/상세" 탭 전환 추가
- 요약 탭: 4그룹별 지출 합산 + 비율 바 또는 도넛 차트
- 또는 별도 `/finance/analysis` 페이지 신설
- `use-cashbook.ts`의 `actualByBudgetKey` 데이터를 활용하면 그룹별 합산은 이미 가능

**수정 대상 파일**:
- `src/app/finance/cashbook/page.tsx` — 요약 뷰 추가
- 또는 `src/app/finance/analysis/page.tsx` — 신규 페이지

---

### 4. 예산안 "총 수입 → 자동 비율 배분" 기능

**문제**: 박하은 "총 수입 넣으면 자동으로 추천 금액 나오면 진짜 편할 텐데". 비율 가이드(35~40% 등)가 이미 있지만 수동 계산 필요.

**구현 방안**:
- 예산안 페이지 상단에 "이번 달 총 수입" 입력 필드 추가
- 수입 입력 시 각 그룹의 percentGuide 기반 추천 금액 자동 계산
- "추천 적용" 버튼으로 한번에 채우기 (기존 값 덮어쓰기 확인)
- `useFaithBudget` 훅에 `applyRecommendation(totalIncome)` 함수 추가

**수정 대상 파일**:
- `src/app/finance/budget/page.tsx` — 총 수입 입력 UI + 추천 적용 버튼
- `src/lib/hooks/use-faith-budget.ts` — 추천 금액 계산 로직
- `src/lib/faith-budget-config.ts` — percentGuide를 파싱 가능한 숫자로 (현재 문자열)

---

### 5. 출납부 필터 기능

**문제**: 김서연 "지출만 따로 보거나, 특정 카테고리만 필터링해서 보고 싶다."

**구현 방안**:
- 출납부 상단에 필터 칩: "전체 / 수입 / 지출" + 카테고리 필터
- `entries` 배열에 클라이언트 사이드 필터 적용
- 필터 상태: `useState<{ type?: "income"|"expense"; groupId?: string }>`

**수정 대상 파일**:
- `src/app/finance/cashbook/page.tsx` — 필터 UI + 로직

---

## P2: 개선사항 (폴리시)

### 6. 다크모드 날짜 구분선 강화

**문제**: 이지은 "출납부에서 날짜별 섹션 헤더가 카드 배경과 거의 같은 톤"

**변경**: `cashbook/page.tsx`의 날짜 헤더 배경색을 다크모드에서 더 밝게 조정
```
현재: dark:bg-[#1a1f29]
변경: dark:bg-[#1e2430] 또는 border-b-2 추가
```

### 7. EmptyState에 일러스트 추가

**문제**: 이지은 "아이콘+텍스트만 있어 시각적 매력도가 낮음"

**변경**: EmptyState 컴포넌트에 SVG 일러스트 옵션 추가. 최소한 재정 메인의 "오늘 기록 없음"에 간단한 일러스트 배치.

### 8. 예산안 텍스트 크기 조정

**문제**: 박하은 "글씨가 좀 작아요... 잘 안 보여요"

**변경**: `budget/page.tsx`의 예산/실적 비교 텍스트를 `text-[11px]` → `text-xs` (12px)로 상향. 다크모드 `text-gray-400`의 대비비 확인.

### 9. 커스텀 카테고리 지원

**문제**: 사용자가 언급한 "의무사항/필요사항 외에 다른 카테고리가 있을 수도 있다"는 점. 김서연도 "카테고리 커스터마이징이 안 되면 불편"이라고 함.

**구현 방안**:
- 설정 페이지에서 카테고리 추가/수정/삭제
- `faith-budget-config.ts`의 하드코딩된 구조를 DB 또는 localStorage 기반으로 전환
- 그룹(4분류) 구조는 유지하되, 각 그룹 내 항목을 사용자가 편집 가능하게

**수정 대상 파일**:
- `src/lib/faith-budget-config.ts` — 동적 구조로 전환
- `src/lib/hooks/use-faith-budget.ts` — 동적 항목 로드
- 새 페이지 또는 설정 내 UI 필요

---

## 관련 파일 맵

| 영역 | 파일 경로 |
|------|-----------|
| 재정 메인 | `src/app/finance/page.tsx` |
| 월별 출납부 | `src/app/finance/cashbook/page.tsx` |
| 믿음의 예산안 | `src/app/finance/budget/page.tsx` |
| 데이터 훅 | `src/lib/hooks/use-cashbook.ts` |
| 예산 훅 | `src/lib/hooks/use-faith-budget.ts` |
| 카테고리 설정 | `src/lib/faith-budget-config.ts` |
| 데모 데이터 | `src/lib/demo-data.ts` |
| Modal | `src/components/ui/modal.tsx` |
| ConfirmDialog | `src/components/ui/confirm-dialog.tsx` |
| Toast | `src/components/ui/toast.tsx` |
| 글로벌 CSS | `src/app/globals.css` |
| Tailwind 설정 | `tailwind.config.ts` |
| DB 타입 | `src/types/database.ts` |
