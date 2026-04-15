# Plumbline - 다음 세션 작업 계획

## 배경
- Task 1~21 구현 완료, UX 전문가 평가 95점
- 실사용자 페르소나(31세 여성, 토스급 기대) 평가: 4.5/10
- 목표: 8.0+ 달성을 위한 6단계 UX 대개편

---

## Phase 1: 기반 정리 (최우선)

### 1-1. 로그인/Auth 완전 제거
- `src/app/login/` 디렉토리 삭제
- `middleware.ts`: auth 체크 제거 (단순 pass-through)
- `src/lib/supabase/middleware.ts`: updateSession 삭제
- 11개 hooks에서 `supabase.auth.getUser()` 제거 -> 고정 user_id 상수로 대체
  - `src/lib/constants.ts` 생성: `export const FIXED_USER_ID = "..."`
  - use-basics, use-finance, use-schedule, use-heaven-bank, use-obligations, use-wants, use-debts, use-events, use-settings, use-installments
- Supabase RLS 정책 확인 필요 (auth 없이 동작하도록)

### 1-2. 계좌 관리 삭제
- `src/app/finance/accounts/page.tsx` 삭제
- `src/components/finance/account-card.tsx` 삭제
- `src/app/finance/page.tsx`에서 계좌 SectionLink 및 accounts 관련 코드 제거
- `src/lib/hooks/use-finance.ts`에서 accounts state, addAccount, finance_accounts 쿼리 제거

---

## Phase 2: 디자인 시스템 강화

### 2-1. Pretendard 한국어 폰트
- CDN 또는 self-host로 Pretendard 적용
- `globals.css` font-family 변경

### 2-2. 카테고리별 컬러 팔레트
- tailwind.config.ts에 6개 시맨틱 컬러 추가:
  - heaven(골드), obligation(로즈), necessity(인디고), want(퍼플), surplus(에메랄드), debt(슬레이트)

### 2-3. 다크 모드
- tailwind `darkMode: 'class'`
- CSS 변수 오버라이드
- 토글 UI (설정 페이지 또는 사이드바)
- 주요 컴포넌트에 dark: 클래스 추가

### 2-4. 마이크로 인터랙션 & 빈 상태
- 체크 bounce 애니메이션, 카드 탭 눌림 효과
- 빈 상태에 안내 메시지 + SVG 일러스트

---

## Phase 3: 대시보드 개편

### 3-1. 인사말 & 달성률 시각화
- 시간대별 인사말 ("좋은 아침이에요!" 등)
- 베이직 달성률 도넛 차트 (순수 SVG)

### 3-2. 카드 레이아웃 균일화
- min-height 또는 flex stretch로 카드 높이 통일
- 내용 적을 때 중앙 정렬, 많을 때 접기/스크롤

---

## Phase 4: 재정 페이지 구조 개편

### 4-1. 6개 섹션 시각 구분
- 하늘은행 / 의무지출 / 생활비 / 요망 / 여윳돈 / 할부+빚
- 각 섹션에 고유 아이콘(lucide) + 색상 포인트(Phase 2-2 활용)
- 월급일 기준 예산 사이클 표시

### 4-2. 지출 내역 입력/조회 (Drill-down)
- 카테고리 카드 탭 -> 지출 내역 목록 펼침
- 지출 입력 폼: 날짜, 금액, 메모
- 내역 리스트: 날짜별 그룹핑

### 4-3. 예산 설정 UI
- settings에 salary_day 필드 추가
- 카테고리별 월 예산 입력/수정 UI
- 카테고리 관리 (추가/수정/삭제)

---

## Phase 5: 일정 반응형 & 월간 뷰 개선

### 5-1. 주간 뷰 반응형
- `minWidth: 800px` 하드코딩 제거
- 모바일: 일간 뷰 (1일 또는 3일) 자동 전환
- 오늘 날짜 하이라이트
- 빈 시간대 탭 -> 일정 추가

### 5-2. 월간 뷰 이벤트 가시성
- 1.5px 색상 바 -> 이벤트 제목 텍스트 표시
- 이벤트 탭 -> 상세 보기/수정 모달

### 5-3. 프리셋 피커 연결
- preset-picker.tsx가 존재하나 미연결 상태 -> 일정 추가 폼에 연결

---

## Phase 6: 베이직 피드백 강화

### 6-1. 체크 피드백
- 토스트 + 진동 (navigator.vibrate)
- 100% 달성 시 축하 애니메이션
- 연속 달성 스트릭 카운터 (7일, 30일 마일스톤)
- 수치 입력 +/- 스테퍼 개선

---

## 실행 순서

```
Phase 1 (필수 선행) -> Phase 2 (디자인 토대) -> Phase 3~6 (병렬 가능)
단, Phase 2-2 컬러 시스템이 Phase 4에 필요하므로 Phase 2 -> Phase 4 의존성 있음
```

## 주의사항
- Supabase DB 연결은 유지 (auth만 제거)
- 모바일 퍼스트 (PWA)
- 외부 차트 라이브러리 지양 (SVG/CSS 직접 구현)
- 접근성 유지 (44px 터치 타겟, aria-label)

## 상세 계획
- `.omc/plans/plumbline-ux-overhaul.md` 참조
- `.omc/plans/open-questions.md`에 미결 사항 정리됨
