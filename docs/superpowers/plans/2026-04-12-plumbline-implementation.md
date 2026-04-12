# Plumbline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal life management PWA with three pillars — spiritual/physical basics tracking, schedule management (plan vs actual), and faith-based financial management.

**Architecture:** Next.js App Router + Supabase (Auth, PostgreSQL, Realtime) + Tailwind CSS, deployed on Vercel. Bottom tab navigation with 4 tabs: Dashboard, Basics, Schedule, Finance. PWA with offline read-only mode.

**Tech Stack:** Next.js 15, React 19, Supabase JS v2, Tailwind CSS 4, TypeScript, next-pwa

**Spec:** `docs/superpowers/specs/2026-04-12-plumbline-design.md`

---

## File Structure

```
plumbline/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx                    -- root layout, font, metadata
│   │   ├── page.tsx                      -- dashboard (home tab)
│   │   ├── basics/
│   │   │   ├── page.tsx                  -- daily basics check
│   │   │   └── settings/
│   │   │       └── page.tsx              -- basics template management
│   │   ├── schedule/
│   │   │   └── page.tsx                  -- weekly + monthly views
│   │   ├── finance/
│   │   │   ├── page.tsx                  -- finance overview
│   │   │   ├── heaven-bank/
│   │   │   │   └── page.tsx              -- heaven bank passbook
│   │   │   ├── obligations/
│   │   │   │   └── page.tsx              -- monthly obligations
│   │   │   ├── debts/
│   │   │   │   └── page.tsx              -- debt management
│   │   │   └── accounts/
│   │   │       └── page.tsx              -- account management
│   │   ├── settings/
│   │   │   └── page.tsx                  -- user settings (time, timezone)
│   │   └── login/
│   │       └── page.tsx                  -- email/password login
│   ├── components/
│   │   ├── ui/
│   │   │   ├── card.tsx                  -- rounded card with soft shadow
│   │   │   ├── progress-bar.tsx          -- animated progress bar
│   │   │   ├── tab-nav.tsx              -- bottom tab navigation
│   │   │   ├── modal.tsx                -- reusable modal/action sheet
│   │   │   ├── toggle.tsx               -- check toggle
│   │   │   └── number-input.tsx         -- number input with unit
│   │   ├── basics/
│   │   │   ├── basics-list.tsx          -- daily checklist grouped by category
│   │   │   ├── basics-item.tsx          -- single basic item (check/number)
│   │   │   └── template-form.tsx        -- add/edit basics template
│   │   ├── schedule/
│   │   │   ├── weekly-view.tsx          -- 7-day 2-column time grid
│   │   │   ├── monthly-view.tsx         -- calendar with event bars
│   │   │   ├── time-block.tsx           -- single time block
│   │   │   ├── block-action-sheet.tsx   -- complete/edit/not done actions
│   │   │   ├── preset-picker.tsx        -- preset selection popup
│   │   │   └── block-form.tsx           -- create/edit time block
│   │   ├── finance/
│   │   │   ├── heaven-bank-ledger.tsx   -- passbook-style table
│   │   │   ├── heaven-bank-form.tsx     -- sow/reap entry form
│   │   │   ├── obligations-list.tsx     -- monthly obligations with toggles
│   │   │   ├── necessities-tracker.tsx  -- budget vs spending bars
│   │   │   ├── wants-list.tsx           -- wishlist items
│   │   │   ├── surplus-tracker.tsx      -- goal progress bar
│   │   │   ├── debt-card.tsx            -- single debt with progress
│   │   │   ├── debt-payment-form.tsx    -- record payment
│   │   │   └── account-card.tsx         -- account balance display
│   │   └── dashboard/
│   │       ├── basics-summary.tsx       -- today's basics progress card
│   │       ├── events-summary.tsx       -- upcoming events card
│   │       └── finance-summary.tsx      -- monthly finance card
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               -- browser Supabase client
│   │   │   ├── server.ts               -- server-side Supabase client
│   │   │   └── middleware.ts            -- auth session refresh
│   │   ├── hooks/
│   │   │   ├── use-basics.ts            -- basics CRUD + daily generation
│   │   │   ├── use-schedule.ts          -- schedule plans/actuals CRUD
│   │   │   ├── use-events.ts            -- events CRUD
│   │   │   ├── use-finance.ts           -- transactions, budgets, surplus
│   │   │   ├── use-heaven-bank.ts       -- heaven bank CRUD
│   │   │   ├── use-obligations.ts       -- obligations + auto-carry
│   │   │   ├── use-debts.ts             -- debts + payments
│   │   │   ├── use-wants.ts             -- wants CRUD
│   │   │   └── use-settings.ts          -- user settings CRUD
│   │   └── utils/
│   │       ├── date.ts                  -- logical date calc, day boundary
│   │       └── format.ts               -- currency, time formatting
│   └── types/
│       └── database.ts                  -- TypeScript types for all tables
├── supabase/
│   └── migrations/
│       ├── 00001_user_settings.sql
│       ├── 00002_basics.sql
│       ├── 00003_schedule.sql
│       ├── 00004_finance.sql
│       └── 00005_indexes_rls.sql
├── middleware.ts                         -- Next.js middleware for auth
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Next.js Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
cd "C:/Users/MIR-NOT-DXD-003/Desktop/위클리"
# Note: this directory already has docs/ folder. create-next-app will scaffold around it.
# If it fails due to non-empty dir, move docs/ out, scaffold, then move docs/ back.
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This scaffolds Next.js with App Router + Tailwind + TypeScript.

- [ ] **Step 2: Verify project runs**

```bash
npm run dev
```

Expected: Dev server starts at localhost:3000, default Next.js page loads.

- [ ] **Step 3: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @serwist/next lucide-react recharts
npm install -D supabase vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Configure Tailwind with warm pastel theme**

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: { 50: "#fefcf8", 100: "#fdf6ee", 200: "#f9e8d4", 300: "#f0d4b4" },
        sage: { 50: "#f4f8f4", 100: "#e8f0e8", 200: "#c8dcc8", 300: "#a8c8a8" },
        sky: { 50: "#f0f4f8", 100: "#e0e8f0", 200: "#c8d4e8", 300: "#a8b8d0" },
        warm: { 50: "#faf8f5", 100: "#f5f0e8", 200: "#e8dcd0", 300: "#d4c4b0", 400: "#b8a48c", 500: "#9c8470", 600: "#7c6854", 700: "#5c4c3c" },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind warm theme"
```

---

### Task 2: Supabase Setup & Database Schema

**Files:**
- Create: `supabase/migrations/00001_user_settings.sql`
- Create: `supabase/migrations/00002_basics.sql`
- Create: `supabase/migrations/00003_schedule.sql`
- Create: `supabase/migrations/00004_finance.sql`
- Create: `supabase/migrations/00005_indexes_rls.sql`
- Create: `.env.local`

- [ ] **Step 1: Initialize Supabase**

```bash
npx supabase init
```

- [ ] **Step 2: Create user_settings migration**

Create `supabase/migrations/00001_user_settings.sql`:

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  day_start_time TEXT NOT NULL DEFAULT '04:00',
  day_end_time TEXT NOT NULL DEFAULT '00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  time_unit INTEGER NOT NULL DEFAULT 30 CHECK (time_unit IN (10, 15, 30, 60)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 3: Create basics migration**

Create `supabase/migrations/00002_basics.sql`:

```sql
CREATE TABLE basics_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('spiritual', 'physical')),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('check', 'number')),
  unit TEXT,
  target_value NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE basics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES basics_templates(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  value NUMERIC,
  completed_at TIMESTAMPTZ,
  UNIQUE(template_id, date)
);

ALTER TABLE basics_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE basics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON basics_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own logs"
  ON basics_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 4: Create schedule migration**

Create `supabase/migrations/00003_schedule.sql`:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  color TEXT NOT NULL DEFAULT '#d4c4b0',
  memo TEXT
);

CREATE TABLE schedule_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  color TEXT NOT NULL DEFAULT '#c8d4e8',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE schedule_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#c8d4e8',
  preset_id UUID REFERENCES schedule_presets(id) ON DELETE SET NULL
);

CREATE TABLE schedule_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES schedule_plans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#c8d4e8',
  is_from_plan BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own events"
  ON events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own presets"
  ON schedule_presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own plans"
  ON schedule_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own actuals"
  ON schedule_actuals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 5: Create finance migration**

Create `supabase/migrations/00004_finance.sql`:

```sql
CREATE TABLE finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'debit_card')),
  balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#c8dcc8'
);

CREATE TABLE finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sowing', 'obligation', 'necessity', 'surplus')),
  title TEXT NOT NULL,
  default_amount NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE heaven_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sow', 'reap')),
  target TEXT,
  description TEXT,
  amount NUMERIC NOT NULL
);

CREATE TABLE finance_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_completed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE finance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  linked_debt_id UUID REFERENCES finance_debts(id) ON DELETE SET NULL
);

CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES finance_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  description TEXT,
  date DATE NOT NULL,
  is_auto BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL
);

CREATE TABLE finance_debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  debt_id UUID REFERENCES finance_debts(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  memo TEXT
);

CREATE TABLE finance_wants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  estimated_price NUMERIC,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  purchased_date DATE,
  created_month TEXT NOT NULL
);

-- RLS for all finance tables
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE heaven_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_wants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON finance_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON heaven_bank FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_obligations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_debt_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_wants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Balance recalculation function
CREATE OR REPLACE FUNCTION recalculate_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE finance_accounts
  SET balance = COALESCE((
    SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
    FROM finance_transactions
    WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)
  ), 0)
  WHERE id = COALESCE(NEW.account_id, OLD.account_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_balance_insert
  AFTER INSERT ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION recalculate_account_balance();

CREATE TRIGGER trg_recalc_balance_update
  AFTER UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION recalculate_account_balance();

CREATE TRIGGER trg_recalc_balance_delete
  AFTER DELETE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION recalculate_account_balance();
```

- [ ] **Step 6: Create indexes migration**

Create `supabase/migrations/00005_indexes_rls.sql`:

```sql
CREATE INDEX idx_basics_logs_user_date ON basics_logs(user_id, date);
CREATE INDEX idx_schedule_plans_user_date ON schedule_plans(user_id, date);
CREATE INDEX idx_schedule_actuals_user_date ON schedule_actuals(user_id, date);
CREATE INDEX idx_heaven_bank_user_date ON heaven_bank(user_id, date);
CREATE INDEX idx_finance_transactions_user_date ON finance_transactions(user_id, date);
CREATE INDEX idx_finance_obligations_user_month ON finance_obligations(user_id, month);
CREATE INDEX idx_finance_budgets_user_month ON finance_budgets(user_id, month);
CREATE INDEX idx_finance_debt_payments_user_debt ON finance_debt_payments(user_id, debt_id);
```

- [ ] **Step 7: Set up .env.local**

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Add `.env.local` to `.gitignore` if not already there.

- [ ] **Step 8: Commit**

```bash
git add supabase/ .env.local.example .gitignore
git commit -m "feat: add Supabase migrations for all tables with RLS and indexes"
```

---

### Task 3: Supabase Client & Auth

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create auth middleware**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

Create `middleware.ts` (project root):

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)"],
};
```

- [ ] **Step 4: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-card shadow-card p-8">
        <h1 className="text-2xl font-bold text-warm-700 text-center mb-2">
          Plumbline
        </h1>
        <p className="text-warm-400 text-center text-sm mb-8">
          나의 하루를 세우는 다림줄
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-warm-500 text-white font-medium hover:bg-warm-600 transition-colors"
          >
            {isSignUp ? "회원가입" : "로그인"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-4 text-sm text-warm-400 hover:text-warm-600"
        >
          {isSignUp ? "이미 계정이 있어요" : "계정 만들기"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify login page renders**

```bash
npm run dev
```

Navigate to `localhost:3000/login`. Expected: warm-toned login form renders.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/ middleware.ts src/app/login/
git commit -m "feat: add Supabase auth with login page and middleware"
```

---

### Task 4: TypeScript Types & Utility Functions

**Files:**
- Create: `src/types/database.ts`
- Create: `src/lib/utils/date.ts`
- Create: `src/lib/utils/format.ts`

- [ ] **Step 1: Create database types**

Create `src/types/database.ts`:

```typescript
export type BasicCategory = "spiritual" | "physical";
export type BasicType = "check" | "number";
export type ScheduleTimeUnit = 10 | 15 | 30 | 60;
export type HeavenBankEntryType = "sow" | "reap";
export type FinanceCategoryType = "sowing" | "obligation" | "necessity" | "surplus";
export type AccountType = "bank" | "debit_card";
export type TransactionType = "income" | "expense";

export interface UserSettings {
  id: string;
  user_id: string;
  day_start_time: string;
  day_end_time: string;
  timezone: string;
  time_unit: ScheduleTimeUnit;
}

export interface BasicsTemplate {
  id: string;
  user_id: string;
  category: BasicCategory;
  title: string;
  type: BasicType;
  unit: string | null;
  target_value: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BasicsLog {
  id: string;
  user_id: string;
  template_id: string;
  date: string;
  completed: boolean;
  value: number | null;
  completed_at: string | null;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  color: string;
  memo: string | null;
}

export interface SchedulePreset {
  id: string;
  user_id: string;
  title: string;
  duration: number;
  color: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface SchedulePlan {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  color: string;
  preset_id: string | null;
}

export interface ScheduleActual {
  id: string;
  user_id: string;
  plan_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  color: string;
  is_from_plan: boolean;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
}

export interface FinanceCategory {
  id: string;
  user_id: string;
  type: FinanceCategoryType;
  title: string;
  default_amount: number | null;
  sort_order: number;
}

export interface HeavenBankEntry {
  id: string;
  user_id: string;
  date: string;
  type: HeavenBankEntryType;
  target: string | null;
  description: string | null;
  amount: number;
}

export interface FinanceObligation {
  id: string;
  user_id: string;
  month: string;
  category_id: string;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  linked_debt_id: string | null;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string | null;
  date: string;
  is_auto: boolean;
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: string;
}

export interface FinanceDebt {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  created_at: string;
  is_completed: boolean;
}

export interface FinanceDebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  memo: string | null;
}

export interface FinanceWant {
  id: string;
  user_id: string;
  title: string;
  estimated_price: number | null;
  is_purchased: boolean;
  purchased_date: string | null;
  created_month: string;
}
```

- [ ] **Step 2: Create date utilities**

Create `src/lib/utils/date.ts`:

```typescript
/**
 * Get the "logical date" based on day_start_time.
 * If current time is before day_start_time, the logical date is yesterday.
 * Example: at 02:00 with day_start=04:00, logical date is previous day.
 */
export function getLogicalDate(dayStartTime: string = "04:00"): string {
  const now = new Date();
  const [startHour, startMin] = dayStartTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;

  if (currentMinutes < startMinutes) {
    now.setDate(now.getDate() - 1);
  }

  return now.toISOString().split("T")[0];
}

/**
 * Format date as Korean style: "4월 12일 (토)"
 */
export function formatDateKR(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * Get Monday of the week containing the given date.
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

/**
 * Get array of 7 date strings starting from Monday.
 */
export function getWeekDates(dateStr: string): string[] {
  const monday = getWeekStart(dateStr);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + "T00:00:00");
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Get current month string: '2026-04'
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Generate time slots between start and end with given interval.
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  let [h, m] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const endMinutes = endTime === "00:00" ? 24 * 60 : endH * 60 + endM;

  while (h * 60 + m < endMinutes) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += intervalMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
  }
  return slots;
}
```

- [ ] **Step 3: Create format utilities**

Create `src/lib/utils/format.ts`:

```typescript
/**
 * Format number as Korean Won: 1,000,000
 */
export function formatWon(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

/**
 * Format time: "09:00"
 */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Calculate percentage, clamped to 0-100.
 */
export function calcPercent(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/lib/utils/
git commit -m "feat: add TypeScript types and date/format utilities"
```

---

### Task 5: Shared UI Components & Layout

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/progress-bar.tsx`
- Create: `src/components/ui/tab-nav.tsx`
- Create: `src/components/ui/modal.tsx`
- Create: `src/components/ui/toggle.tsx`
- Create: `src/components/ui/number-input.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Card component**

Create `src/components/ui/card.tsx`:

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-card shadow-card p-5 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create ProgressBar component**

Create `src/components/ui/progress-bar.tsx`:

```tsx
interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: string;
}

export function ProgressBar({
  percent,
  color = "bg-sage-300",
  height = "h-2.5",
}: ProgressBarProps) {
  return (
    <div className={`w-full ${height} bg-warm-100 rounded-full overflow-hidden`}>
      <div
        className={`${height} ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create TabNav component**

Create `src/components/ui/tab-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/basics", label: "베이직", icon: "📖" },
  { href: "/schedule", label: "일정", icon: "📅" },
  { href: "/finance", label: "재정", icon: "💰" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-100 px-2 pb-safe z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-4 text-xs transition-colors ${
                isActive ? "text-warm-600" : "text-warm-300"
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className={isActive ? "font-semibold" : ""}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Create Modal component**

Create `src/components/ui/modal.tsx`:

```tsx
"use client";

import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6">
        {title && (
          <h3 className="text-lg font-semibold text-warm-700 mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Toggle and NumberInput components**

Create `src/components/ui/toggle.tsx`:

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, size = "md" }: ToggleProps) {
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`${sizeClass} rounded-lg border-2 flex items-center justify-center transition-all ${
        checked
          ? "bg-sage-200 border-sage-300 text-sage-600"
          : "bg-warm-50 border-warm-200 text-transparent"
      }`}
    >
      {checked && <span className="text-sm">✓</span>}
    </button>
  );
}
```

Create `src/components/ui/number-input.tsx`:

```tsx
"use client";

import { useState } from "react";

interface NumberInputProps {
  value: number | null;
  unit: string;
  target: number | null;
  onSave: (value: number) => void;
  onClose: () => void;
}

export function NumberInput({ value, unit, target, onSave, onClose }: NumberInputProps) {
  const [input, setInput] = useState(value?.toString() ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.5"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 text-center text-lg focus:outline-none focus:ring-2 focus:ring-warm-300"
          autoFocus
        />
        <span className="text-warm-500">{unit}</span>
      </div>
      {target && (
        <p className="text-sm text-warm-400 text-center">목표: {target}{unit}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-500"
        >
          취소
        </button>
        <button
          onClick={() => { if (input) onSave(parseFloat(input)); }}
          className="flex-1 py-2.5 rounded-xl bg-warm-500 text-white font-medium"
        >
          저장
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update root layout with TabNav**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { TabNav } from "@/components/ui/tab-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plumbline",
  description: "나의 하루를 세우는 다림줄",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fefcf8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-cream-50 text-warm-700 antialiased">
        <main className="max-w-lg mx-auto pb-20 min-h-screen">
          {children}
        </main>
        <TabNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify layout renders**

```bash
npm run dev
```

Expected: warm cream background, bottom tab navigation visible.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/ src/app/layout.tsx
git commit -m "feat: add shared UI components and root layout with tab navigation"
```

---

## Phase 2: Basics Feature

### Task 6: Basics Hook & Daily Generation

**Files:**
- Create: `src/lib/hooks/use-settings.ts`
- Create: `src/lib/hooks/use-basics.ts`

- [ ] **Step 1: Create useSettings hook**

Create `src/lib/hooks/use-settings.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types/database";

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id"> = {
  day_start_time: "04:00",
  day_end_time: "00:00",
  timezone: "Asia/Seoul",
  time_unit: 30,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!data) {
        const { data: created } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
          .select()
          .single();
        setSettings(created);
      } else {
        setSettings(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function update(updates: Partial<UserSettings>) {
    if (!settings) return;
    const { data } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("id", settings.id)
      .select()
      .single();
    if (data) setSettings(data);
  }

  return { settings, loading, update };
}
```

- [ ] **Step 2: Create useBasics hook**

Create `src/lib/hooks/use-basics.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLogicalDate } from "@/lib/utils/date";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

export function useBasics(dayStartTime: string = "04:00") {
  const [templates, setTemplates] = useState<BasicsTemplate[]>([]);
  const [logs, setLogs] = useState<BasicsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const today = getLogicalDate(dayStartTime);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("basics_templates")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");
    if (data) setTemplates(data);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("basics_logs")
      .select("*")
      .eq("date", today);
    if (data) setLogs(data);
  }, [today]);

  // Generate daily logs if missing
  const generateDailyLogs = useCallback(async () => {
    const { data: existing } = await supabase
      .from("basics_logs")
      .select("template_id")
      .eq("date", today);

    const existingIds = new Set((existing ?? []).map((l) => l.template_id));
    const { data: active } = await supabase
      .from("basics_templates")
      .select("id, user_id")
      .eq("is_active", true);

    const missing = (active ?? []).filter((t) => !existingIds.has(t.id));
    if (missing.length > 0) {
      await supabase.from("basics_logs").insert(
        missing.map((t) => ({
          user_id: t.user_id,
          template_id: t.id,
          date: today,
        }))
      );
    }
  }, [today]);

  useEffect(() => {
    async function init() {
      await loadTemplates();
      await generateDailyLogs();
      await loadLogs();
      setLoading(false);
    }
    init();
  }, []);

  async function toggleCheck(logId: string, completed: boolean) {
    await supabase
      .from("basics_logs")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", logId);
    await loadLogs();
  }

  async function updateValue(logId: string, value: number, targetValue: number | null) {
    const completed = targetValue ? value >= targetValue : value > 0;
    await supabase
      .from("basics_logs")
      .update({
        value,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", logId);
    await loadLogs();
  }

  async function addTemplate(template: Omit<BasicsTemplate, "id" | "user_id" | "created_at" | "is_active" | "sort_order">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("basics_templates").insert({
      ...template,
      user_id: user.id,
      sort_order: templates.length,
    });
    await loadTemplates();
    await generateDailyLogs();
    await loadLogs();
  }

  async function deactivateTemplate(templateId: string) {
    await supabase
      .from("basics_templates")
      .update({ is_active: false })
      .eq("id", templateId);
    await loadTemplates();
  }

  return {
    templates,
    logs,
    loading,
    today,
    toggleCheck,
    updateValue,
    addTemplate,
    deactivateTemplate,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/
git commit -m "feat: add useSettings and useBasics hooks with daily log generation"
```

---

### Task 7: Basics UI — Daily Check Page

**Files:**
- Create: `src/components/basics/basics-list.tsx`
- Create: `src/components/basics/basics-item.tsx`
- Create: `src/app/basics/page.tsx`

- [ ] **Step 1: Create BasicsItem component**

Create `src/components/basics/basics-item.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import { NumberInput } from "@/components/ui/number-input";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsItemProps {
  template: BasicsTemplate;
  log: BasicsLog | undefined;
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

export function BasicsItem({ template, log, onToggle, onUpdateValue }: BasicsItemProps) {
  const [showInput, setShowInput] = useState(false);

  if (!log) return null;

  function handleTap() {
    if (template.type === "check") {
      onToggle(log!.id, !log!.completed);
    } else {
      setShowInput(true);
    }
  }

  return (
    <>
      <div
        onClick={handleTap}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${
          log.completed ? "bg-sage-50" : "bg-warm-50"
        }`}
      >
        <Toggle checked={log.completed} onChange={() => handleTap()} size="md" />
        <span className={`flex-1 ${log.completed ? "text-warm-400 line-through" : "text-warm-700"}`}>
          {template.title}
        </span>
        {template.type === "number" && (
          <span className="text-sm text-warm-400">
            {log.value ?? 0}{template.unit}
            {template.target_value && ` / ${template.target_value}`}
          </span>
        )}
      </div>

      <Modal isOpen={showInput} onClose={() => setShowInput(false)} title={template.title}>
        <NumberInput
          value={log.value}
          unit={template.unit ?? ""}
          target={template.target_value}
          onSave={(v) => {
            onUpdateValue(log!.id, v, template.target_value);
            setShowInput(false);
          }}
          onClose={() => setShowInput(false)}
        />
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Create BasicsList component**

Create `src/components/basics/basics-list.tsx`:

```tsx
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BasicsItem } from "./basics-item";
import { calcPercent } from "@/lib/utils/format";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsListProps {
  templates: BasicsTemplate[];
  logs: BasicsLog[];
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

export function BasicsList({ templates, logs, onToggle, onUpdateValue }: BasicsListProps) {
  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");
  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = templates.length;
  const percent = calcPercent(completedCount, totalCount);

  function getLog(templateId: string) {
    return logs.find((l) => l.template_id === templateId);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-warm-500 text-sm">오늘 달성률</span>
          <span className="text-warm-600 font-semibold">{completedCount}/{totalCount}</span>
        </div>
        <ProgressBar percent={percent} />
        <p className="text-right text-sm text-warm-400 mt-1">{percent}%</p>
      </Card>

      {spiritual.length > 0 && (
        <Card>
          <h3 className="text-warm-600 font-semibold mb-3">
            📖 영적 베이직
            <span className="text-warm-400 font-normal text-sm ml-2">
              {spiritual.filter((t) => getLog(t.id)?.completed).length}/{spiritual.length}
            </span>
          </h3>
          <div className="space-y-2">
            {spiritual.map((t) => (
              <BasicsItem
                key={t.id}
                template={t}
                log={getLog(t.id)}
                onToggle={onToggle}
                onUpdateValue={onUpdateValue}
              />
            ))}
          </div>
        </Card>
      )}

      {physical.length > 0 && (
        <Card>
          <h3 className="text-warm-600 font-semibold mb-3">
            💪 신체적 베이직
            <span className="text-warm-400 font-normal text-sm ml-2">
              {physical.filter((t) => getLog(t.id)?.completed).length}/{physical.length}
            </span>
          </h3>
          <div className="space-y-2">
            {physical.map((t) => (
              <BasicsItem
                key={t.id}
                template={t}
                log={getLog(t.id)}
                onToggle={onToggle}
                onUpdateValue={onUpdateValue}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create Basics page**

Create `src/app/basics/page.tsx`:

```tsx
"use client";

import { useBasics } from "@/lib/hooks/use-basics";
import { useSettings } from "@/lib/hooks/use-settings";
import { BasicsList } from "@/components/basics/basics-list";
import { formatDateKR } from "@/lib/utils/date";
import Link from "next/link";

export default function BasicsPage() {
  const { settings } = useSettings();
  const { templates, logs, loading, today, toggleCheck, updateValue } =
    useBasics(settings?.day_start_time);

  if (loading) {
    return <div className="p-6 text-center text-warm-400">로딩 중...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-warm-700">오늘의 베이직</h1>
        <Link
          href="/basics/settings"
          className="text-sm text-warm-400 hover:text-warm-600"
        >
          ⚙️ 설정
        </Link>
      </div>
      <p className="text-sm text-warm-400">{formatDateKR(today)}</p>

      <BasicsList
        templates={templates}
        logs={logs}
        onToggle={toggleCheck}
        onUpdateValue={updateValue}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify basics page renders**

```bash
npm run dev
```

Navigate to Basics tab. Expected: page loads with "오늘의 베이직" header (empty list until templates are added).

- [ ] **Step 5: Commit**

```bash
git add src/components/basics/ src/app/basics/
git commit -m "feat: add basics daily check page with toggle and number input"
```

---

### Task 8: Basics Settings — Template Management

**Files:**
- Create: `src/components/basics/template-form.tsx`
- Create: `src/app/basics/settings/page.tsx`

- [ ] **Step 1: Create TemplateForm component**

Create `src/components/basics/template-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { BasicCategory, BasicType } from "@/types/database";

interface TemplateFormProps {
  onSave: (data: {
    category: BasicCategory;
    title: string;
    type: BasicType;
    unit: string | null;
    target_value: number | null;
  }) => void;
  onCancel: () => void;
}

export function TemplateForm({ onSave, onCancel }: TemplateFormProps) {
  const [category, setCategory] = useState<BasicCategory>("spiritual");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BasicType>("check");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      category,
      title,
      type,
      unit: type === "number" ? unit : null,
      target_value: type === "number" && targetValue ? parseFloat(targetValue) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCategory("spiritual")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === "spiritual"
              ? "bg-sky-200 text-sky-600"
              : "bg-warm-100 text-warm-400"
          }`}
        >
          📖 영적
        </button>
        <button
          type="button"
          onClick={() => setCategory("physical")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === "physical"
              ? "bg-sage-200 text-sage-600"
              : "bg-warm-100 text-warm-400"
          }`}
        >
          💪 신체적
        </button>
      </div>

      <input
        type="text"
        placeholder="항목 이름 (예: 기도, 버터 먹기)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
        required
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("check")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "check" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          ✓ 체크
        </button>
        <button
          type="button"
          onClick={() => setType("number")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "number" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          🔢 수치
        </button>
      </div>

      {type === "number" && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="단위 (시간, 잔 등)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
          />
          <input
            type="number"
            step="0.5"
            placeholder="목표"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="w-24 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-500"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-warm-500 text-white font-medium"
        >
          추가
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create Basics Settings page**

Create `src/app/basics/settings/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useBasics } from "@/lib/hooks/use-basics";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { TemplateForm } from "@/components/basics/template-form";
import Link from "next/link";

export default function BasicsSettingsPage() {
  const { templates, addTemplate, deactivateTemplate } = useBasics();
  const [showForm, setShowForm] = useState(false);

  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/basics" className="text-warm-400 hover:text-warm-600">
          ← 돌아가기
        </Link>
        <h1 className="text-lg font-bold text-warm-700">베이직 설정</h1>
        <div className="w-16" />
      </div>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">📖 영적</h3>
        {spiritual.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-warm-700">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-warm-400">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-red-300 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">💪 신체적</h3>
        {physical.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-warm-700">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-warm-400">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-red-300 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-warm-200 text-warm-400 hover:border-warm-400 hover:text-warm-600 transition-colors"
      >
        + 베이직 항목 추가
      </button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="새 베이직 항목">
        <TemplateForm
          onSave={(data) => {
            addTemplate(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/basics/template-form.tsx src/app/basics/settings/
git commit -m "feat: add basics template management (add/delete)"
```

---

### Task 9: Basics Statistics

**Files:**
- Create: `src/components/basics/basics-stats.tsx`
- Create: `src/lib/hooks/use-basics-stats.ts`
- Modify: `src/app/basics/page.tsx`

- [ ] **Step 1: Create useBasicsStats hook**

Create `src/lib/hooks/use-basics-stats.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface BasicsStat {
  templateId: string;
  title: string;
  category: string;
  streak: number;
  weeklyRate: number;
  monthlyRate: number;
}

export function useBasicsStats() {
  const [stats, setStats] = useState<BasicsStat[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadStats = useCallback(async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data: templates } = await supabase
      .from("basics_templates")
      .select("id, title, category")
      .eq("is_active", true);

    const { data: logs } = await supabase
      .from("basics_logs")
      .select("template_id, date, completed")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (!templates || !logs) { setLoading(false); return; }

    const result = templates.map((t) => {
      const tLogs = logs.filter((l) => l.template_id === t.id);
      const weekLogs = tLogs.filter(
        (l) => new Date(l.date) >= sevenDaysAgo
      );
      const monthLogs = tLogs;

      // Calculate streak
      let streak = 0;
      const sorted = tLogs
        .filter((l) => l.completed)
        .map((l) => l.date)
        .sort()
        .reverse();
      if (sorted.length > 0) {
        const d = new Date(today);
        for (let i = 0; i < sorted.length; i++) {
          const expected = d.toISOString().split("T")[0];
          if (sorted[i] === expected) {
            streak++;
            d.setDate(d.getDate() - 1);
          } else break;
        }
      }

      return {
        templateId: t.id,
        title: t.title,
        category: t.category,
        streak,
        weeklyRate: weekLogs.length > 0
          ? Math.round((weekLogs.filter((l) => l.completed).length / weekLogs.length) * 100)
          : 0,
        monthlyRate: monthLogs.length > 0
          ? Math.round((monthLogs.filter((l) => l.completed).length / monthLogs.length) * 100)
          : 0,
      };
    });

    setStats(result);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return { stats, loading };
}
```

- [ ] **Step 2: Create BasicsStats component**

Create `src/components/basics/basics-stats.tsx`:

```tsx
"use client";

import { useBasicsStats } from "@/lib/hooks/use-basics-stats";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export function BasicsStats() {
  const { stats, loading } = useBasicsStats();

  if (loading) return <p className="text-warm-400 text-center text-sm">통계 로딩 중...</p>;

  const spiritual = stats.filter((s) => s.category === "spiritual");
  const physical = stats.filter((s) => s.category === "physical");
  const avgWeekly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.weeklyRate, 0) / stats.length)
    : 0;
  const avgMonthly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.monthlyRate, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">달성률</h3>
        <div className="flex gap-4 mb-3">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-warm-700">{avgWeekly}%</p>
            <p className="text-xs text-warm-400">주간</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-warm-700">{avgMonthly}%</p>
            <p className="text-xs text-warm-400">월간</p>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm text-warm-500 mb-1">
              <span>영적</span>
              <span>{spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0}%</span>
            </div>
            <ProgressBar percent={spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0} color="bg-sky-300" />
          </div>
          <div>
            <div className="flex justify-between text-sm text-warm-500 mb-1">
              <span>신체적</span>
              <span>{physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0}%</span>
            </div>
            <ProgressBar percent={physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0} color="bg-sage-300" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">연속 달성 (스트릭)</h3>
        <div className="space-y-2">
          {stats.map((s) => (
            <div key={s.templateId} className="flex items-center justify-between py-1">
              <span className="text-warm-600 text-sm">{s.title}</span>
              <span className={`text-sm font-semibold ${s.streak > 0 ? "text-sage-500" : "text-warm-300"}`}>
                {s.streak > 0 ? `${s.streak}일 연속` : "-"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Add stats tab to Basics page**

Modify `src/app/basics/page.tsx` — add a toggle between "체크" and "통계" views. When "통계" is selected, render `<BasicsStats />`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/use-basics-stats.ts src/components/basics/basics-stats.tsx src/app/basics/page.tsx
git commit -m "feat: add basics statistics (weekly/monthly rates, streaks, category comparison)"
```

---

## Phase 3: Schedule Feature

### Task 10: Schedule Hooks

**Files:**
- Create: `src/lib/hooks/use-schedule.ts`
- Create: `src/lib/hooks/use-events.ts`

- [ ] **Step 1: Create useSchedule hook**

Create `src/lib/hooks/use-schedule.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWeekDates } from "@/lib/utils/date";
import type { SchedulePlan, ScheduleActual, SchedulePreset } from "@/types/database";

export function useSchedule(weekStartDate: string) {
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [actuals, setActuals] = useState<ScheduleActual[]>([]);
  const [presets, setPresets] = useState<SchedulePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const weekDates = getWeekDates(weekStartDate);

  const loadWeek = useCallback(async () => {
    const [plansRes, actualsRes] = await Promise.all([
      supabase.from("schedule_plans").select("*")
        .in("date", weekDates).order("start_time"),
      supabase.from("schedule_actuals").select("*")
        .in("date", weekDates).order("start_time"),
    ]);
    if (plansRes.data) setPlans(plansRes.data);
    if (actualsRes.data) setActuals(actualsRes.data);
    setLoading(false);
  }, [weekStartDate]);

  const loadPresets = useCallback(async () => {
    const { data } = await supabase.from("schedule_presets").select("*")
      .order("usage_count", { ascending: false });
    if (data) setPresets(data);
  }, []);

  useEffect(() => { loadWeek(); loadPresets(); }, [loadWeek, loadPresets]);

  // Plan-to-Actual: Complete (as-is)
  async function completePlan(plan: SchedulePlan) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("schedule_actuals").insert({
      user_id: user.id,
      plan_id: plan.id,
      date: plan.date,
      start_time: plan.start_time,
      end_time: plan.end_time,
      title: plan.title,
      color: plan.color,
      is_from_plan: true,
    });
    await loadWeek();
  }

  // Plan-to-Actual: Edit & Complete
  async function editAndComplete(
    plan: SchedulePlan,
    edits: { start_time?: string; end_time?: string; title?: string }
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("schedule_actuals").insert({
      user_id: user.id,
      plan_id: plan.id,
      date: plan.date,
      start_time: edits.start_time ?? plan.start_time,
      end_time: edits.end_time ?? plan.end_time,
      title: edits.title ?? plan.title,
      color: plan.color,
      is_from_plan: true,
    });
    await loadWeek();
  }

  // Add plan block (from preset or manual)
  async function addPlan(data: {
    date: string; start_time: string; end_time: string;
    title: string; color: string; preset_id?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("schedule_plans").insert({ user_id: user.id, ...data });
    // Increment preset usage
    if (data.preset_id) {
      await supabase.rpc("increment_preset_usage", { p_id: data.preset_id });
    }
    await loadWeek();
  }

  // Add actual-only block (unplanned)
  async function addActual(data: {
    date: string; start_time: string; end_time: string;
    title: string; color: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("schedule_actuals").insert({
      user_id: user.id, ...data, is_from_plan: false,
    });
    await loadWeek();
  }

  // Save new preset
  async function savePreset(data: { title: string; duration: number; color: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("schedule_presets").insert({ user_id: user.id, ...data });
    await loadPresets();
  }

  // Delete plan
  async function deletePlan(planId: string) {
    await supabase.from("schedule_plans").delete().eq("id", planId);
    await loadWeek();
  }

  return {
    plans, actuals, presets, loading, weekDates,
    completePlan, editAndComplete, addPlan, addActual,
    savePreset, deletePlan,
  };
}
```

Note: Add a Supabase RPC function `increment_preset_usage` in a new migration if needed, or use a direct update:

```sql
-- Alternative: add to 00003_schedule.sql
CREATE OR REPLACE FUNCTION increment_preset_usage(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE schedule_presets
  SET usage_count = usage_count + 1, last_used_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Create useEvents hook**

Create `src/lib/hooks/use-events.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/types/database";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from("events").select("*").order("start_date");
    if (data) setEvents(data);
    setLoading(false);
  }, []);

  const loadUpcoming = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const { data } = await supabase.from("events").select("*")
      .gte("end_date", today)
      .lte("start_date", twoWeeks.toISOString().split("T")[0])
      .order("start_date")
      .limit(5);
    if (data) setUpcoming(data);
  }, []);

  useEffect(() => { loadEvents(); loadUpcoming(); }, [loadEvents, loadUpcoming]);

  async function addEvent(event: Omit<Event, "id" | "user_id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("events").insert({ user_id: user.id, ...event });
    await loadEvents();
    await loadUpcoming();
  }

  async function deleteEvent(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    await loadEvents();
    await loadUpcoming();
  }

  return { events, upcoming, loading, addEvent, deleteEvent };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-schedule.ts src/lib/hooks/use-events.ts
git commit -m "feat: add schedule and events hooks with plan-to-actual transition"
```

---

### Task 11: Weekly View Components

**Files:**
- Create: `src/components/schedule/time-block.tsx`
- Create: `src/components/schedule/block-action-sheet.tsx`
- Create: `src/components/schedule/preset-picker.tsx`
- Create: `src/components/schedule/block-form.tsx`
- Create: `src/components/schedule/weekly-view.tsx`

- [ ] **Step 1: Build TimeBlock component**

Create `src/components/schedule/time-block.tsx`:

```tsx
import type { SchedulePlan, ScheduleActual } from "@/types/database";
import { formatTime } from "@/lib/utils/format";

interface TimeBlockProps {
  block: SchedulePlan | ScheduleActual;
  timeUnit: number;
  dayStartTime: string;
  onClick: () => void;
}

export function TimeBlock({ block, timeUnit, dayStartTime, onClick }: TimeBlockProps) {
  // Calculate position and height based on time
  const [startH, startM] = block.start_time.split(":").map(Number);
  const [endH, endM] = block.end_time.split(":").map(Number);
  const [dayH, dayM] = dayStartTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM - (dayH * 60 + dayM);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const pixelsPerMinute = 48 / timeUnit; // 48px per time unit slot

  const top = startMinutes * pixelsPerMinute;
  const height = Math.max(durationMinutes * pixelsPerMinute, 20);

  return (
    <div
      onClick={onClick}
      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden text-xs leading-tight"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: block.color + "40",
        borderLeft: `3px solid ${block.color}`,
      }}
    >
      <p className="font-medium truncate" style={{ color: block.color }}>
        {block.title}
      </p>
      {height > 30 && (
        <p className="opacity-60" style={{ color: block.color, fontSize: "10px" }}>
          {formatTime(block.start_time)}-{formatTime(block.end_time)}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build BlockActionSheet**

Create `src/components/schedule/block-action-sheet.tsx`:

```tsx
"use client";

import { Modal } from "@/components/ui/modal";
import type { SchedulePlan } from "@/types/database";

interface BlockActionSheetProps {
  plan: SchedulePlan | null;
  onClose: () => void;
  onComplete: (plan: SchedulePlan) => void;
  onEditComplete: (plan: SchedulePlan) => void;
  onDelete: (planId: string) => void;
}

export function BlockActionSheet({ plan, onClose, onComplete, onEditComplete, onDelete }: BlockActionSheetProps) {
  if (!plan) return null;

  return (
    <Modal isOpen={!!plan} onClose={onClose} title={plan.title}>
      <div className="space-y-2">
        <button
          onClick={() => { onComplete(plan); onClose(); }}
          className="w-full py-3 rounded-xl bg-sage-100 text-sage-600 font-medium hover:bg-sage-200"
        >
          완료 (계획대로)
        </button>
        <button
          onClick={() => { onEditComplete(plan); }}
          className="w-full py-3 rounded-xl bg-sky-100 text-sky-600 font-medium hover:bg-sky-200"
        >
          수정 후 완료
        </button>
        <button
          onClick={() => { onDelete(plan.id); onClose(); }}
          className="w-full py-3 rounded-xl bg-warm-100 text-warm-500 font-medium hover:bg-warm-200"
        >
          삭제
        </button>
        <button onClick={onClose} className="w-full py-2 text-warm-400 text-sm">
          취소
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Build PresetPicker**

Create `src/components/schedule/preset-picker.tsx`:

```tsx
"use client";

import { Modal } from "@/components/ui/modal";
import type { SchedulePreset } from "@/types/database";

interface PresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  presets: SchedulePreset[];
  onSelect: (preset: SchedulePreset) => void;
  onManual: () => void;
}

export function PresetPicker({ isOpen, onClose, presets, onSelect, onManual }: PresetPickerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="활동 선택">
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => { onSelect(p); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-warm-50 transition-colors"
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="flex-1 text-left text-warm-700">{p.title}</span>
            <span className="text-warm-400 text-sm">{p.duration}분</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => { onManual(); onClose(); }}
        className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-warm-200 text-warm-400"
      >
        + 직접 입력
      </button>
    </Modal>
  );
}
```

- [ ] **Step 4: Build BlockForm**

Create `src/components/schedule/block-form.tsx` — form with title input, start/end time selectors (using time unit increments), color picker (6 preset colors), "save as preset" checkbox. onSave returns block data.

- [ ] **Step 5: Build WeeklyView**

Create `src/components/schedule/weekly-view.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TimeBlock } from "./time-block";
import { BlockActionSheet } from "./block-action-sheet";
import { PresetPicker } from "./preset-picker";
import { generateTimeSlots, formatDateKR } from "@/lib/utils/date";
import type { SchedulePlan, ScheduleActual, SchedulePreset } from "@/types/database";

interface WeeklyViewProps {
  weekDates: string[];
  plans: SchedulePlan[];
  actuals: ScheduleActual[];
  presets: SchedulePreset[];
  dayStartTime: string;
  dayEndTime: string;
  timeUnit: number;
  onCompletePlan: (plan: SchedulePlan) => void;
  onEditComplete: (plan: SchedulePlan) => void;
  onDeletePlan: (planId: string) => void;
  onAddPlan: (data: any) => void;
  onAddActual: (data: any) => void;
  onSelectPreset: (preset: SchedulePreset, date: string, time: string, column: "plan" | "actual") => void;
}

export function WeeklyView({
  weekDates, plans, actuals, presets,
  dayStartTime, dayEndTime, timeUnit,
  onCompletePlan, onEditComplete, onDeletePlan,
  onAddPlan, onAddActual, onSelectPreset,
}: WeeklyViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<SchedulePlan | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const timeSlots = generateTimeSlots(dayStartTime, dayEndTime, timeUnit);
  const slotHeight = 48; // px per slot
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "800px" }}>
        {/* Header */}
        <div className="grid gap-px" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
          <div />
          {weekDates.map((date, i) => (
            <div key={date} className="text-center py-2">
              <p className="text-sm font-semibold text-warm-600">{days[i]}</p>
              <p className="text-xs text-warm-400">{date.slice(8)}</p>
              <div className="flex justify-center gap-2 text-[10px] text-warm-300 mt-1">
                <span>계획</span><span>실제</span>
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid gap-px" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
          {/* Time labels */}
          <div>
            {timeSlots.map((t) => (
              <div key={t} style={{ height: `${slotHeight}px` }}
                className="text-[10px] text-warm-400 text-right pr-2 pt-0.5">
                {t}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const dayPlans = plans.filter((p) => p.date === date);
            const dayActuals = actuals.filter((a) => a.date === date);
            const totalHeight = timeSlots.length * slotHeight;

            return (
              <div key={date} className="grid grid-cols-2 gap-px">
                {/* Plan column */}
                <div
                  className="relative bg-cream-100 rounded-lg"
                  style={{ height: `${totalHeight}px` }}
                  onClick={() => setShowPresets(true)}
                >
                  {dayPlans.map((p) => (
                    <TimeBlock
                      key={p.id}
                      block={p}
                      timeUnit={timeUnit}
                      dayStartTime={dayStartTime}
                      onClick={() => setSelectedPlan(p)}
                    />
                  ))}
                </div>
                {/* Actual column */}
                <div
                  className="relative bg-sage-50 rounded-lg"
                  style={{ height: `${totalHeight}px` }}
                >
                  {dayActuals.map((a) => (
                    <TimeBlock
                      key={a.id}
                      block={a}
                      timeUnit={timeUnit}
                      dayStartTime={dayStartTime}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BlockActionSheet
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onComplete={onCompletePlan}
        onEditComplete={onEditComplete}
        onDelete={onDeletePlan}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/
git commit -m "feat: add weekly schedule view with plan/actual columns, action sheet, and presets"
```

---

### Task 12: Monthly View & Schedule Page

**Files:**
- Create: `src/components/schedule/monthly-view.tsx`
- Create: `src/app/schedule/page.tsx`

- [ ] **Step 1: Build MonthlyView**

Create `src/components/schedule/monthly-view.tsx` — standard calendar grid (6 rows x 7 cols). Events rendered as colored horizontal bars spanning their date range. Tap a date calls `onSelectDate(date)`. Uses `useEvents` hook for event data of the displayed month.

- [ ] **Step 2: Build Schedule page**

Create `src/app/schedule/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { WeeklyView } from "@/components/schedule/weekly-view";
import { MonthlyView } from "@/components/schedule/monthly-view";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { useEvents } from "@/lib/hooks/use-events";
import { useSettings } from "@/lib/hooks/use-settings";
import { getWeekStart, getLogicalDate } from "@/lib/utils/date";

export default function SchedulePage() {
  const { settings } = useSettings();
  const today = getLogicalDate(settings?.day_start_time);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const schedule = useSchedule(weekStart);
  const { events, upcoming, addEvent, deleteEvent } = useEvents();

  function prevWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }
  function nextWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-warm-700">일정</h1>
        <div className="flex gap-1 bg-warm-100 rounded-xl p-1">
          <button
            onClick={() => setView("weekly")}
            className={`px-3 py-1 rounded-lg text-sm ${view === "weekly" ? "bg-white text-warm-700 shadow-sm" : "text-warm-400"}`}
          >주간</button>
          <button
            onClick={() => setView("monthly")}
            className={`px-3 py-1 rounded-lg text-sm ${view === "monthly" ? "bg-white text-warm-700 shadow-sm" : "text-warm-400"}`}
          >월간</button>
        </div>
      </div>

      {view === "weekly" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={prevWeek} className="text-warm-400 px-2">←</button>
            <span className="text-warm-600 font-medium text-sm">
              {schedule.weekDates[0]} ~ {schedule.weekDates[6]}
            </span>
            <button onClick={nextWeek} className="text-warm-400 px-2">→</button>
          </div>
          <WeeklyView
            weekDates={schedule.weekDates}
            plans={schedule.plans}
            actuals={schedule.actuals}
            presets={schedule.presets}
            dayStartTime={settings?.day_start_time ?? "04:00"}
            dayEndTime={settings?.day_end_time ?? "00:00"}
            timeUnit={settings?.time_unit ?? 30}
            onCompletePlan={schedule.completePlan}
            onEditComplete={(plan) => schedule.editAndComplete(plan, {})}
            onDeletePlan={schedule.deletePlan}
            onAddPlan={schedule.addPlan}
            onAddActual={schedule.addActual}
            onSelectPreset={() => {}}
          />
        </>
      )}

      {view === "monthly" && (
        <MonthlyView
          events={events}
          onSelectDate={(date) => {
            setWeekStart(getWeekStart(date));
            setView("weekly");
          }}
          onAddEvent={addEvent}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/monthly-view.tsx src/app/schedule/
git commit -m "feat: add monthly calendar view and schedule page with view toggle"
```

---

## Phase 4: Finance Feature

### Task 13: Finance Hooks

**Files:**
- Create: `src/lib/hooks/use-heaven-bank.ts`
- Create: `src/lib/hooks/use-obligations.ts`
- Create: `src/lib/hooks/use-finance.ts`
- Create: `src/lib/hooks/use-debts.ts`
- Create: `src/lib/hooks/use-wants.ts`

- [ ] **Step 1: Create useHeavenBank hook**

Create `src/lib/hooks/use-heaven-bank.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HeavenBankEntry } from "@/types/database";

export function useHeavenBank(month: string) {
  const [entries, setEntries] = useState<HeavenBankEntry[]>([]);
  const [monthlySow, setMonthlySow] = useState(0);
  const [monthlyReap, setMonthlyReap] = useState(0);
  const [cumulativeSow, setCumulativeSow] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    // Monthly entries
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const { data } = await supabase.from("heaven_bank").select("*")
      .gte("date", startDate).lte("date", endDate)
      .order("date");
    if (data) {
      setEntries(data);
      setMonthlySow(data.filter(e => e.type === "sow").reduce((s, e) => s + e.amount, 0));
      setMonthlyReap(data.filter(e => e.type === "reap").reduce((s, e) => s + e.amount, 0));
    }
    // Cumulative sow
    const { data: allSow } = await supabase.from("heaven_bank").select("amount")
      .eq("type", "sow");
    if (allSow) setCumulativeSow(allSow.reduce((s, e) => s + e.amount, 0));
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function addEntry(entry: Omit<HeavenBankEntry, "id" | "user_id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("heaven_bank").insert({ user_id: user.id, ...entry });
    await load();
  }

  return { entries, monthlySow, monthlyReap, cumulativeSow, loading, addEntry };
}
```

- [ ] **Step 2: Create useObligations hook with auto-carry**

Create `src/lib/hooks/use-obligations.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceObligation, FinanceCategory } from "@/types/database";

export function useObligations(month: string) {
  const [obligations, setObligations] = useState<(FinanceObligation & { category_title: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("finance_obligations").select(`
      *, finance_categories(title)
    `).eq("month", month).order("created_at");

    if (data) {
      setObligations(data.map((o: any) => ({
        ...o,
        category_title: o.finance_categories?.title ?? "",
      })));
    }
    setLoading(false);
  }, [month]);

  // Auto-carry from previous month if current month is empty
  const autoCarry = useCallback(async () => {
    const { data: existing } = await supabase.from("finance_obligations")
      .select("id").eq("month", month).limit(1);
    if (existing && existing.length > 0) return; // already has data

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get obligation categories with default amounts
    const { data: categories } = await supabase.from("finance_categories")
      .select("*").eq("type", "obligation").eq("user_id", user.id);

    if (categories && categories.length > 0) {
      const newObligations = categories.map((c) => ({
        user_id: user.id,
        month,
        category_id: c.id,
        amount: c.default_amount ?? 0,
        is_paid: false,
      }));
      await supabase.from("finance_obligations").insert(newObligations);
    }
  }, [month]);

  useEffect(() => {
    async function init() {
      await autoCarry();
      await load();
    }
    init();
  }, [autoCarry, load]);

  async function togglePaid(obligationId: string, isPaid: boolean) {
    await supabase.from("finance_obligations").update({
      is_paid: isPaid,
      paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", obligationId);
    await load();
  }

  async function updateAmount(obligationId: string, amount: number) {
    await supabase.from("finance_obligations")
      .update({ amount }).eq("id", obligationId);
    await load();
  }

  return { obligations, loading, togglePaid, updateAmount };
}
```

- [ ] **Step 3: Create useFinance hook with budget auto-carry**

Create `src/lib/hooks/use-finance.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceTransaction, FinanceBudget, FinanceAccount } from "@/types/database";

export function useFinance(month: string) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [surplusGoal, setSurplusGoal] = useState(0);
  const [surplusSaved, setSurplusSaved] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Auto-carry necessity budgets from previous month
  const autoCarryBudgets = useCallback(async () => {
    const { data: existing } = await supabase.from("finance_budgets")
      .select("id").eq("month", month).limit(1);
    if (existing && existing.length > 0) return;

    // Calculate previous month
    const [y, m] = month.split("-").map(Number);
    const prevMonth = m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, "0")}`;

    const { data: prevBudgets } = await supabase.from("finance_budgets")
      .select("*").eq("month", prevMonth);

    if (prevBudgets && prevBudgets.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newBudgets = prevBudgets.map((b) => ({
        user_id: user.id,
        category_id: b.category_id,
        amount: b.amount,
        month,
      }));
      await supabase.from("finance_budgets").insert(newBudgets);
    }
  }, [month]);

  const load = useCallback(async () => {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const [txRes, budgetRes, acctRes] = await Promise.all([
      supabase.from("finance_transactions").select("*")
        .gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
      supabase.from("finance_budgets").select("*").eq("month", month),
      supabase.from("finance_accounts").select("*"),
    ]);
    if (txRes.data) setTransactions(txRes.data);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (acctRes.data) setAccounts(acctRes.data);

    // Surplus: use the 'surplus' category budget as goal, sum of surplus transactions as saved
    const { data: surplusCats } = await supabase.from("finance_categories")
      .select("id").eq("type", "surplus");
    if (surplusCats && surplusCats.length > 0) {
      const surplusCatId = surplusCats[0].id;
      const surplusBudget = budgetRes.data?.find(b => b.category_id === surplusCatId);
      setSurplusGoal(surplusBudget?.amount ?? 0);
      const surplusTx = txRes.data?.filter(t => t.category_id === surplusCatId && t.type === "income") ?? [];
      setSurplusSaved(surplusTx.reduce((s, t) => s + t.amount, 0));
    }

    setLoading(false);
  }, [month]);

  useEffect(() => {
    async function init() { await autoCarryBudgets(); await load(); }
    init();
  }, [autoCarryBudgets, load]);

  async function addTransaction(tx: Omit<FinanceTransaction, "id" | "user_id" | "is_auto">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_transactions").insert({ user_id: user.id, ...tx });
    await load();
  }

  async function addAccount(acct: Omit<FinanceAccount, "id" | "user_id" | "balance">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_accounts").insert({ user_id: user.id, ...acct });
    await load();
  }

  return { transactions, budgets, accounts, surplusGoal, surplusSaved, loading, addTransaction, addAccount };
}
```

Note on **Surplus Storage**: Surplus uses `finance_budgets` for the goal amount (a budget entry with the surplus category) and `finance_transactions` sum (income type with surplus category) for saved amount. No extra table needed.

- [ ] **Step 4: Create useDebts hook**

Create `src/lib/hooks/use-debts.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";

interface DebtWithProgress extends FinanceDebt {
  total_paid: number;
  percent: number;
  payments: FinanceDebtPayment[];
}

export function useDebts() {
  const [debts, setDebts] = useState<DebtWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: debtRows } = await supabase.from("finance_debts").select("*")
      .order("is_completed").order("created_at");
    const { data: payments } = await supabase.from("finance_debt_payments").select("*")
      .order("date", { ascending: false });

    if (debtRows) {
      setDebts(debtRows.map((d) => {
        const dPayments = (payments ?? []).filter((p) => p.debt_id === d.id);
        const totalPaid = dPayments.reduce((s, p) => s + p.amount, 0);
        return {
          ...d,
          total_paid: totalPaid,
          percent: d.total_amount > 0 ? Math.min(Math.round((totalPaid / d.total_amount) * 100), 100) : 0,
          payments: dPayments,
        };
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDebt(title: string, totalAmount: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_debts").insert({ user_id: user.id, title, total_amount: totalAmount });
    await load();
  }

  async function addPayment(debtId: string, amount: number, memo: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_debt_payments").insert({
      user_id: user.id, debt_id: debtId, amount,
      date: new Date().toISOString().split("T")[0], memo,
    });
    // Check if fully repaid
    const debt = debts.find((d) => d.id === debtId);
    if (debt && debt.total_paid + amount >= debt.total_amount) {
      await supabase.from("finance_debts").update({ is_completed: true }).eq("id", debtId);
    }
    await load();
  }

  return { debts, loading, addDebt, addPayment };
}
```

- [ ] **Step 5: Create useWants hook**

Create `src/lib/hooks/use-wants.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMonth } from "@/lib/utils/date";
import type { FinanceWant } from "@/types/database";

export function useWants() {
  const [wants, setWants] = useState<FinanceWant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("finance_wants").select("*")
      .order("is_purchased").order("created_month", { ascending: false });
    if (data) setWants(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addWant(title: string, estimatedPrice: number | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_wants").insert({
      user_id: user.id, title, estimated_price: estimatedPrice,
      created_month: getCurrentMonth(),
    });
    await load();
  }

  async function togglePurchased(wantId: string, isPurchased: boolean) {
    await supabase.from("finance_wants").update({
      is_purchased: isPurchased,
      purchased_date: isPurchased ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", wantId);
    await load();
  }

  return { wants, loading, addWant, togglePurchased };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/use-heaven-bank.ts src/lib/hooks/use-obligations.ts src/lib/hooks/use-finance.ts src/lib/hooks/use-debts.ts src/lib/hooks/use-wants.ts
git commit -m "feat: add all finance hooks with auto-carry and surplus tracking"
```

---

### Task 14: Heaven Bank UI

**Files:**
- Create: `src/components/finance/heaven-bank-ledger.tsx`
- Create: `src/components/finance/heaven-bank-form.tsx`
- Create: `src/app/finance/heaven-bank/page.tsx`

- [ ] **Step 1: Build HeavenBankLedger** — passbook-style table component. Columns: date, description (target for sow / description for reap), deposit (sow amount), withdrawal (reap amount). Monthly totals row at bottom. Cumulative sow total shown above table. Use `<table>` with warm styling.

- [ ] **Step 2: Build HeavenBankForm** — Modal form: sow/reap toggle buttons, target dropdown (poor/missions/kingdom projects) shown for sow, description text input shown for reap, amount number input, date picker. On submit calls `addEntry`.

- [ ] **Step 3: Build Heaven Bank page** — month selector (← 2026년 4월 →), HeavenBankLedger, floating "+" button to open form.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/heaven-bank* src/app/finance/heaven-bank/
git commit -m "feat: add heaven bank passbook UI"
```

---

### Task 15: Obligations & Debts UI

**Files:**
- Create: `src/components/finance/obligations-list.tsx`
- Create: `src/app/finance/obligations/page.tsx`
- Create: `src/components/finance/debt-card.tsx`
- Create: `src/components/finance/debt-payment-form.tsx`
- Create: `src/app/finance/debts/page.tsx`

- [ ] **Step 1: Build ObligationsList** — Card per obligation item: title, amount (editable), paid/unpaid toggle, paid date. Total row at bottom with progress bar. When toggling a debt-repayment obligation to paid and it has `linked_debt_id`, show dialog asking which debt to apply to, then call `useDebts.addPayment`.

- [ ] **Step 2: Build Obligations page** — month selector + ObligationsList. Auto-carry happens on hook init.

- [ ] **Step 3: Build DebtCard** — Card showing: debt title, total amount, paid amount, remaining, progress bar. Expand to show payment history. "상환 기록" button opens DebtPaymentForm.

- [ ] **Step 4: Build DebtPaymentForm** — Modal: amount input, memo, date. On submit calls `addPayment`. Shows celebration animation when debt is fully repaid (confetti or large checkmark).

- [ ] **Step 5: Build Debts page** — list of active debts (DebtCard each), completed debts section (collapsed), "빚 추가" button.

- [ ] **Step 6: Commit**

```bash
git add src/components/finance/obligations* src/components/finance/debt* src/app/finance/obligations/ src/app/finance/debts/
git commit -m "feat: add obligations and debt management UI"
```

---

### Task 16: Necessities, Wants, Surplus & Finance Overview

**Files:**
- Create: `src/components/finance/necessities-tracker.tsx`
- Create: `src/components/finance/wants-list.tsx`
- Create: `src/components/finance/surplus-tracker.tsx`
- Create: `src/components/finance/account-card.tsx`
- Create: `src/app/finance/accounts/page.tsx`
- Create: `src/app/finance/page.tsx`

- [ ] **Step 1: Build NecessitiesTracker** — Per-category card: title, budget amount, spent amount (sum of transactions with that category this month), progress bar. Color codes: green (<80%), yellow (80-100%), red (>100%).

- [ ] **Step 2: Build WantsList** — List of want items: title, estimated price, purchased toggle. Add form at bottom: title + price input. Purchased items move to bottom with strikethrough.

- [ ] **Step 3: Build SurplusTracker** — Goal amount (from finance_budgets with surplus category), saved amount (from transaction sum), progress bar, percentage.

- [ ] **Step 4: Build AccountCard** — Card: account name, type badge ("은행" / "체크카드"), balance formatted as won, color stripe.

- [ ] **Step 5: Build Accounts page** — list of AccountCards + "계좌 추가" form (name, type, color).

- [ ] **Step 6: Build Finance overview page** — Priority-ordered sections:
  1. 하늘은행 요약 (this month sowing total) → link to `/finance/heaven-bank`
  2. 의무사항 요약 (paid/total) → link to `/finance/obligations`
  3. 필요사항 요약 (budget bars) → inline
  4. 요망사항 요약 (unpurchased count) → inline expandable
  5. 여윳돈 (progress bar) → inline
  6. 빚 관리 요약 → link to `/finance/debts`
  7. 계좌 요약 → link to `/finance/accounts`

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/ src/app/finance/
git commit -m "feat: add necessities, wants, surplus, accounts, and finance overview"
```

---

## Phase 5: Dashboard, Settings & PWA

### Task 17: Dashboard

**Files:**
- Create: `src/components/dashboard/basics-summary.tsx`
- Create: `src/components/dashboard/events-summary.tsx`
- Create: `src/components/dashboard/finance-summary.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build BasicsSummary** — Card: "오늘의 베이직", completion count (3/7), progress bar, inline list of items with check/unchecked icons grouped by category. Tap navigates to `/basics`.

- [ ] **Step 2: Build EventsSummary** — Card: "다가오는 이벤트", up to 5 events within 14 days from `useEvents().upcoming`. Each row: date + title. Empty state: "예정된 이벤트가 없습니다". Tap navigates to `/schedule`.

- [ ] **Step 3: Build FinanceSummary** — Card: "4월 재정", rows for heaven bank sowing total, obligations paid/total, necessities spent/budget, surplus saved. Tap navigates to `/finance`.

- [ ] **Step 4: Build Dashboard page**

Modify `src/app/page.tsx`:

```tsx
"use client";

import { BasicsSummary } from "@/components/dashboard/basics-summary";
import { EventsSummary } from "@/components/dashboard/events-summary";
import { FinanceSummary } from "@/components/dashboard/finance-summary";
import { useSettings } from "@/lib/hooks/use-settings";
import { getLogicalDate, formatDateKR } from "@/lib/utils/date";
import Link from "next/link";

export default function DashboardPage() {
  const { settings } = useSettings();
  const today = getLogicalDate(settings?.day_start_time);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Plumbline</h1>
          <p className="text-sm text-warm-400">{formatDateKR(today)}</p>
        </div>
        <Link href="/settings" className="text-warm-400 hover:text-warm-600 text-xl">
          ⚙️
        </Link>
      </div>
      <BasicsSummary dayStartTime={settings?.day_start_time} />
      <EventsSummary />
      <FinanceSummary />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ src/app/page.tsx
git commit -m "feat: add dashboard with basics, events, and finance summary cards"
```

---

### Task 18: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Build Settings page**

Create `src/app/settings/page.tsx` — uses `useSettings` hook. Sections:
- 하루 시작 시간: time picker (default 04:00)
- 하루 종료 시간: time picker (default 00:00)
- 시간 단위: segmented control (10분/15분/30분/1시간)
- 로그아웃 button (calls `supabase.auth.signOut()`, redirect to `/login`)
- Back link to dashboard

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/
git commit -m "feat: add user settings page with time config and logout"
```

---

### Task 19: PWA Configuration

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)
- Modify: `next.config.ts`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "Plumbline",
  "short_name": "Plumbline",
  "description": "나의 하루를 세우는 다림줄",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fefcf8",
  "theme_color": "#fefcf8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Configure @serwist/next**

Install: `npm install @serwist/next` (already in Task 1 deps).

Update `next.config.ts`:

```typescript
import withSerwist from "@serwist/next";

const nextConfig = withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})({});

export default nextConfig;
```

Create `src/sw.ts`:

```typescript
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

- [ ] **Step 3: Create placeholder icons** — simple 192 and 512 PNGs.

- [ ] **Step 4: Test PWA**

```bash
npm run build && npm start
```

Expected: Service worker registers, app installable from browser.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/icons/ next.config.ts src/sw.ts
git commit -m "feat: configure PWA with @serwist/next and manifest"
```

---

### Task 20: Offline Banner

**Files:**
- Create: `src/components/ui/offline-banner.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create OfflineBanner component**

```tsx
"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-warm-400 text-white text-center py-2 text-sm z-50">
      오프라인 상태입니다. 읽기만 가능합니다.
    </div>
  );
}
```

- [ ] **Step 2: Add to root layout**

Add `<OfflineBanner />` inside the `<body>` in `src/app/layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/offline-banner.tsx src/app/layout.tsx
git commit -m "feat: add offline status banner"
```

---

## Phase 6: Testing & Deploy

### Task 21: Core Unit Tests

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/utils/__tests__/date.test.ts`
- Create: `src/lib/utils/__tests__/format.test.ts`

- [ ] **Step 1: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

- [ ] **Step 2: Write date utility tests**

Create `src/lib/utils/__tests__/date.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { getLogicalDate, getWeekStart, getWeekDates, generateTimeSlots } from "../date";

describe("getLogicalDate", () => {
  it("returns today when after day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-12");
    vi.useRealTimers();
  });

  it("returns yesterday when before day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T03:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-11");
    vi.useRealTimers();
  });

  it("returns today at exactly day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T04:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-12");
    vi.useRealTimers();
  });
});

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    expect(getWeekStart("2026-04-15")).toBe("2026-04-13"); // Wed -> Mon
  });

  it("returns same day for a Monday", () => {
    expect(getWeekStart("2026-04-13")).toBe("2026-04-13");
  });

  it("returns previous Monday for a Sunday", () => {
    expect(getWeekStart("2026-04-12")).toBe("2026-04-06"); // Sun -> prev Mon
  });
});

describe("getWeekDates", () => {
  it("returns 7 dates starting from Monday", () => {
    const dates = getWeekDates("2026-04-15");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-04-13"); // Monday
    expect(dates[6]).toBe("2026-04-19"); // Sunday
  });
});

describe("generateTimeSlots", () => {
  it("generates 30-min slots from 04:00 to 06:00", () => {
    const slots = generateTimeSlots("04:00", "06:00", 30);
    expect(slots).toEqual(["04:00", "04:30", "05:00", "05:30"]);
  });

  it("handles midnight end time as 24:00", () => {
    const slots = generateTimeSlots("23:00", "00:00", 30);
    expect(slots).toEqual(["23:00", "23:30"]);
  });
});
```

- [ ] **Step 3: Write format utility tests**

Create `src/lib/utils/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatWon, calcPercent } from "../format";

describe("formatWon", () => {
  it("formats with commas", () => {
    expect(formatWon(1000000)).toBe("1,000,000");
  });

  it("formats zero", () => {
    expect(formatWon(0)).toBe("0");
  });
});

describe("calcPercent", () => {
  it("calculates percentage", () => {
    expect(calcPercent(3, 7)).toBe(43);
  });

  it("returns 0 when total is 0", () => {
    expect(calcPercent(5, 0)).toBe(0);
  });

  it("caps at 100", () => {
    expect(calcPercent(10, 5)).toBe(100);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/lib/utils/__tests__/ package.json
git commit -m "test: add unit tests for date and format utilities"
```

---

### Task 22: Supabase Project Setup & Deploy

- [ ] **Step 1: Create Supabase project** at supabase.com
- [ ] **Step 2: Run migrations** against remote Supabase instance

```bash
npx supabase db push --linked
```

- [ ] **Step 3: Update .env.local** with actual Supabase URL and anon key
- [ ] **Step 4: Test full flow locally** — sign up, add basics templates, check daily basics, create schedule plans and actuals, add heaven bank entries, test obligations auto-carry, add transactions, verify debt progress
- [ ] **Step 5: Deploy to Vercel** — connect GitHub repo, set environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] **Step 6: Verify deployed app** — test login, all features on both PC and mobile browser
- [ ] **Step 7: Add to mobile home screen** — verify PWA works as standalone app

---

## Notes

- **Realtime sync** is deferred to post-MVP. Current implementation requires manual refresh for cross-device updates.
- **Tab navigation** uses lucide-react icons (not emojis) for consistent cross-platform rendering.
- **Surplus storage** uses `finance_budgets` (surplus category) for goal and `finance_transactions` sum for saved amount — no extra table needed.

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-5 | Project setup, Supabase schema, auth, types, shared UI |
| 2 | 6-9 | Basics feature (hooks, daily check, template settings, statistics) |
| 3 | 10-12 | Schedule feature (hooks, weekly 2-col view, monthly view, presets) |
| 4 | 13-16 | Finance feature (heaven bank, obligations, debts, necessities, wants, surplus) |
| 5 | 17-20 | Dashboard, settings, PWA, offline banner |
| 6 | 21-22 | Unit tests, Supabase setup, deploy to Vercel |
