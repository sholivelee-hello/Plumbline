"use client";

import { useState, useCallback, useMemo } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useRecurring } from "@/lib/hooks/use-recurring";
import { type FinanceGroup } from "@/lib/finance-config";
import { formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";

import { PageHeader } from "@/components/ui/page-header";
import { FinanceCard } from "@/components/finance/finance-card";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { FinanceRecurring } from "@/types/database";

const INPUT_CLS =
  "w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] " +
  "bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

const SAVE_BTN_CLS =
  "w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white " +
  "bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 " +
  "disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]";

// ── Recurring Editor BottomSheet ───────────────────────────────────────────

interface RecurringEditorProps {
  rule: FinanceRecurring | null;
  isOpen: boolean;
  onClose: () => void;
  groups: FinanceGroup[];
  incomeCategories: string[];
  onSave: (
    data: Omit<FinanceRecurring, "id" | "user_id" | "created_at" | "is_active">,
    id?: string
  ) => Promise<void>;
}

function RecurringEditor({
  rule,
  isOpen,
  onClose,
  groups,
  incomeCategories,
  onSave,
}: RecurringEditorProps) {
  const [desc, setDesc] = useState(rule?.description ?? "");
  const [type, setType] = useState<"income" | "expense">(rule?.type ?? "expense");
  const [amount, setAmount] = useState(rule ? formatCurrency(rule.amount) : "");
  const [day, setDay] = useState(String(rule?.day_of_month ?? 1));
  const [groupId, setGroupId] = useState<string | null>(rule?.group_id ?? null);
  const [itemId, setItemId] = useState<string | null>(rule?.item_id ?? null);
  const [incomeCategory, setIncomeCategory] = useState<string | null>(
    rule?.income_category ?? null
  );
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const syncFromRule = useCallback((r: FinanceRecurring | null) => {
    setDesc(r?.description ?? "");
    setType(r?.type ?? "expense");
    setAmount(r ? formatCurrency(r.amount) : "");
    setDay(String(r?.day_of_month ?? 1));
    setGroupId(r?.group_id ?? null);
    setItemId(r?.item_id ?? null);
    setIncomeCategory(r?.income_category ?? null);
    setIsActive(r?.is_active ?? true);
  }, []);

  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    syncFromRule(rule);
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;

  async function handleSave() {
    const parsedAmount = parseCurrencyInput(amount);
    if (!desc.trim() || parsedAmount <= 0) return;
    setSaving(true);
    const dayNum = Math.max(1, Math.min(31, Number(day) || 1));
    await onSave(
      {
        description: desc.trim(),
        type,
        amount: parsedAmount,
        day_of_month: dayNum,
        group_id: type === "expense" ? groupId : null,
        item_id: type === "expense" ? itemId : null,
        income_category: type === "income" ? incomeCategory : null,
      },
      rule?.id
    );
    setSaving(false);
  }

  const parsedAmount = parseCurrencyInput(amount);
  const canSave = desc.trim().length > 0 && parsedAmount > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={rule ? "반복 거래 편집" : "반복 거래 추가"}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">내역</p>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={INPUT_CLS}
            placeholder="예: 월급, 교통비 정기결제"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">유형</p>
          <div className="flex rounded-xl border border-gray-200 dark:border-[#2d3748] overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 min-h-[44px] py-2.5 text-sm font-medium transition-colors ${
                  type === t
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-[#1a2030] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#262c38]"
                }`}
              >
                {t === "expense" ? "지출" : "수입"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
          <AmountInput value={amount} onChange={setAmount} placeholder="금액" />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">매달 기록일</p>
          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={INPUT_CLS + " text-right"}
            placeholder="1"
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            1~31 사이 숫자. 해당 월 말일을 넘으면 말일에 기록됩니다.
          </p>
        </div>

        {type === "expense" && (
          <>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">그룹</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { setGroupId(g.id); setItemId(null); }}
                    className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${
                      groupId === g.id
                        ? "text-white"
                        : "bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748]"
                    }`}
                    style={groupId === g.id ? { backgroundColor: g.color } : undefined}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>

            {selectedGroup && selectedGroup.items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">항목</p>
                <div className="flex flex-wrap gap-2">
                  {selectedGroup.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setItemId(it.id)}
                      className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${
                        itemId === it.id
                          ? "text-white"
                          : "bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748]"
                      }`}
                      style={itemId === it.id ? { backgroundColor: selectedGroup.color } : undefined}
                    >
                      {it.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {type === "income" && incomeCategories.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">수입 카테고리</p>
            <div className="flex flex-wrap gap-2">
              {incomeCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setIncomeCategory(cat)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${
                    incomeCategory === cat
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-gray-700 dark:text-gray-300">활성화</span>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? "bg-indigo-600" : "bg-gray-300 dark:bg-[#3a3f50]"
            }`}
            aria-checked={isActive}
            role="switch"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className={SAVE_BTN_CLS}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </BottomSheet>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function FinanceRecurringPage() {
  const { toast } = useToast();
  const {
    groups,
    incomeCategories,
    loading: settingsLoading,
  } = useBudgetSettings();

  const {
    recurring,
    loading: recurringLoading,
    addRecurring,
    updateRecurring,
    deleteRecurring,
  } = useRecurring();

  const [recurringSheetOpen, setRecurringSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FinanceRecurring | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  function openNewRecurring() {
    setEditingRule(null);
    setRecurringSheetOpen(true);
  }

  function openEditRecurring(rule: FinanceRecurring) {
    setEditingRule(rule);
    setRecurringSheetOpen(true);
  }

  async function handleSaveRecurring(
    data: Omit<FinanceRecurring, "id" | "user_id" | "created_at" | "is_active">,
    id?: string
  ) {
    if (id) {
      const result = await updateRecurring(id, data);
      if (result.ok) {
        toast("반복 거래가 수정되었습니다", "success");
        setRecurringSheetOpen(false);
      } else {
        toast(result.error ?? "수정에 실패했습니다", "error");
      }
    } else {
      const result = await addRecurring(data);
      if (result.ok) {
        toast("반복 거래가 추가되었습니다", "success");
        setRecurringSheetOpen(false);
      } else {
        toast(result.error ?? "저장에 실패했습니다", "error");
      }
    }
  }

  async function handleDeleteRecurring() {
    if (!deleteRuleId) return;
    const result = await deleteRecurring(deleteRuleId);
    if (result.ok) {
      setDeleteRuleId(null);
      toast("반복 거래가 삭제되었습니다", "success");
    } else {
      toast(result.error ?? "삭제에 실패했습니다", "error");
    }
  }

  const visibleRecurring = useMemo(
    () => recurring.filter((r) => !r.subscription_id),
    [recurring]
  );

  const loading = settingsLoading || recurringLoading;

  return (
    <div className="min-h-screen pb-32 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="반복 거래" backHref="/finance" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-200 dark:bg-[#262c38] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <section className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
              매달 자동으로 기록되는 수입·지출을 관리합니다. 활성화된 규칙은 지정된 날짜에 자동으로 거래가 생성됩니다.
            </p>
            <FinanceCard>
              {visibleRecurring.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  반복 거래 없음
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleRecurring.map((rule) => {
                    const ruleGroup = rule.group_id
                      ? groups.find((g) => g.id === rule.group_id)
                      : null;
                    const ruleItem =
                      ruleGroup?.items.find((it) => it.id === rule.item_id) ?? null;
                    return (
                      <div key={rule.id} className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                                rule.type === "expense"
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {rule.type === "expense" ? "지출" : "수입"}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {rule.description}
                            </span>
                            {!rule.is_active && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#262c38] px-1.5 py-0.5 rounded">
                                비활성
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                              {formatCurrency(rule.amount)}원
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              매달 {rule.day_of_month}일
                            </span>
                            {ruleGroup && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                                style={{ backgroundColor: ruleGroup.color }}
                              >
                                {ruleGroup.title}
                                {ruleItem ? ` · ${ruleItem.title}` : ""}
                              </span>
                            )}
                            {rule.income_category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                {rule.income_category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditRecurring(rule)}
                            className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            aria-label="편집"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteRuleId(rule.id)}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={openNewRecurring}
                className="mt-3 w-full min-h-[40px] py-2 rounded-xl text-xs font-medium
                  text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600
                  hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={13} />
                반복 거래 추가
              </button>
            </FinanceCard>
          </section>
        )}
      </div>

      <RecurringEditor
        rule={editingRule}
        isOpen={recurringSheetOpen}
        onClose={() => setRecurringSheetOpen(false)}
        groups={groups}
        incomeCategories={incomeCategories}
        onSave={handleSaveRecurring}
      />

      <ConfirmDialog
        isOpen={deleteRuleId !== null}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={handleDeleteRecurring}
        title="반복 거래 삭제"
        description="이 반복 거래 규칙을 삭제하시겠어요? 이미 생성된 거래는 유지됩니다."
        confirmLabel="삭제"
        variant="danger"
      />
    </div>
  );
}
