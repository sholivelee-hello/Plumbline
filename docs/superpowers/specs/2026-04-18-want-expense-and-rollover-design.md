# 요망사항 지출 재분류 & 월간 이월 — 디자인 스펙

**작성일**: 2026-04-18
**상태**: Draft → Review
**범위**: 재정 앱 (`/finance/*`) 의미론 개선
**적용 시작**: 2026-05 (5월부터 이월 활성화)

---

## 1. 배경 (Why)

### 현재 문제
1. **요망사항(Want) 그룹이 "지출"이 아닌 "저축"처럼 취급됨**
   - `finance_wishlist.saved_amount`에 사용자가 "따로 빼둔" 금액이 기록되지만, 이것이 `finance_transactions` 지출로 잡히지 않아 월 지출 총계·예산 대비 실적에서 누락됨.
   - 사용자 멘탈 모델: *"요망사항에 쓸 돈을 떼어놓는 것 = 그 순간의 지출"*. (필요사항의 "저축" 항목이 이미 지출로 취급되는 것과 동일한 논리)

2. **월말에 아껴 쓴 차액이 증발함**
   - 의무/필요사항에 넉넉히 배분한 예산을 실제로 덜 썼을 때, 남은 여유분이 다음 달로 전달되지 않아 "매월 0부터 다시 시작"하는 느낌.
   - 하늘은행·요망사항은 누적 개념이 있지만 매월 예산 배분이 통장 잔액과 연결되지 않아 불일치 발생.

### 목표
- 요망사항을 "목표 금액이 설정된 저축 상자"로 재정의하고, 각 저축 상자에 돈을 넣는 행위를 **지출 트랜잭션**으로 기록.
- 그룹별 특성에 맞는 **월간 이월** 규칙을 도입하여 예산의 연속성 확보.
- 기존 데이터 손상 없이 2026-05-01 이후 거래부터 새 로직 적용.

---

## 2. 결정된 UX 규칙

| 항목 | 결정 |
|------|------|
| 요망사항 지출 기록 경로 | 금전출납부 + 위시 페이지 "+" 버튼 (이중 진입점, 공통 함수 사용) |
| 이월 단위 | 의무/필요사항: 그룹 단위 합산 / 하늘은행: 그룹 통장 / 요망사항: 위시별 자연 누적 (그룹 이월 없음) |
| 이월 클램프 | 의무/필요/하늘은행: `max(0, 예산 − 지출)` (음수 = 초과 지출은 0으로 클램프, 빚 개념 없음) |
| 이월 UI | 드릴다운 스타일 — 기본 화면은 합계만, 탭하면 "기본 배분 + 지난달 이월" 분해 보기 |
| 누적 방식 | 단회 이월 (직전 달만 참조, 복리 금지) |
| 위시 목표 초과 기여 | 경고 토스트 후 사용자 확인 시 허용 |
| 시작 시점 | 2026-05부터 활성화 (4월까지는 기존 방식 유지) |

---

## 3. 데이터 모델

### 3-1. `finance_transactions` — 컬럼 추가

```sql
ALTER TABLE finance_transactions
  ADD COLUMN wishlist_id UUID NULL REFERENCES finance_wishlist(id) ON DELETE SET NULL;

CREATE INDEX idx_finance_transactions_wishlist_id
  ON finance_transactions(wishlist_id)
  WHERE wishlist_id IS NOT NULL;
```

- 요망사항 그룹(`group_id = 'want'`)의 지출 트랜잭션일 때만 채워짐.
- 그 외 그룹 및 수입 트랜잭션은 `null`.
- 위시 삭제 시 연결된 트랜잭션은 보존되고 `wishlist_id`만 `NULL`로 풀림.

### 3-2. `finance_wishlist.saved_amount` — 의미 재정의

- 컬럼 스키마 유지. **2026-05-01 기준 baseline**(그 이전까지 모은 초기값)으로 의미 재정의.
- 2026-05 이후 추가 적립은 `finance_transactions`의 `wishlist_id` 링크 합산으로 계산 (derived).
- `COMMENT ON COLUMN` 주석으로 의미 명시.

### 3-3. `finance_budgets` — 스키마 변경 없음

- 이월은 파생 계산 (on-the-fly). 저장하지 않음.

---

## 4. 핵심 로직

### 4-1. 위시 누적 금액 (derived)

```ts
function getWishCumulativeSaved(wish, linkedTxs): number {
  const postBaselineSum = linkedTxs
    .filter(tx => tx.wishlist_id === wish.id)
    .filter(tx => tx.date >= '2026-05-01')
    .reduce((s, tx) => s + tx.amount, 0);
  return wish.saved_amount + postBaselineSum; // saved_amount = baseline
}
```

### 4-2. 그룹별 이월 (derived)

```ts
const ROLLOVER_START_MONTH = '2026-05';

type RolloverPolicy = 'clamp_positive' | 'none';
const ROLLOVER_POLICY: Record<GroupId, RolloverPolicy> = {
  obligation: 'clamp_positive',
  necessity:  'clamp_positive',
  sowing:     'clamp_positive',
  want:       'none', // 위시별 누적이 있어 그룹 이월 불필요
};

function getGroupRollover(groupId: GroupId, month: string): number {
  if (month < ROLLOVER_START_MONTH) return 0;
  const policy = ROLLOVER_POLICY[groupId];
  if (policy === 'none') return 0;

  const prev = shiftMonth(month, -1);
  const prevBudget  = sumBudgets(prev, groupId);
  const prevExpense = sumExpenses(prev, groupId);
  const diff = prevBudget - prevExpense;

  return Math.max(0, diff); // clamp_positive
}
```

### 4-3. effective_budget

```ts
function getEffectiveBudget(groupId, month): number {
  return getBaseBudget(groupId, month) + getGroupRollover(groupId, month);
}
```

### 4-4. 단회 이월 (재귀 금지)

- 5월 이월 계산 시 4월의 **base budget**만 참조 (4월에 포함된 3월 이월은 무시).
- 복리 누적 방지. 각 달은 "기본 배분 + 지난 달 여유"만 반영.

---

## 5. UI 변경

### 5-1. 금전출납부 (`/finance/cashbook`)
- 지출 기록 플로우에서 그룹 "요망사항" 선택 시 **위시 picker** 스텝 추가.
- picker 항목: `{위시 제목} ({cumulative_saved} / {target_amount})`
- "+ 새 요망사항 만들기" 옵션 → 인라인 생성 후 자동 선택.

### 5-2. 요망사항 페이지 (`/finance/want`)
- 각 위시 카드에 "+" 버튼 → bottom sheet로 금액 입력.
- 저장 결과 = 금전출납부 경로와 동일한 `finance_transactions` insert (공통 함수).
- 진행도 바·퍼센트·남은 금액을 `cumulative_saved` 기준으로 계산.

### 5-3. 예산 페이지 (`/finance/budget`)
- 각 그룹 카드 상단에 **effective_budget** 표시.
- 이월 있는 경우 작은 배지 `+5만원` 노출 (드릴다운 힌트).
- 카드 탭 → 분해 보기 펼침:
  - `기본 배분 150만`
  - `지난달 이월 +5만`
  - `이번 달 여유 155만`
- 요망사항 그룹: 그룹 이월 없음, 대신 "활성 위시 N개 · 총 누적 XXX원" 요약.
- 하늘은행 그룹: 이월 + 통장 잔액 병기.

### 5-4. 리포트 페이지 (`/finance/report`)
- 요망사항 섹션: 위시별 누적·진행도 요약 (`saved_amount` 아닌 derived 값).
- 하늘은행 섹션: 이월/통장 잔액 정보 추가.

### 5-5. 위시 목표 초과 기여 UX
- 기여 금액 확정 전 클라이언트 체크: `cumulative_saved + amount > target_amount` 시 경고 토스트 + 확인 대화상자. 사용자 명시적 확인 시 진행.

---

## 6. 공통 기여 함수

```ts
// src/lib/finance-actions.ts
export interface WishContributionInput {
  wishId: string;
  amount: number;          // 양수 (지출 금액)
  date: string;            // YYYY-MM-DD
  description?: string;    // 기본값: 위시 제목
}

export async function addWishContribution(
  input: WishContributionInput
): Promise<{ ok: boolean; transactionId?: string; error?: string }>;
```

- 금전출납부 picker 경로와 위시 페이지 "+" 경로 모두 이 함수만 호출.
- 내부 동작:
  1. `finance_transactions` insert (`group_id='want'`, `item_id='want'`, `type='expense'`, `wishlist_id=wishId`).
  2. 성공 시 `finance-bus` 이벤트 발행(기존 구독자 refresh).
- 테스트 타겟 단일화 → 이중 진입점의 동작 불일치 방지.

---

## 7. 마이그레이션

### 7-1. DB
- 새 파일: `supabase/migrations/00018_want_wishlist_transaction_link.sql`
- 기존 `00017_rename_sowing_label.sql` 이후 번호.
- 포함: `ALTER TABLE ... ADD COLUMN`, `CREATE INDEX`, `COMMENT ON COLUMN`.

### 7-2. 코드 변경 파일 목록

| 파일 | 변경 요지 |
|------|----------|
| `src/types/database.ts` | `FinanceTransaction`에 `wishlist_id: string \| null` 추가 |
| `src/lib/finance-config.ts` | `ROLLOVER_START_MONTH`, `ROLLOVER_POLICY` 상수 |
| `src/lib/finance-actions.ts` (신규) | `addWishContribution()` 공통 함수 |
| `src/lib/hooks/use-finance-transactions.ts` | insert/update 시 `wishlist_id` 지원 |
| `src/lib/hooks/use-wishlist.ts` | `updateSaved` 제거, derived `cumulative_saved` 반영 |
| `src/lib/hooks/use-budget.ts` | `getGroupRollover`, `getEffectiveBudget` 유틸 노출 (또는 별도 `use-rollover.ts`) |
| `src/lib/hooks/use-finance-hub.ts` | `effectiveBudgets`, `rollovers` 추가 노출 |
| `src/app/finance/cashbook/page.tsx` | 요망사항 선택 시 위시 picker 분기 |
| `src/app/finance/want/page.tsx` | "+" 버튼 + bottom sheet, 이중 진입점 |
| `src/app/finance/budget/page.tsx` | 그룹 카드 드릴다운 |
| `src/app/finance/report/page.tsx` | 요망사항/하늘은행 섹션 업데이트 |

### 7-3. 기존 데이터 호환
- 5월 이전 거래: `wishlist_id=null` 유지.
- 기존 `saved_amount` 값은 baseline으로 동작 — UI에서 자연스럽게 합산됨.
- 수동 조치 불필요.

---

## 8. 엣지케이스

| 케이스 | 처리 |
|--------|------|
| 전월 예산 미설정 (0원) | `rollover = 0` |
| 의무/필요 지출 > 예산 (초과) | `max(0, 음수) → 0` |
| 하늘은행 지출 > 예산 | `max(0, 음수) → 0` (음수 통장 금지) |
| 위시 삭제 | 연결 트랜잭션 `wishlist_id`만 `NULL` 세팅, 트랜잭션·금액은 보존 |
| 위시 완료 (`is_completed=true`) | picker에서 숨김. 체크박스로 "완료된 항목 포함" 토글 |
| 위시 목표 초과 기여 | 경고 대화상자 후 사용자 확인 시 insert 진행 |
| 전월 트랜잭션 사후 수정 | 파생 계산이라 자동 반영 (드리프트 없음) |
| 그룹 이동 (예: 1월 지출을 3월로 변경) | 파생 계산이라 자동 반영 |

---

## 9. 성능

- 그룹 이월 계산 = 직전 달 `finance_budgets`/`finance_transactions` 각 1회 쿼리 (이미 가져오는 경우 재사용).
- `useMemo`로 렌더 캐시.
- 1인 앱·월 단위 데이터 수십 건 미만 환경에서 체감 영향 없음.

---

## 10. 테스트 전략

### 10-1. 단위 테스트
- `src/lib/__tests__/rollover.test.ts` (신규)
  - `getGroupRollover`: 그룹별·시점별 모든 분기 커버, 클램프·단회 이월 보장.
- `src/lib/__tests__/finance-actions.test.ts` (신규)
  - `addWishContribution`: 정상 insert, wishlist_id 연결, 목표 초과 허용, 삭제된 위시 에러.
- `src/lib/__tests__/finance-config.test.ts` (기존)
  - `ROLLOVER_POLICY` 매핑 검증 추가.

### 10-2. 통합 QA 체크리스트
- [ ] 금전출납부 요망사항 선택 → picker 표시
- [ ] picker "새 요망사항 만들기" → 인라인 생성 + 자동 선택
- [ ] 저장 후 위시 진행도 증가
- [ ] 위시 페이지 "+" 버튼 → 동일 결과
- [ ] 예산 페이지 필요사항 카드 → 이월 배지
- [ ] 카드 탭 → 분해 보기 펼침
- [ ] 2026-04 진입 시 이월 배지 없음
- [ ] 2026-05 진입 시 4월 차액이 이월로 반영
- [ ] 4월 트랜잭션 수정 → 5월 이월 자동 반영
- [ ] 의무/필요 초과 지출 → 이월 0
- [ ] 하늘은행 통장 잔액 리포트 표시

### 10-3. 회귀
- [ ] 기존 `saved_amount` 값 손상 없음
- [ ] `wishlist_id=null` 기본값 유지
- [ ] 재정 설정 페이지 그룹 편집 정상 동작
- [ ] 기존 보고서/홈 카드 consumer 정상 동작

### 10-4. TDD 순서
1. `rollover.ts` 유틸 테스트 → 구현
2. 마이그레이션 SQL → 로컬 supabase 적용
3. `finance-actions.ts` 테스트 → 구현
4. `use-wishlist.ts` 리팩토링 (기존 테스트 수정)
5. `use-budget.ts` / `use-finance-hub.ts` 확장
6. UI 구현 (cashbook picker → want "+" → budget 드릴다운 → report)
7. 수동 QA 체크리스트

---

## 11. Open Questions (없음)

설계 섹션 1~5 모두 사용자 승인 완료. 추가 질문 없음.

---

## 12. 참조

- 이전 스펙: `docs/superpowers/specs/2026-04-17-finance-redesign.md`
- 이전 플랜: `docs/superpowers/plans/2026-04-17-finance-redesign.md`
- 관련 마이그레이션: `00016_finance_sync_relations.sql`, `00017_rename_sowing_label.sql`
