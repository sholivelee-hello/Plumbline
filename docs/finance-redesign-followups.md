# Finance Redesign — Deferred Items

These items were intentionally deferred from the initial redesign implementation (Tasks 1–22).

## 1. Demo Data Seeding

**File:** `src/lib/hooks/use-onboarding.ts` — `startDemo()`

Currently `startDemo()` only sets `is_demo_mode: true` in `finance_onboarding`.
It does not populate `finance_transactions` or `finance_budgets` with sample data.

**TODO:** When demo mode is activated, insert a set of realistic sample transactions and budget rows
for the current month so the hub dashboard renders with content instead of zeros.
Reference: `src/lib/demo-data.ts` for existing demo data patterns.

---

## 2. Income Category Selection in Hub Input Sheet

**File:** `src/app/finance/page.tsx` — income branch of BottomSheet

Income category chips render from `incomeCategories` (from `useBudgetSettings`).
However, adding/removing income categories via Settings updates Supabase but the hub
input sheet shows only the default list if `useBudgetSettings` returns stale data on first render.

**TODO:** Confirm `useBudgetSettings` is wired to `finance_settings` and returns user-customized
income categories in real-time. Add a fallback to `DEFAULT_INCOME_CATEGORIES` if empty.

---

## 3. Want Group Expense → Transaction Recording

**File:** `src/app/finance/want/page.tsx`

The "want" group detail page lists wish items but does not have a direct "구매 완료" flow
that auto-creates a transaction in `finance_transactions`.

**TODO:** Add a "구매 완료" button on each wish item that:
1. Creates an expense transaction in the `want` group
2. Marks the wish item as purchased (or removes it from the active list)

---

## 4. Wishlist "구매 완료" → Auto-create Transaction

**File:** `src/lib/hooks/use-wishlist.ts` (if exists) or wish item component

Related to item 3 above. The wishlist data model and purchase flow need to be connected
to `finance_transactions` so spending on wish items appears in the hub and cashbook.

---

## 5. faith-custom-items localStorage Cleanup

**File:** `src/app/finance/page.tsx` — `useLocalStorageMigration`

The migration hook currently only migrates `faith-budget-{month}` keys.
If the old system stored custom categories under `faith-custom-items-*` keys,
those are silently left in localStorage.

**TODO:** Either migrate custom items to `finance_settings.group_configs` JSONB,
or add explicit cleanup: `localStorage.removeItem` all `faith-custom-items-*` keys
after a warning toast.

---

## 6. Supabase Unique Constraint on finance_budgets

**File:** Supabase migration / schema

The migration insert in `useLocalStorageMigration` uses `.insert()` (not `.upsert()`).
If duplicate rows exist (e.g., user runs migration twice before dismissing), inserts will fail.

**TODO:** Either add a unique constraint on `(user_id, month, group_id, item_id)` to the
`finance_budgets` table and switch to `.upsert({ onConflict: '...' })`, or clear existing rows
for affected months before inserting during migration.
