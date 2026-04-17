# Finance Section Full Redesign Spec

**Date:** 2026-04-17
**Approach:** Full Rebuild (접근법 A)
**Design Mood:** 카카오뱅크 스타일 (따뜻하고 친근, 라운드 카드, 충분한 여백)
**Color Theme:** 모던 금융 톤

---

## Post-Launch Updates (2026-04-17+)

The spec below reflects the original design. After initial implementation, the following changes were made based on user feedback:

1. **Debt management split out**: `/finance/debts` is now a separate page. `/finance/obligation` shows a read-only summary link. The "빚 청산" item in obligation group is display-only (managed via /debts dual-write).
2. **Subscription feature added**: `/finance/subscriptions` — full CRUD with amount change history (`finance_subscription_amount_changes`), cancellation/rejoin history (`finance_subscription_cancellations`), card label, day-of-month billing. Subscriptions auto-create linked `finance_recurring` rows (hidden from settings recurring list).
3. **New source value**: `finance_transactions.source` extended with `"subscription"`.
4. **Demo mode removed**: No "둘러보기" button, no demo toggle in settings. Use localStorage fallback for onboarding state when Supabase unavailable.
5. **Data reset removed**: Settings data section deleted entirely. Recovery via SQL if needed.
6. **New necessity item**: `subscription` item added to DEFAULT_GROUPS for necessity group.
7. **Debt tags**: `finance_debts.tags TEXT[]` now fully supported (input + display).

See migrations 00011 and 00012 for schema changes. No existing spec section is invalidated — these are extensions.

---

## 1. 정보 아키텍처 & 네비게이션

### 전체 구조

```
/finance                    허브 대시보드
├── /finance/obligation     의무사항 그룹
├── /finance/necessity      필요사항 그룹
├── /finance/sowing         좋은 땅 / 하늘은행
├── /finance/want           요망사항 / 위시리스트
├── /finance/cashbook       출납부 (일일 + 월별)
├── /finance/budget         예산 관리
├── /finance/installments   할부 관리
├── /finance/report         월간 리포트
└── /finance/settings       재정 설정
```

### 핵심 설계 원칙

- **4그룹 중심 아키텍처**: 의무/필요/하늘은행/요망 4그룹이 재정 관리의 중심축
- **각 그룹은 독립된 세계**: 입력/조회/관리가 모두 그룹 내에서 가능
- **출납부는 통합 뷰**: 모든 그룹의 거래를 한곳에서 조회
- **예산은 통합 세팅**: 4그룹 예산을 한 페이지에서 관리
- **어디서든 입력 가능**: 허브, 각 그룹, 출납부 모두에서 거래 입력 가능

### 네비게이션 흐름

- 허브 → 모든 하위 페이지의 단일 진입점
- 각 그룹 카드 → 독립된 관리 페이지
- 뒤로가기로 허브 복귀
- 하단 탭 네비게이션의 "재정" = 허브 대시보드

---

## 2. 허브 대시보드 (`/finance`)

### 레이아웃 (위에서 아래)

**1) 월 선택 헤더**
- "2026년 4월" + 좌/우 화살표
- 탭하면 월 피커

**2) 요약 카드 영역**
- 3장 라운드 카드 가로 나열:
  - 수입 (에메랄드): **+2,550,000원**
  - 지출 (코랄): **-1,823,500원**
  - 잔액 (네이비): **+726,500원**
- 도넛 차트:
  - 4그룹 지출 비율 색상별 표시
  - 중앙에 총 지출 금액
  - 범례: 의무(네이비) / 필요(에메랄드) / 하늘은행(퍼플) / 요망(오렌지)

**3) 4그룹 진입 카드**
- 2열 그리드
- 각 카드: 그룹 색상 좌측 바 + 그룹명 + 비율 가이드 + 예산 대비 실적 한 줄 + 미니 프로그레스 바
- 탭 → 해당 그룹 페이지

**4) 빠른 바로가기**
- 가로 스크롤 칩: 출납부 / 예산 / 할부 / 리포트 / 설정
- 카카오뱅크 스타일 라운드 아이콘 + 텍스트

**5) 오늘의 거래 미리보기**
- "오늘 (4월 17일)" 헤더
- 최근 3-5건 거래 리스트
- "더보기 →" 출납부 이동
- 거래 없으면: "아직 기록이 없어요" + 입력 유도 CTA

### 입력 진입점
- 화면 우하단 플로팅 "+" 버튼 (FAB)
- 탭 → 바텀시트: 그룹 선택 → 항목 선택 → 금액 입력
- 허브의 입력은 범용 (어떤 그룹이든 선택 가능)

### 반응형
- 모바일: 요약 카드 가로 스크롤, 4그룹 카드 1열
- 데스크톱: 요약 카드 3열, 4그룹 카드 2열, 오른쪽 사이드에 오늘의 거래

---

## 3. 4그룹 카드 시스템

### 3-1. 의무사항 (`/finance/obligation`)

**상단: 그룹 요약**
- "의무사항" + 비율 가이드 "35~40%"
- 이번 달 예산/실적/잔여
- 프로그레스 바 (네이비)

**중단: 항목 리스트**
- 각 항목(십일조, 빚 청산, 헌금, 공과금, 세금, 부모님 용돈...)이 카드
- 각 카드: 항목명 | 예산 | 실적 | 미니 프로그레스 바
- 탭 → 해당 항목의 최근 거래 내역 펼쳐짐
- 거래에서 바로 수정/삭제 가능

**하단: 빚 관리 섹션**
- "갚아야 할 빚" 별도 헤더
- 빚 카드:
  - 제목 + 자유 태그
  - 총액 / 상환액 / 잔액
  - 프로그레스 바
  - "이 속도면 **N개월 후** 완납" 예측
  - 펼치면: 상환 타임라인 (날짜 | 금액 | 메모)
- 빚 추가 / 상환 기록 버튼 (상환 → 출납부 자동 기록)

**입력**: FAB 또는 항목 카드 내 "+" 버튼

### 3-2. 필요사항 (`/finance/necessity`)

**상단: 그룹 요약** (의무사항과 동일 패턴)

**중단: 항목별 예산 소진률**
- 프로그레스 바 중심: "식비 23만 / 30만 (77%)"
- 80% 이상 → 주황, 100% 초과 → 빨간
- 카드 탭 → 최근 거래 펼쳐짐:
  - "4/17 편의점 4,500원"
  - "4/16 마트 장보기 32,000원"

**입력**: 항목 카드 내 "+" 또는 FAB

### 3-3. 좋은 땅 / 하늘은행 (`/finance/sowing`)

**은행 앱 통장 스타일 (깔끔, 메타포 없이):**

**상단: 통장 헤더**
- "하늘은행" (로얄 퍼플 톤)
- 잔액 크게: **₩1,200,000**
- 잔액 = 누적 심음 - 누적 거둠
- 부제: "총 심음 ₩1,800,000 · 총 거둠 ₩600,000"

**중단: 입출금 내역 (최신순)**
- 날짜 | 적요 | 심음(파란) | 거둠(빨간) | 잔액
- 월별 구분선

**심음 입력:**
- "심기" 버튼 → 바텀시트
- 심음 대상: 프리셋 칩 (교회 헌금, 선교 후원, 이웃 돕기, 감사 헌금...) + "직접 입력"
- 금액 + 날짜 (기본 오늘)
- **듀얼 라이트**: `heaven_bank`에 심음 기록 + `finance_transactions`에 `group_id: "sowing"`, `source: "heaven_bank"` 지출 기록을 단일 함수에서 트랜잭션으로 처리. 이를 통해 허브 도넛 차트와 예산 달성률에 하늘은행 지출이 정확히 반영됨.

**거둠 입력:**
- "거두기" 버튼 → 바텀시트
- 설명 + 금액 + 날짜
- 거둠 = 실제 금전 회수 (물질적 응답/축복 기록)
- **듀얼 라이트**: `heaven_bank`에 거둠 기록 + `finance_transactions`에 `type: "income"`, `group_id: "sowing"`, `source: "heaven_bank"` 수입 기록

**삭제 시**: 양쪽 테이블에서 동시 삭제. `finance_transactions`에 `source: "heaven_bank"`인 레코드는 하늘은행 페이지에서만 삭제 가능 (출납부에서는 읽기 전용 표시, "하늘은행에서 관리" 안내)

### 3-4. 요망사항 / 위시리스트 (`/finance/want`)

**상단: 그룹 요약** (예산/실적)

**중단: 위시리스트**
- 우선순위 순서로 카드 나열
- 각 카드:
  - 순위 뱃지 (#1, #2, #3...)
  - 항목명
  - 목표 금액 / 현재 저축 / 프로그레스 바
  - 드래그로 순위 변경
- 위시 추가: 항목명 + 목표 금액 + 우선순위
- "저축하기" → 금액 입력 → `finance_wishlist.saved_amount` 증가 (수동)
- 위시리스트 저축은 `finance_transactions`에 기록하지 않음. 이미 요망 예산 내에서 지출되지 않은 금액을 "이 위시를 위해 남겨둔다"는 추적 목적. 실제 구매 시에만 `finance_transactions`에 지출 기록 생성.

**하단: 요망 지출 내역**
- 이번 달 요망 지출 리스트 (일반 요망 지출 + 위시 구매 완료 건)
- 일반 요망 지출(커피, 간식 등)과 위시리스트 저축은 같은 요망 예산 풀을 공유

### 4그룹 공통 패턴
- 상단: 뒤로가기 + 그룹명 헤더
- 모든 그룹에서 거래 입력 가능
- 날짜 기본값 오늘, 탭해서 변경
- 금액: 시스템 키패드 + 빠른 단위 버튼 (+1만, +5만, +10만, +50만)
- 카카오뱅크 톤 라운드 카드
- 각 그룹 고유 색상

---

## 4. 출납부 (`/finance/cashbook`)

### 탭 구조: 일일 출납부 | 월별 출납부

### 4-1. 일일 출납부 (기본 탭)

**월 선택 헤더**

**날짜별 묶음 뷰:**
- 날짜 헤더: "4월 17일 (목)" + 해당일 수입·지출 소계
- 거래 리스트: 그룹 색상 도트 | 설명 | 그룹·항목 태그 | 금액(+/-)
- 수입 초록(+), 지출 빨간(-)
- 거래 탭 → 수정/삭제

### 4-2. 월별 출납부

**월 요약 카드:** 수입/지출/잔액 숫자 카드 3장

**4그룹별 지출 요약 테이블:**
- 그룹 | 예산 | 실적 | 달성률 + 프로그레스 바
- 합계 행

**날짜별 지출 표:**
- 행: 날짜 (1일~말일)
- 열: 의무 | 필요 | 하늘 | 요망 | 합계
- 셀 탭 → 해당 날짜+그룹의 거래 상세 펼쳐짐
- 합계 행
- 모바일: 가로 스크롤

### 출납부 공통
- FAB로 거래 추가 가능
- 수입/지출 필터 토글

---

## 5. 예산 관리 (`/finance/budget`)

### 첫 세팅 흐름
1. 수입 총액 입력
2. 4그룹 비율 자동 배분 제안
3. 그룹별 금액 조정 (범위 벗어나면 부드러운 경고)
4. 항목별 세부 배분
5. 저장

### 이후 매달
- 해당 월 예산이 없는 상태로 진입 시 → "지난달 예산을 가져올까요?" 확인 프롬프트
- 확인하면 전월 `finance_budgets` 행들을 현재 월로 복사 (자동이 아닌 사용자 확인 후 복사)
- 수입 변동 시 재배분 가능
- 변동 항목만 미세 조정

### 레이아웃

**상단: 수입 & 총 예산**
- 수입 금액 (탭해서 수정)
- 총 예산 배분 / 미배분
- 배분률 바

**중단: 4그룹 예산 카드**
- 각 그룹: 가이드 비율 + 현재 비율/금액
- 프로그레스 바
- 항목별 금액 입력 (인라인, 디바운스 자동 저장)
- 비율 가이드 범위 초과 시 카드 테두리 주황 + 경고 텍스트
- 항목 추가 버튼

**하단: 전체 요약**
- 도넛 차트 + "예산 저장됨" 인디케이터

### 특수 기능
- 수입 변경 시 "비율에 맞게 재배분할까요?" 확인
- 전월 복사: 해당 월 예산 없으면 "지난달 예산 가져올까요?" 제안

---

## 6. 할부 관리 (`/finance/installments`)

### 레이아웃

**상단: 할부 요약**
- 활성 할부 N건 | 월 총 납부액

**할부 카드:**
- 제목
- 프로그레스 바 (N/M회, %)
- 총액 / 월 납부액 / 납부 완료 / 남은 금액 / 남은 회차 / 완납 예정
- "이번 달 납부하기" → 확인 → paid_months +1 → 출납부 자동 기록
  - 자동 기록 설명: "맥북 프로 14 할부 6/12회"
- 완납 시 축하 토스트 + "완납" 뱃지

**할부 추가 바텀시트:**
- 항목명 / 총 금액 / 월 납부액 / 총 회차 / 시작일
- 월 납부액 × 총 회차 ≠ 총 금액이면 부드러운 경고

**완료된 할부:**
- 접힌 섹션, 흐린 색상, 완납일 표시, 삭제 가능

---

## 7. 월간 리포트 (`/finance/report`)

### 월 선택 헤더

### 카드 나열 (스크롤)

1. **수입/지출 요약**: 수입 / 지출 / 잔액 + 전월 대비 변동
2. **4그룹별 지출 비율**: 도넛 차트 + 각 그룹 금액/비율
3. **예산 달성률**: 그룹별 프로그레스 바 + 전체 달성률
4. **수입 분석**: 수입 카테고리별 비율 가로 막대
5. **하늘은행 요약**: 이번 달 심음/거둠 + 잔액 + 심음 대상별 분포
6. **빚/할부 현황**: 활성 건수, 이번 달 상환/납부액, 다음 완납 예정
7. **반복 거래 실행 현황**: 등록 건 중 이번 달 기록/미기록 체크리스트

---

## 8. 재정 설정 (`/finance/settings`)

### 섹션 구성

**1) 4그룹 커스터마이징**
- 그룹별: 이름 수정 / 비율 가이드 수정 / 항목 추가·삭제·이름 수정·순서 변경
- 그룹 간 항목 이동 (길게 눌러서 드래그)

**2) 수입 카테고리**
- 급여 / 부수입 / 투자수익 / 용돈 / 기타
- 추가 / 편집 / 삭제

**3) 반복 거래**
- 등록된 반복 거래 리스트
- 각 항목: 설명 | 금액 | 매달 N일 | 그룹·항목 연결
- 추가/편집 바텀시트: 설명, 금액, 기록일, 수입/지출, 그룹·항목 (지출), 수입 카테고리 (수입)

**4) 데이터**
- 데모 데이터 체험 토글
- 데이터 초기화 (확인 다이얼로그 2번)

---

## 9. 온보딩

### 흐름

1. **환영**: "둘러보기" (데모 체험) / "바로 시작하기"
   - 둘러보기: 데모 데이터 채워진 상태, 상단 "체험 중" 뱃지, "내 데이터로 시작하기" 버튼
2. **수입 입력**: 이번 달 수입 금액 (빠른 단위 버튼 포함)
3. **예산 자동 배분**: 4그룹 비율 제안 + 조정 가능
4. **완료**: "첫 거래 기록하기" / "나중에 할게요"

### 온보딩 이후
- 완료 플래그 Supabase 저장
- 설정에서 "데모 데이터로 체험하기" 토글로 재체험 가능

---

## 10. 데이터 모델 (Supabase)

모든 데이터를 Supabase에 통합. localStorage 사용하지 않음.

### 테이블

**`finance_transactions`** (거래 기록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | auth.users |
| type | TEXT | "income" / "expense" |
| amount | INTEGER | 원 단위 |
| description | TEXT | 설명/메모 |
| date | DATE | 거래 날짜 |
| group_id | TEXT | obligation/necessity/sowing/want |
| item_id | TEXT | tithe/food/heaven 등 |
| income_category | TEXT NULL | 급여/부수입 등 (수입인 경우) |
| source | TEXT | "manual"/"recurring"/"installment"/"debt"/"heaven_bank" |
| created_at | TIMESTAMPTZ | |

**`finance_budgets`** (월별 예산)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| month | TEXT | "2026-04" |
| group_id | TEXT | |
| item_id | TEXT | |
| amount | INTEGER | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`finance_budget_settings`** (예산 설정 — 사용자당 1행, 월별 아님)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | UNIQUE |
| monthly_income | INTEGER | 기본 월 수입 (예산 배분 기준값. 월별 수입 변동은 finance_budgets에서 관리) |
| group_configs | JSONB | [{id, title, color(hex), percentMin, percentMax, items: [{id, title}]}] — color는 hex 값 (예: "#1E3A5F"), Tailwind 클래스는 프론트에서 매핑 |
| income_categories | JSONB | ["급여", "부수입", ...] |
| updated_at | TIMESTAMPTZ | |

**`finance_debts`** (빚)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT | |
| total_amount | INTEGER | |
| tags | TEXT[] | 자유 태그 |
| is_completed | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**`finance_debt_payments`** (빚 상환)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| debt_id | UUID FK | |
| amount | INTEGER | |
| date | DATE | |
| memo | TEXT NULL | |

**`finance_installments`** (할부)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT | |
| total_amount | INTEGER | |
| monthly_payment | INTEGER | |
| total_months | INTEGER | |
| paid_months | INTEGER | |
| start_date | DATE | |
| is_completed | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**`heaven_bank`** (하늘은행)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| type | TEXT | "sow" / "reap" |
| target | TEXT NULL | 심음 대상 |
| description | TEXT NULL | |
| amount | INTEGER | |
| date | DATE | |
| created_at | TIMESTAMPTZ | |

**`finance_wishlist`** (위시리스트) — 신규
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT | |
| target_amount | INTEGER | 목표 금액 |
| saved_amount | INTEGER | 저축액 (DEFAULT 0) |
| priority | INTEGER | 우선순위 (1=최고) |
| is_completed | BOOLEAN | DEFAULT false |
| completed_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

**`finance_recurring`** (반복 거래) — 신규
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| description | TEXT | |
| amount | INTEGER | |
| type | TEXT | "income" / "expense" |
| day_of_month | INTEGER | 1-31 |
| group_id | TEXT NULL | 지출 시 그룹 |
| item_id | TEXT NULL | 지출 시 항목 |
| income_category | TEXT NULL | 수입 시 카테고리 |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | |

**`finance_recurring_logs`** (반복 거래 실행 기록) — 신규
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| recurring_id | UUID FK | |
| month | TEXT | "2026-04" |
| transaction_id | UUID FK | finance_transactions |
| executed_at | TIMESTAMPTZ | |

- UNIQUE 제약: `(recurring_id, month)` — 동일 반복 거래가 같은 월에 중복 실행 방지

**`finance_onboarding`** (온보딩 상태) — 신규
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| is_completed | BOOLEAN | DEFAULT false |
| is_demo_mode | BOOLEAN | DEFAULT false |
| completed_at | TIMESTAMPTZ NULL | |

### localStorage 이관
- 첫 로드 시 기존 localStorage 데이터 감지
- "기존 예산 데이터를 클라우드에 저장할까요?" 1회 제안
- 이관 후 localStorage 클리어

---

## 11. 공통 컴포넌트 & 디자인 시스템

### 컬러 토큰

```
── 그룹 색상 (모던 금융 톤) ──
obligation:  딥 네이비     #1E3A5F / dark: #93B8E8
necessity:   에메랄드 그린  #059669 / dark: #6EE7B7
sowing:      로얄 퍼플     #7C3AED / dark: #C4B5FD
want:        선셋 오렌지   #EA580C / dark: #FDBA74

── 기능 색상 ──
income:      그린          #16A34A
expense:     레드          #DC2626
balance:     네이비        #1E3A5F

── 베이스 ──
surface:     #FFFFFF / dark: #0F1419
card:        #F8FAFC / dark: #1A2030
border:      #E2E8F0 / dark: #2D3748
```

### 타이포그래피

```
금액 대형:     text-3xl  font-bold   tabular-nums
금액 중형:     text-xl   font-bold   tabular-nums
금액 소형:     text-base font-medium tabular-nums
그룹 제목:     text-lg   font-bold
항목 제목:     text-base font-medium
본문:          text-sm   font-normal
캡션:          text-xs   text-muted
```

### 공통 컴포넌트

| 컴포넌트 | 용도 |
|---------|------|
| `<FinanceCard>` | 모든 카드 베이스. rounded-2xl, 좌측 컬러 바 옵션 |
| `<AmountInput>` | 금액 입력. 시스템 키패드 + 빠른 단위 버튼 (+1만/+5만/+10만/+50만), 콤마 포매팅, shake 유효성 |
| `<MonthPicker>` | 월 선택 공통. "2026년 4월" + 좌/우 화살표 |
| `<GroupBadge>` | 그룹·항목 태그. 색상 도트 + 텍스트 |
| `<ProgressBar>` | 진행률 바. 그룹 색상, 80%+ 주황, 100%+ 빨간, 애니메이션 |
| `<BottomSheet>` | 바텀시트 입력 폼. 그룹→항목→금액→날짜→메모 |
| `<DonutChart>` | 도넛 차트. 4그룹 비율, 중앙 총액, 범례 |
| `<TransactionRow>` | 거래 한 줄. 색상 도트 + 설명 + 태그 + 금액 |
| `<EmptyState>` | 빈 상태. 안내 + CTA 버튼 |
| `<ConfirmDialog>` | 확인 다이얼로그. WCAG 접근성 유지 |

### 레이아웃 토큰

```
max-width:       max-w-2xl
page-padding:    px-4 pb-32 lg:pb-8
card-gap:        gap-4
section-gap:     gap-8
border-radius:   rounded-2xl (카드), rounded-xl (버튼/입력)
touch-target:    min-h-[44px]
```

### 접근성
- focus-visible 링 스타일
- aria 속성 전면 적용
- reduced-motion 대응
- 다크모드 전면 지원
- 최소 터치 타겟 44px

---

## 12. 사용자 시나리오 요약

### 일상 (매일)
1. 재정 허브 진입 → 오늘 요약 확인
2. 지출 발생 시 → FAB 또는 해당 그룹에서 빠른 입력 (기본 오늘, 과거 날짜도 가능)
3. 며칠치 모아서 입력할 때 → 날짜 변경해서 과거 거래 기록

### 월초
1. 해당 월 예산 없으면 "지난달 예산 가져올까요?" 확인 → 수입 변동 있으면 조정
2. 반복 거래 지정일에 자동 기록

### 월말
1. 월간 리포트 확인 → 수입/지출/그룹별 비율/예산 달성률
2. 다음 달 계획 수립

### 수시
- 빚 상환 → 의무사항에서 기록 → 출납부 자동 반영
- 할부 납부 → 할부 페이지에서 체크 → 출납부 자동 반영
- 하늘은행 심음/거둠 → 통장 형태로 기록
- 위시리스트 저축 → 요망사항에서 수동 적립

---

## 13. 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 접근법 | 풀 리빌드 (A) |
| 디자인 무드 | 카카오뱅크 (따뜻, 라운드, 여백) |
| 색상 | 모던 금융 (네이비/에메랄드/퍼플/오렌지) |
| 아키텍처 | 4그룹 중심, 각 그룹은 독립된 세계 |
| 입력 방식 | 어디서든 입력 가능, 날짜 기본 오늘+변경 가능 |
| 금액 키패드 | 시스템 키패드 + 빠른 단위 버튼 |
| 출납부 | 일일(날짜별 묶음) + 월별(표+그룹별 요약) |
| 예산 | 수입 기반 자동 배분 → 매달 자동 복사 + 조정 |
| 예산 경고 | 없음 (직접 확인) |
| 빚 | 자유 태그 분류 + 상환 타임라인 + 완납 예측 |
| 할부 | 상세 정보 + 납부 시 출납부 자동 기록 |
| 할부 vs 빚 | 명확히 분리 |
| 의무지출 | 금액 변동 추적 + 체크 시 출납부/예산 자동 반영 |
| 하늘은행 | 은행 앱 통장 스타일, 잔액=심음-거둠, 메타포 없이 깔끔 |
| 거둠 | 실제 금전 회수 (물질적 축복) |
| 심음 대상 | 프리셋 칩 + 자유 입력 |
| 요망사항 | 위시리스트 (우선순위, 수동 저축) |
| 커스텀 | 4그룹 자체 커스텀 (이름, 비율, 항목, 색상) |
| 비율 가이드 | 범위 + 부드러운 경고 |
| 수입 분류 | 카테고리별 (급여/부수입/투자수익/용돈/기타) |
| 반복 거래 | 등록 + 지정일 자동 기록 |
| 수정/삭제 | 확인 다이얼로그만 |
| 데이터 | 전부 Supabase |
| 리포트 | 월간, 카드 나열 |
| 온보딩 | 가이드 세팅 + 데모 체험 |
| 검색/필터 | 나중에 추가 |
| 반응형 | 모바일/데스크톱 50:50 대응 |

---

## 14. 마이그레이션 전략

### 기존 스키마 → 새 스키마

풀 리빌드이므로 기존 테이블을 직접 수정하지 않고, 새 테이블을 생성한 뒤 데이터를 이관한다.

**`finance_transactions` 이관:**
- 기존: `account_id` (문자열, "obligation_tithe" 형태), `category_id` (미사용, NULL)
- 신규: `group_id` + `item_id` + `income_category` + `source`
- 이관 쿼리: `account_id`를 `_` 기준으로 split → 앞부분 = `group_id`, 뒷부분 = `item_id`
- `source`는 기존 데이터 전부 `"manual"`로 설정
- `income_category`는 기존 수입 데이터에 NULL (카테고리 정보 없었음)

**`finance_budgets` 이관:**
- 기존 localStorage의 `faith-budget-{month}` 데이터 → Supabase `finance_budgets` 행으로 변환
- 첫 로드 시 localStorage 감지 → "클라우드에 저장할까요?" → 이관 → localStorage 클리어

**`finance_budget_settings` 신규 생성:**
- `group_configs` JSONB 초기값은 코드의 `FAITH_BUDGET_GROUPS` 상수에서 시드
- 이후 **`group_configs` JSONB가 단일 소스 오브 트루스**. 코드 상수는 온보딩 시드 전용
- `income_categories`는 기본값 `["급여", "부수입", "투자수익", "용돈", "기타"]`로 시드

**삭제 대상 (기존 테이블/코드):**
- `finance_accounts` 테이블 → 삭제 (group_id/item_id로 대체)
- `finance_categories` 테이블 → 삭제 (group_configs JSONB로 대체)
- `src/lib/finance-sections.ts` → 삭제 (4그룹 체계로 대체)
- Tailwind의 `surplus`, `debt` 색상 토큰 → 삭제
- 기존 그룹 색상 (rose=obligation, blue=necessity, amber=sowing, purple=want) → 새 색상으로 전면 교체

**추가 삭제/이관 대상:**
- `finance_obligations` 테이블 → 삭제. 의무지출은 이제 `finance_transactions`에 `group_id: "obligation"` + 반복 거래(`finance_recurring`)로 대체. 기존 데이터는 `finance_recurring`으로 이관 (category → item_id 매핑, amount 보존, is_paid 기록은 `finance_recurring_logs`로 변환)
- `finance_wants` 테이블 → `finance_wishlist`로 이관. 필드 매핑: `estimated_price` → `target_amount`, `is_purchased` → `is_completed`, `purchased_date` → `completed_at`. `saved_amount`는 0으로 초기화 (기존에 없던 필드), `priority`는 `created_at` 순서로 자동 부여

**기존 테이블 유지 (스키마 확장):**
- `finance_debts`: `tags TEXT[]`, `updated_at TIMESTAMPTZ` 컬럼 추가
- `finance_installments`: `updated_at TIMESTAMPTZ` 컬럼 추가
- `finance_debt_payments`: 변경 없음
- `heaven_bank`: `created_at TIMESTAMPTZ` 컬럼 추가

**`finance_transactions` 마이그레이션 순서 (FK/트리거 정리):**
1. 트리거 삭제: `DROP TRIGGER trg_recalc_balance_insert/update/delete ON finance_transactions`
2. 함수 삭제: `DROP FUNCTION recalculate_account_balance()`
3. FK 제약 해제: `ALTER TABLE finance_transactions DROP CONSTRAINT finance_transactions_account_id_fkey`
4. 새 컬럼 추가: `group_id TEXT`, `item_id TEXT`, `income_category TEXT`, `source TEXT DEFAULT 'manual'`
5. 데이터 이관: `account_id` → `group_id`/`item_id` split
6. 기존 컬럼 삭제: `account_id`, `category_id`
7. `finance_accounts`, `finance_categories` 테이블 삭제

**타입 변경 참고:**
- 기존 `amount NUMERIC` → 새 `amount INTEGER`. 기존 데이터에 소수점 값 없음 확인 후 `CAST(amount AS INTEGER)` 적용

**신규 테이블:**
- `finance_wishlist` (+ RLS 정책)
- `finance_recurring` (+ RLS 정책)
- `finance_recurring_logs` (+ RLS 정책)
- `finance_onboarding` (+ RLS 정책)

### RLS 정책
모든 신규 테이블에 기존과 동일한 패턴 적용:
```sql
ALTER TABLE finance_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wishlist" ON finance_wishlist
  FOR ALL USING (auth.uid() = user_id);
-- finance_recurring, finance_recurring_logs, finance_onboarding 동일 패턴
```

---

## 15. 트랜잭션 자동화 메커니즘

### 반복 거래 실행
- **트리거**: 클라이언트 사이드. 재정 허브 로드 시 실행
- **로직**:
  1. `finance_recurring`에서 `is_active = true`인 항목 조회
  2. 각 항목에 대해 `finance_recurring_logs`에서 현재 월 기록 확인
  3. 현재 월 기록이 없고, 오늘이 `day_of_month` 이후이면 실행
  4. `finance_transactions`에 거래 생성 (`source: "recurring"`)
  5. `finance_recurring_logs`에 실행 기록 생성
  6. 실행 결과를 토스트로 알림: "반복 거래 3건이 자동 기록되었습니다"
- **`day_of_month` 엣지 케이스**: 31일로 설정된 항목은 해당 월의 마지막 날로 조정 (2월은 28/29일)

### 할부 납부 → 출납부 연동
- "이번 달 납부하기" 클릭 → 확인 다이얼로그
- 단일 함수에서:
  1. `finance_installments.paid_months` + 1
  2. `finance_transactions`에 지출 생성 (`source: "installment"`, `group_id: "obligation"`, `item_id: "installment"`)
  3. 완납 판정 (paid_months >= total_months → is_completed = true)

### 빚 상환 → 출납부 연동
- 상환 기록 버튼 → 금액/메모 입력 → 확인
- 단일 함수에서:
  1. `finance_debt_payments`에 상환 기록
  2. `finance_transactions`에 지출 생성 (`source: "debt"`, `group_id: "obligation"`, `item_id: "debt"`)
  3. 총 상환액 >= 총액이면 `finance_debts.is_completed = true`

### 하늘은행 → 출납부 연동
- 심음/거둠 시 `heaven_bank` + `finance_transactions` 듀얼 라이트 (섹션 3-3 참조)
- `finance_transactions.source: "heaven_bank"`

### source별 출납부 표시 규칙
| source | 출납부 표시 | 수정 가능 | 삭제 가능 |
|--------|-----------|----------|----------|
| manual | 일반 표시 | O | O |
| recurring | "반복" 뱃지 | O (금액/메모) | O (해당 건만, 반복 등록은 유지) |
| installment | "할부" 뱃지 + 회차 | X (할부 페이지에서 관리) | X |
| debt | "상환" 뱃지 | X (빚 관리에서 관리) | X |
| heaven_bank | "하늘은행" 뱃지 | X (하늘은행에서 관리) | X |

---

## 16. 기술 명세 보충

### 할부의 그룹 할당
- 할부 납부 시 `finance_transactions`에 `group_id: "obligation"`, `item_id: "installment"` 할당
- 예산에서 "의무사항 > 할부" 항목이 기본 생성됨 (온보딩 시 시드에 포함하지 않되, 할부가 등록되면 자동 추가 제안)

### 도넛 차트 라이브러리
- `recharts` 사용 (React 생태계에서 가장 널리 쓰이고 SSR 호환)
- 커스텀 SVG가 필요한 경우 직접 구현도 가능 (도넛 차트는 비교적 단순)

### 예산 자동 저장 latency
- localStorage → Supabase 전환으로 저장 latency 증가 예상
- 디바운스: 500ms → 1000ms로 조정 (네트워크 왕복 고려)
- 저장 중 인디케이터: "저장 중..." → "저장됨"
- 저장 실패 시: 토스트 에러 + 로컬 상태 유지 (다음 변경 시 재시도)

### 에러 처리 & 오프라인
- Supabase 통신 실패 시: 에러 토스트 + 로컬 상태 유지
- PWA 오프라인: 현재 스펙에서 오프라인 기능은 지원하지 않음 (known limitation)
- 향후 개선 가능: Service Worker 캐싱 + 온라인 복귀 시 동기화
- 데모 모드는 Supabase 없이도 동작 (메모리 상태만 사용)

### 로딩 상태
- 모든 페이지에 해당 레이아웃을 미러링하는 Skeleton 컴포넌트 구현
- 기존 FinanceSkeleton/BudgetSkeleton/CashbookSkeleton 패턴 계승

### 데이터 유효성
- 금액 최대값: 999,999,999원 (9.9억)
- 설명 최대 길이: 100자
- 날짜 범위: 현재 월 ± 12개월

### updated_at 컬럼 추가 대상
- `finance_debts` → `updated_at TIMESTAMPTZ` 추가
- `finance_installments` → `updated_at TIMESTAMPTZ` 추가
- `finance_wishlist` → `updated_at TIMESTAMPTZ` 추가

---

## 17. 구현 페이징 (MVP → Full)

### Phase 1: 코어 (MVP)
1. Supabase 마이그레이션 (새 테이블 생성, 데이터 이관)
2. 공통 컴포넌트 (`FinanceCard`, `AmountInput`, `MonthPicker`, `GroupBadge`, `ProgressBar`, `BottomSheet`, `DonutChart`, `TransactionRow`)
3. 허브 대시보드
4. 4그룹 카드 페이지 (의무/필요/하늘은행/요망 기본 뷰 + 입력)
5. 출납부 (일일 + 월별)
6. 예산 관리

### Phase 2: 확장
7. 빚 관리 (상환 타임라인, 완납 예측, 자유 태그)
8. 할부 관리 (납부 → 출납부 연동)
9. 위시리스트
10. 반복 거래

### Phase 3: 마무리
11. 월간 리포트
12. 재정 설정 (그룹 커스터마이징, 수입 카테고리)
13. 온보딩 (가이드 + 데모 체험)
14. localStorage 이관 흐름
