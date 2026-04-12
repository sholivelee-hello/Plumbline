# Plumbline - Design Specification

> Personal life management PWA for tracking spiritual/physical basics, schedule, and finances.

## 1. Overview

**Service Name:** Plumbline
**Purpose:** Spiritual/physical daily basics management, schedule planning vs actual tracking, faith-based financial management
**User:** Single user (personal use only)
**Platforms:** PC + Mobile (PWA)
**Design Tone:** Warm, soft, pastel colors, rounded cards

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel (free tier) |
| PWA | next-pwa (service worker, offline cache) |

## 3. Architecture

```
Client (Next.js PWA)
  ├── Dashboard (Home)
  ├── Basics (daily check)
  ├── Schedule (weekly/monthly)
  └── Finance (budget/tracking)
        │
        ▼ HTTPS
Next.js API Routes
        │
        ▼
Supabase (Auth + PostgreSQL + Realtime)
```

- Deploy on Vercel (free tier)
- Supabase Realtime for cross-device sync
- Offline: cache last synced data, auto-sync on reconnect

## 4. Page Structure

Bottom tab navigation with 4 tabs:

| Tab | Page | Description |
|-----|------|-------------|
| Home | Dashboard | Today's basics progress + upcoming events + monthly finance summary |
| Basics | Basics Check | Daily spiritual/physical basics checklist |
| Schedule | Calendar | Weekly (time blocks) + Monthly (events) view |
| Finance | Finance | Heaven bank + obligations + necessities + wants + surplus + debts |

## 5. Feature: Basics Management

### 5.1 Concept

"Basics" are not habits — they are essential spiritual and physical fundamentals that must be maintained daily. Once configured, they repeat every day until the user modifies them.

### 5.2 Categories

- **Spiritual:** Prayer (with hours tracking), Meditation, Bible Reading
- **Physical:** Butter intake, Supplements, Sleep (7hr target), Smoothie

### 5.3 Check Types

| Type | Behavior | Example |
|------|----------|---------|
| `check` | Simple toggle (done/not done) | Butter, Supplements, Smoothie |
| `number` | Numeric input with target value | Prayer (hours), Sleep (hours) |

- Number type: tap opens input popup, auto-completes when target reached
- Templates persist daily until user modifies them
- New checklist auto-generated at midnight based on active templates

### 5.4 Statistics

- Weekly/monthly completion rate graph
- Per-item streak (consecutive completion days)
- Category-level comparison

## 6. Feature: Schedule Management

### 6.1 Weekly View — Plan vs Actual (2-Column)

Each day has two columns side by side:
- **Left column:** Plan (what was planned)
- **Right column:** Actual (what was actually done)

7 days x 2 columns visible at once. Time range: **04:00 ~ 00:00** (configurable via user settings).

### 6.2 Time Unit Selection

User can choose grid granularity:
- 10 min / 15 min / 30 min (default) / 1 hour

### 6.3 Plan to Actual Transition

1. Tap a plan block → action sheet appears
2. **"Complete"** → copies plan to actual as-is
3. **"Edit & Complete"** → modify time/title, then save as actual
4. **"Not Done"** → plan remains, no actual record
5. **"+"** button → add actual-only entry (unplanned activity)

### 6.4 Monthly View — Events Only

- Events displayed as horizontal bars spanning date range
- Tap a date → navigate to that day's weekly view
- Multi-day events supported

### 6.5 Schedule Presets

Frequently used activities saved as presets:
- Stored: title, default duration (minutes), color
- Sorted by usage frequency (most used first)
- Flow: tap empty block → preset list popup → select → block created → adjust time if needed
- New activities can be saved as preset after creation

### 6.6 User Settings

```
day_start_time: '04:00'
day_end_time:   '00:00'
timezone:       'Asia/Seoul'
```

## 7. Feature: Finance Management

### 7.1 Financial Structure (Priority Order)

| Priority | Category | Type | Description |
|----------|----------|------|-------------|
| 1 | Sowing & Reaping (심고거둠) | Spiritual investment | Giving to the poor, missions, Kingdom projects |
| 2 | Obligations (의무사항) | Fixed expenses | Tithe, offerings, debt repayment, utilities, parents' allowance, rent |
| 3 | Necessities (필요사항) | Living essentials | Transportation, savings, living expenses, allowance |
| 4 | Wants (요망사항) | Nice-to-haves | Wishlist items |
| 5 | Surplus Saving (여윳돈 모으기) | Extra savings | Leftover money saving |

### 7.2 Heaven Bank (하늘은행 통장)

A special passbook-style ledger for spiritual sowing and reaping:

- **Sow (입금/심음):** Record giving to: the poor, missions (성빈), Kingdom projects (하늘나라 프로젝트)
- **Reap (출금/거둠):** Record God's provision with description
- Daily entries, monthly view
- Visual format: bank passbook style with date, description, deposit, withdrawal columns
- Monthly/cumulative totals displayed

### 7.3 Obligations (의무사항)

- Items: Tithe, Offerings, Debt repayment, Utilities, Parents' allowance, Rent
- **Auto-carry from previous month** (amounts editable)
- Each item: paid/unpaid toggle with paid date
- Monthly total and completion status

### 7.4 Necessities (필요사항)

- Categories: Transportation, Savings, Living expenses, Allowance
- Budget per category + spending tracking
- Monthly progress bars

### 7.5 Wants (요망사항)

- Wishlist format: item name + estimated price + purchase complete toggle
- Not urgent — "nice to have" items

### 7.6 Surplus Saving (여윳돈 모으기)

- Goal amount setting
- Current saved amount with progress bar

### 7.7 Debt Management (빚 관리)

- Register debts with total amount and title
- Track repayments with date and amount
- Visual progress bar showing repayment percentage
- When obligation "debt repayment" is marked paid → auto-reflects in debt payment record
- Celebration on full repayment

### 7.8 Accounts

- Bank accounts and debit cards (no credit cards, no investments)
- Per-account balance tracking
- Color coding per account

## 8. Dashboard (Home)

Three summary cards on one scrollable page:

### 8.1 Today's Basics
- Completion count (e.g., 3/7)
- Progress bar with percentage
- Quick view of each item's status by category

### 8.2 Upcoming Events
- Only shows events (not daily routine time blocks)
- Date + event title, sorted chronologically
- "No upcoming events" message when empty

### 8.3 Monthly Finance Summary
- Heaven bank sowing total
- Obligations paid/total
- Necessities spent/budget
- Surplus saved amount

## 9. Data Model

### users (managed by Supabase Auth)
```
id, email, created_at
```

### user_settings
```
id, user_id
day_start_time    TEXT  DEFAULT '04:00'
day_end_time      TEXT  DEFAULT '00:00'
timezone          TEXT  DEFAULT 'Asia/Seoul'
```

### basics_templates
```
id, user_id
category          TEXT  -- 'spiritual' | 'physical'
title             TEXT
type              TEXT  -- 'check' | 'number'
unit              TEXT  -- nullable, for number type
target_value      NUMERIC  -- nullable, for number type
sort_order        INTEGER
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ
```

### basics_logs
```
id, user_id
template_id       UUID REFERENCES basics_templates
date              DATE
completed         BOOLEAN DEFAULT false
value             NUMERIC  -- nullable, for number type
completed_at      TIMESTAMPTZ
```

### events
```
id, user_id
title             TEXT
start_date        DATE
end_date          DATE
color             TEXT
memo              TEXT
```

### schedule_presets
```
id, user_id
title             TEXT
duration          INTEGER  -- minutes
color             TEXT
usage_count       INTEGER DEFAULT 0
last_used_at      TIMESTAMPTZ
```

### schedule_plans
```
id, user_id
date              DATE
start_time        TIME
end_time          TIME
title             TEXT
color             TEXT
preset_id         UUID REFERENCES schedule_presets  -- nullable
```

### schedule_actuals
```
id, user_id
plan_id           UUID REFERENCES schedule_plans  -- nullable
date              DATE
start_time        TIME
end_time          TIME
title             TEXT
color             TEXT
is_from_plan      BOOLEAN DEFAULT false
```

### finance_accounts
```
id, user_id
name              TEXT
type              TEXT  -- 'bank' | 'debit_card'
balance           NUMERIC DEFAULT 0
color             TEXT
```

### finance_categories
```
id, user_id
type              TEXT  -- 'sowing' | 'obligation' | 'necessity' | 'want' | 'surplus'
title             TEXT
default_amount    NUMERIC  -- for obligations auto-carry
sort_order        INTEGER
```

### heaven_bank
```
id, user_id
date              DATE
type              TEXT  -- 'sow' | 'reap'
target            TEXT  -- sow: "the poor", "missions", etc.
description       TEXT  -- reap: "God's provision - friend bought dinner"
amount            NUMERIC
```

### finance_obligations
```
id, user_id
month             TEXT  -- '2026-04'
category_id       UUID REFERENCES finance_categories
amount            NUMERIC
is_paid           BOOLEAN DEFAULT false
paid_date         DATE
```

### finance_transactions
```
id, user_id
account_id        UUID REFERENCES finance_accounts
type              TEXT  -- 'income' | 'expense'
amount            NUMERIC
category_id       UUID REFERENCES finance_categories
description       TEXT
date              DATE
is_auto           BOOLEAN DEFAULT false
```

### finance_budgets
```
id, user_id
category_id       UUID REFERENCES finance_categories
amount            NUMERIC
month             TEXT  -- '2026-04'
```

### finance_debts
```
id, user_id
title             TEXT
total_amount      NUMERIC
created_at        TIMESTAMPTZ
is_completed      BOOLEAN DEFAULT false
```

### finance_debt_payments
```
id
debt_id           UUID REFERENCES finance_debts
amount            NUMERIC
date              DATE
memo              TEXT
```

## 10. Authentication

- Supabase Auth with email/password
- Single user — no multi-user features needed
- Session persists across devices via Supabase token

## 11. Design Direction

- **Tone:** Warm, soft, approachable
- **Colors:** Pastel palette — soft creams, light greens, gentle blues, warm beiges
- **Components:** Rounded cards, soft shadows, comfortable spacing
- **Typography:** Clean, readable, friendly
- **Mobile:** Bottom tab navigation, thumb-friendly tap targets
- **PC:** Responsive layout, wider cards, more content visible

## 12. Future Considerations (Not in MVP)

- Push notifications (PWA service worker)
- Bank SMS auto-parsing for transaction entry
- Data export/backup
- Dark mode
