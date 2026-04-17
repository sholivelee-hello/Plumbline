"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useBudget } from "@/lib/hooks/use-budget";
import { AmountInput } from "@/components/finance/amount-input";
import { formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { getCurrentMonth } from "@/lib/finance-utils";
import { DEFAULT_GROUPS } from "@/lib/finance-config";

// ── Group display config ──────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, string> = {
  obligation: "🔷",
  necessity: "🟢",
  sowing: "🟣",
  want: "🟠",
};

const DEFAULT_PERCENTS: Record<string, number> = {
  obligation: 38,
  necessity: 52,
  sowing: 5,
  want: 5,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { startDemo, completeOnboarding } = useOnboarding();
  const { updateIncome, groups: configGroups } = useBudgetSettings();
  const { bulkSetBudgets } = useBudget(getCurrentMonth());

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [incomeValue, setIncomeValue] = useState("");

  // Step 3 state — editable percents
  const groups = configGroups.length > 0 ? configGroups : DEFAULT_GROUPS;
  const [percents, setPercents] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const g of groups) {
      init[g.id] = DEFAULT_PERCENTS[g.id] ?? g.percentMin;
    }
    return init;
  });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState("");

  const income = parseCurrencyInput(incomeValue);
  const totalPercent = Object.values(percents).reduce((s, v) => s + v, 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStartDemo = useCallback(async () => {
    setLoading(true);
    const result = await startDemo();
    setLoading(false);
    if (result.ok) {
      router.replace("/finance");
    }
  }, [startDemo, router]);

  const handleIncomeNext = useCallback(async () => {
    if (income <= 0) return;
    setLoading(true);
    await updateIncome(income);
    setLoading(false);
    setStep(3);
  }, [income, updateIncome]);

  const handleAdjust = useCallback(
    (groupId: string) => {
      setEditingGroupId(groupId);
      setEditPercent(String(percents[groupId] ?? 0));
    },
    [percents]
  );

  const handleAdjustSave = useCallback(
    (groupId: string) => {
      const val = Math.max(0, Math.min(100, parseInt(editPercent, 10) || 0));
      setPercents((prev) => ({ ...prev, [groupId]: val }));
      setEditingGroupId(null);
    },
    [editPercent]
  );

  const handleBudgetNext = useCallback(async () => {
    setLoading(true);

    // Distribute each group's amount evenly among its items
    const entries: Array<{ groupId: string; itemId: string | null; amount: number }> = [];
    for (const g of groups) {
      const groupAmount = Math.floor((income * (percents[g.id] ?? 0)) / 100);
      const itemCount = g.items.length;
      if (itemCount === 0) {
        entries.push({ groupId: g.id, itemId: null, amount: groupAmount });
      } else {
        const perItem = Math.floor(groupAmount / itemCount);
        for (const item of g.items) {
          entries.push({ groupId: g.id, itemId: item.id, amount: perItem });
        }
      }
    }

    await bulkSetBudgets(entries);
    setLoading(false);
    setStep(4);
  }, [groups, income, percents, bulkSetBudgets]);

  const handleComplete = useCallback(
    async (openInput: boolean) => {
      setLoading(true);
      await completeOnboarding();
      setLoading(false);
      if (openInput) {
        router.replace("/finance?openInput=1");
      } else {
        router.replace("/finance");
      }
    },
    [completeOnboarding, router]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0b0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Step indicator */}
        {step > 1 && (
          <div className="flex justify-center gap-1.5 mb-6">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s < step
                    ? "w-6 bg-indigo-500"
                    : s === step
                    ? "w-6 bg-indigo-400"
                    : "w-3 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Step 1: Welcome ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#1a2030] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2d3748] p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-3xl">💰</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                재정 관리를 시작해볼까요?
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                먼저 샘플 데이터로 어떤 기능인지 둘러보시겠어요?
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleStartDemo}
                disabled={loading}
                className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                  bg-gray-100 dark:bg-[#262c38] text-gray-700 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-[#2d3748]
                  active:scale-[0.98] transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "잠시만요..." : "둘러보기"}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                  bg-indigo-600 dark:bg-indigo-500 text-white
                  hover:opacity-90 active:scale-[0.98] transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                바로 시작하기
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Income Input ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#1a2030] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2d3748] p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                이번 달 수입은 얼마인가요?
              </h1>
            </div>

            <AmountInput
              value={incomeValue}
              onChange={setIncomeValue}
              placeholder="수입 금액"
              autoFocus
            />

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              수입이 여러 건이면 나중에 추가할 수 있어요
            </p>

            <button
              type="button"
              onClick={handleIncomeNext}
              disabled={income <= 0 || loading}
              className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                bg-indigo-600 dark:bg-indigo-500 text-white
                hover:opacity-90 active:scale-[0.98] transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "다음 →"}
            </button>
          </div>
        )}

        {/* ── Step 3: Auto-Distribute Preview ─────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#1a2030] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2d3748] p-8 space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                수입을 이렇게 나눠볼게요
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatCurrency(income)}원 기준
              </p>
            </div>

            <div className="space-y-3">
              {groups.map((g) => {
                const pct = percents[g.id] ?? 0;
                const calc = Math.floor((income * pct) / 100);
                const isEditing = editingGroupId === g.id;

                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#262c38]"
                  >
                    <span className="text-lg shrink-0">{GROUP_ICONS[g.id] ?? "⬜"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {g.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                        {formatCurrency(calc)}원
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editPercent}
                          onChange={(e) => setEditPercent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdjustSave(g.id);
                            if (e.key === "Escape") setEditingGroupId(null);
                          }}
                          className="w-14 px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-600
                            bg-white dark:bg-[#1a2030] text-sm text-center font-semibold
                            text-gray-900 dark:text-gray-100
                            focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <button
                          type="button"
                          onClick={() => handleAdjustSave(g.id)}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white active:scale-95 transition-transform"
                        >
                          확인
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
                          {pct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjust(g.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium
                            bg-gray-200 dark:bg-[#1a2030] text-gray-600 dark:text-gray-400
                            hover:bg-gray-300 dark:hover:bg-[#2d3748]
                            active:scale-95 transition-all"
                        >
                          조정
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total percent indicator */}
            <div
              className={`text-center text-xs font-medium ${
                totalPercent === 100
                  ? "text-emerald-500"
                  : "text-amber-500"
              }`}
            >
              합계: {totalPercent}% {totalPercent !== 100 && "(합계가 100%가 되도록 조정해보세요)"}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              비율은 나중에 설정에서 바꿀 수 있어요
            </p>

            <button
              type="button"
              onClick={handleBudgetNext}
              disabled={loading}
              className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                bg-indigo-600 dark:bg-indigo-500 text-white
                hover:opacity-90 active:scale-[0.98] transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "다음 →"}
            </button>
          </div>
        )}

        {/* ── Step 4: Complete ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#1a2030] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2d3748] p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-4xl">🎉</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                준비 완료!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                예산이 설정되었어요.
                <br />
                첫 거래를 기록해볼까요?
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleComplete(true)}
                disabled={loading}
                className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                  bg-indigo-600 dark:bg-indigo-500 text-white
                  hover:opacity-90 active:scale-[0.98] transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "잠시만요..." : "첫 거래 기록하기"}
              </button>
              <button
                type="button"
                onClick={() => handleComplete(false)}
                disabled={loading}
                className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold
                  bg-gray-100 dark:bg-[#262c38] text-gray-700 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-[#2d3748]
                  active:scale-[0.98] transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                나중에 할게요
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
