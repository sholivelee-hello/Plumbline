# 다음 세션에 해야 할 일

**작성일**: 2026-04-18
**현재 브랜치**: `feature/finance-redesign` (master에서 36개 커밋 앞섬)
**마지막 커밋**: `3d0b5e7`

---

## 🧭 현재 상태 (한 줄 요약)

재정 섹션을 풀 리빌드 완료 — 4그룹 중심 아키텍처, 카카오뱅크 스타일, 구독/빚 독립 페이지, UI 테스트 모드까지 모두 구현. **아직 master에 머지 안 함, Supabase 프로덕션 연결 안 함**.

### 이번 세션에서 완료한 것
- **22개 오리지널 태스크** (허브, 4그룹 페이지, 출납부, 예산, 할부, 리포트, 설정, 온보딩 등)
- **6개 확장 태스크** (Stage 1-6: 빚 분리, 구독 추가, 데모/리셋 제거)
- **3개 마이그레이션 SQL** (00010, 00011, 00012)
- **UI 테스트 모드** (Supabase 없이도 localStorage fallback으로 동작)

### 만들어진 주요 파일들
- 마이그레이션: `supabase/migrations/00010_finance_redesign.sql`, `00011_finance_feature_updates.sql`, `00012_finance_debts_tags.sql`
- 훅 11개: `use-budget-settings.ts`, `use-finance-transactions.ts`, `use-budget.ts`, `use-finance-hub.ts`, `use-wishlist.ts`, `use-recurring.ts`, `use-onboarding.ts`, `use-subscriptions.ts`, `use-debts.ts` (수정), `use-installments.ts` (수정), `use-heaven-bank.ts` (수정)
- 페이지 11개: `/finance`, `/finance/obligation`, `/finance/necessity`, `/finance/sowing`, `/finance/want`, `/finance/cashbook`, `/finance/budget`, `/finance/installments`, `/finance/debts`, `/finance/subscriptions`, `/finance/report`, `/finance/settings`, `/finance/onboarding`
- 공통 컴포넌트 10개: `FinanceCard`, `AmountInput`, `MonthPicker`, `GroupBadge`, `ProgressBar`, `TransactionRow`, `FAB`, `BottomSheet`, `FinanceDonutChart`, `FinanceSkeleton`

### 참고 문서
- 스펙: `docs/superpowers/specs/2026-04-17-finance-redesign.md` (Post-Launch Updates 섹션 포함)
- 플랜: `docs/superpowers/plans/2026-04-17-finance-redesign.md`
- Follow-up 리스트: `docs/finance-redesign-followups.md`
- UX 피드백: `docs/finance-ux-feedback.md`

---

## 🔴 즉시 해야 할 작업 (머지 전 필수)

### Task 1 — Supabase 프로덕션 연결

**현재 상태**: `.env.local`에 placeholder 값 (`your-project.supabase.co`, `your-anon-key-here`)이 들어있어서 앱이 localStorage fallback으로 동작 중.

**해야 할 일**:

1. Supabase 대시보드 접속 → Plumbline 프로젝트 선택
2. **Project Settings → API**에서 다음 값 복사:
   - Project URL
   - `anon` `public` key
3. `C:/Users/MIR-NOT-DXD-003/Desktop/위클리/.env.local` 편집:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://실제프로젝트id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...실제키...
   ```
4. Dev 서버 재시작 필요 (env 변경은 HMR로 반영 안 됨):
   ```bash
   taskkill //F //IM node.exe
   cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
   rm -rf .next
   npm run dev
   ```

### Task 2 — 마이그레이션 3개 순차 적용

**중요**: 순서대로 실행해야 함 (00010 → 00011 → 00012). 00010은 기존 데이터를 변환하는 큰 마이그레이션이므로 **실행 전 백업** 권장.

**실행 방법 2가지 중 택일**:

#### 방법 A: Supabase 대시보드 SQL Editor (추천, 개별 실행)
1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/00010_finance_redesign.sql` 내용 전체 복사 → 붙여넣기 → Run
3. 에러 없으면 `00011_finance_feature_updates.sql` 동일하게 실행
4. `00012_finance_debts_tags.sql` 실행 (00011에서 이미 `ADD COLUMN IF NOT EXISTS tags`가 있다면 00012는 no-op)

#### 방법 B: Supabase CLI
```bash
cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
npx supabase db push
```

**검증**:
- Supabase Table Editor에서 다음 테이블이 존재하는지 확인:
  - 신규: `finance_budget_settings`, `finance_wishlist`, `finance_recurring`, `finance_recurring_logs`, `finance_onboarding`, `finance_subscriptions`, `finance_subscription_amount_changes`, `finance_subscription_cancellations`
  - 수정됨: `finance_transactions` (group_id/item_id/source 컬럼), `finance_debts` (tags), `finance_recurring` (subscription_id)
  - 삭제됨: `finance_accounts`, `finance_categories`, `finance_obligations`, `finance_wants`

### Task 3 — 온보딩 리다이렉트 복원

Supabase 연결 후에는 첫 사용자가 온보딩을 거치도록 해야 함.

**파일**: `src/app/finance/page.tsx` 라인 159-165 부근

**현재 (주석 처리됨)**:
```tsx
// ── Onboarding redirect disabled for UI testing mode ────────────────────
// Re-enable when Supabase is properly configured:
// useEffect(() => {
//   if (onboardingLoading) return;
//   if (!isOnboarded) {
//     router.replace("/finance/onboarding");
//   }
// }, [onboardingLoading, isOnboarded, router]);
```

**변경 후** (주석 해제):
```tsx
// ── Redirect to onboarding if not onboarded ──────────────────────────────
useEffect(() => {
  if (onboardingLoading) return;
  if (!isOnboarded) {
    router.replace("/finance/onboarding");
  }
}, [onboardingLoading, isOnboarded, router]);
```

### Task 4 — 실제 DB 연결 후 전체 플로우 재테스트

`.env.local`과 마이그레이션이 모두 적용되면 `useBudgetSettings`, `useOnboarding` 등이 자동으로 Supabase 경로로 전환 (localStorage fallback은 백업으로 유지). 다음 흐름을 처음부터 끝까지 테스트:

1. **온보딩**: `/finance` 접속 → `/finance/onboarding` 자동 이동 → 수입 입력 → 4그룹 배분 → 완료 → 허브
2. **허브**: 수입/지출/잔액, 도넛 차트, 4그룹 카드, 오늘의 거래
3. **입력**: FAB → 바텀시트 → 그룹 선택 → 항목 선택 → 금액 → 저장
4. **각 그룹 페이지**: 의무/필요/하늘은행/요망 독립 테스트
5. **빚 관리**: `/finance/debts`에서 빚 추가 → 상환 기록 → 출납부 자동 반영 확인
6. **구독**: `/finance/subscriptions`에서 구독 추가 → 다음 달 자동 실행 확인
7. **할부**: 납부 버튼 → 출납부 자동 반영
8. **하늘은행**: 심기/거두기 → 양쪽 테이블 dual-write
9. **위시리스트**: 우선순위 재정렬, 저축, 구매 완료
10. **예산**: 전월 복사, 수입 기반 배분
11. **리포트**: 7개 카드 모두 렌더링
12. **설정**: 그룹 편집, 수입 카테고리, 반복 거래 (구독 제외 확인)

### Task 5 — Master 머지

테스트 통과 후:

```bash
cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
git checkout master
git merge feature/finance-redesign
git push origin master
```

또는 GitHub UI에서 PR 생성 → 리뷰 → 머지.

---

## 🟡 권장 Follow-up (머지 후 점진 개선)

`docs/finance-redesign-followups.md`에 6개 항목 문서화되어 있음:

### Follow-up 1 — 데모 데이터 시딩
**문제**: 온보딩의 "둘러보기" 버튼은 제거됐지만, 신규 사용자가 빈 화면만 보게 됨.
**해결**: `useOnboarding` 훅에 옵션으로 "샘플 데이터 자동 생성" 추가. 사용자가 "예제와 함께 시작" 버튼 누르면 각 그룹별로 3-5개 거래를 자동 삽입.
**파일**: `src/lib/hooks/use-onboarding.ts`, `src/app/finance/onboarding/page.tsx`
**예상 작업량**: 1-2시간

### Follow-up 2 — 위시리스트 구매 완료 → 거래 자동 생성
**문제**: 현재 `completeWish`는 위시리스트를 완료 상태로 변경만 하고, `finance_transactions`에 지출 기록을 생성하지 않음.
**해결**: `completeWish(id)`에서 해당 위시 금액으로 `addTransaction({ type: 'expense', group_id: 'want', item_id: 'want', amount: targetAmount, ... })`를 호출.
**파일**: `src/lib/hooks/use-wishlist.ts`
**고려사항**: `saved_amount`와 `target_amount`의 차액(저축 부족분)을 어떻게 처리할지 결정 필요.

### Follow-up 3 — 수입 카테고리 실시간 동기화
**문제**: 허브의 입력 바텀시트가 `useBudgetSettings`의 `incomeCategories`를 참조하는데, Settings에서 카테고리 추가 후 허브가 자동 재조회 안 할 수 있음.
**해결**: `useBudgetSettings` 훅에 전역 이벤트 리스너 추가하거나, React Context로 공유.
**파일**: `src/lib/hooks/use-budget-settings.ts`

### Follow-up 4 — `faith-custom-items-*` localStorage 정리
**문제**: 구 `faith-budget-config.ts` 시스템에서 사용하던 `faith-custom-items-{groupId}` 키들이 localStorage에 잔재.
**해결**: 앱 첫 로드 시 `Object.keys(localStorage).filter(k => k.startsWith('faith-custom-items-')).forEach(k => localStorage.removeItem(k))` 실행.
**파일**: `src/app/finance/page.tsx` (허브의 `useLocalStorageMigration` 훅 안)

### Follow-up 5 — `finance_budgets` 유니크 제약 + upsert 전환
**문제**: 현재 `use-budget.ts`의 `updateBudgetAmount`는 "delete-then-insert" 패턴을 사용. 진짜 upsert가 아님. 동시 쓰기 시 race condition 가능.
**해결**:
1. 새 마이그레이션 `00013_finance_budgets_unique.sql` 작성:
   ```sql
   ALTER TABLE finance_budgets
     ADD CONSTRAINT finance_budgets_unique_slot
     UNIQUE (user_id, month, group_id, item_id);
   ```
   (null item_id 처리 필요 — Postgres의 `NULLS NOT DISTINCT` 옵션 또는 partial index 사용)
2. `updateBudgetAmount`를 `.upsert({...}, { onConflict: '...' })`로 전환.
**파일**: `src/lib/hooks/use-budget.ts`, 신규 마이그레이션

### Follow-up 6 — 빚 태그 스펙 문서화
**문제**: 현재 `finance_debts.tags`는 `TEXT[]`로 자유 입력. UI에서는 콤마 구분 입력 → split.
**해결 (선택)**: 자주 쓰는 태그 프리셋 관리 기능 (예: "주거", "학자금", "카드빚") — 사용자별 커스텀 태그 리스트.
**파일**: Settings 페이지 + `finance_budget_settings.group_configs` JSONB 확장

---

## 🟢 중장기 개선 (여유 있을 때)

### UX 강화
- **반복 거래 알림**: 월세/구독 결제일 D-3 푸시 알림 (PWA Web Push API)
- **거래 검색/필터**: 출납부에서 텍스트 검색, 금액 범위, 태그 필터
- **위시리스트 이미지**: 갖고 싶은 물건 사진 첨부 (Supabase Storage)
- **구독 월간 비교**: 지난 달 대비 구독료 변동 차트

### 기능 확장
- **연간 리포트**: 현재 월간만 있음. `/finance/report/yearly` 추가
- **예산 템플릿**: 여러 예산 프로파일 저장 (평소/보너스달/비상예산 등)
- **CSV/Excel 내보내기**: 출납부 전체 또는 기간별
- **다중 계좌 지원**: 현재는 하나의 통합 계좌 가정 — 체크카드/신용카드/현금 분리 관리
- **환율 대응**: 해외 구독 (달러 결제) 원화 환산

### 인프라/성능
- **Supabase RLS 실제 검증**: 다른 사용자 데이터 접근 시도 테스트
- **PWA 오프라인 캐싱 복원**: `public/sw.js`는 이전에 삭제됨. Service Worker 재활성화 필요 시 Serwist 설정 확인
- **e2e 테스트**: Playwright로 온보딩~거래 기록 전체 시나리오 자동화
- **성능**: 거래 1000+건 시 `finance_transactions.date` 인덱스 활용 확인, 가상 스크롤 고려

### 기술 부채
- `react-hooks/exhaustive-deps` 경고 전체 해결 (현재 기존 훅들에 남아있음)
- `src/types/database.ts`의 일부 타입에서 `any` 사용 여부 점검
- Vitest → Playwright 이원화 대신 통합 테스트 전략 수립

---

## 🛠 유용한 명령어 모음

### 개발 서버
```bash
cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
npm run dev                  # 개발 서버 시작 (포트 3000)
npm run build                # 프로덕션 빌드
npx tsc --noEmit             # TypeScript 검증
npx vitest run               # 전체 테스트
npx vitest run src/lib/__tests__/  # 특정 디렉토리 테스트
```

### Dev 서버 꼬였을 때
```bash
taskkill //F //IM node.exe
cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
rm -rf .next
npm run dev
```

### Git
```bash
git log --oneline feature/finance-redesign ^master  # 이 브랜치의 커밋만
git status --short                                  # 간단 상태
```

### 브라우저 테스트 리셋
DevTools 콘솔:
```js
localStorage.clear()
location.reload()
```

---

## ⚠️ 알려진 주의사항

### 1. `public/sw.js` 삭제됨
초기 체크포인트 커밋에서 Service Worker 파일이 삭제됨. PWA 오프라인 기능이 작동하지 않음. 필요 시 Serwist 설정 확인하고 재생성.

### 2. Vitest 환경
`vitest.config.mts`에서 jsdom → happy-dom으로 변경됨 (jsdom 27 ESM 충돌 때문). React Testing Library는 정상 작동.

### 3. `finance-onboarding-local`, `finance-budget-settings-local` localStorage 키
UI 테스트 모드에서 생성됨. 프로덕션 Supabase 연결 후에는 자동 사용 중단되지만, 혼란을 막기 위해 수동 삭제 권장:
```js
localStorage.removeItem('finance-onboarding-local')
localStorage.removeItem('finance-budget-settings-local')
```

### 4. `source` enum의 `"obligation"` 값 미사용
초기 스펙에 있었으나 실제로는 사용 안 함. `"manual"`, `"recurring"`, `"installment"`, `"debt"`, `"heaven_bank"`, `"subscription"` 6개만 실제 쓰임.

### 5. 온보딩 데모 모드 컬럼 유지
`finance_onboarding.is_demo_mode` 컬럼은 DB에 여전히 존재. 하위 호환성 때문에 삭제 안 함. 코드에서는 더 이상 읽지도 쓰지도 않음. 정리 원하면 별도 마이그레이션.

### 6. Tailwind `surplus`/`debt` 색상 토큰 제거됨
Task 3에서 삭제됨. 이 클래스를 사용하는 코드가 있다면 깨짐 — 제거 시 grep으로 전체 검색하여 남은 것 확인했으나, 혹시 놓친 곳이 있으면 이 안내 참고.

---

## 📞 다음 세션 시작 방법

1. 이 파일 (`docs/next-session.md`) 읽기
2. 현재 브랜치 확인:
   ```bash
   cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
   git branch --show-current   # "feature/finance-redesign"이어야 함
   git log --oneline -5         # 마지막 커밋이 3d0b5e7인지 확인
   ```
3. 원하는 Task 번호부터 진행
4. 막히면 관련 스펙/플랜 문서 재참고:
   - `docs/superpowers/specs/2026-04-17-finance-redesign.md`
   - `docs/superpowers/plans/2026-04-17-finance-redesign.md`
   - `docs/finance-redesign-followups.md`

---

**작성 완료.** 다음 세션 파이팅 🙏
