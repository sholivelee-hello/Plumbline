"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronUp, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";

import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useRecurring } from "@/lib/hooks/use-recurring";
import { type FinanceGroup, type GroupItem } from "@/lib/finance-config";
import { formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";

import { FinanceCard } from "@/components/finance/finance-card";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { FinanceRecurring } from "@/types/database";

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_가-힣]/g, "")
    .slice(0, 40);
}

// ── Input shared style ─────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] " +
  "bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

const SAVE_BTN_CLS =
  "w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white " +
  "bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 " +
  "disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]";

// ── Group Editor BottomSheet ───────────────────────────────────────────────

interface GroupEditorProps {
  group: FinanceGroup;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: FinanceGroup) => Promise<void>;
}

function GroupEditor({ group, isOpen, onClose, onSave }: GroupEditorProps) {
  const [title, setTitle] = useState(group.title);
  const [percentMin, setPercentMin] = useState(String(group.percentMin));
  const [percentMax, setPercentMax] = useState(String(group.percentMax));
  const [items, setItems] = useState<GroupItem[]>(group.items);
  const [saving, setSaving] = useState(false);

  // Reset when group changes (re-open)
  const resetState = useCallback(() => {
    setTitle(group.title);
    setPercentMin(String(group.percentMin));
    setPercentMax(String(group.percentMax));
    setItems(group.items);
  }, [group]);

  const handleOpen = useCallback(() => {
    resetState();
  }, [resetState]);

  // Sync state when sheet opens
  useState(() => {
    if (isOpen) handleOpen();
  });

  function moveItem(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateItemTitle(idx: number, val: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, title: val } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `item_${Date.now()}`, title: "" }]);
  }

  async function handleSave() {
    setSaving(true);
    const cleanItems = items
      .map((it) => ({
        id: it.id.startsWith("item_") ? slugify(it.title) || it.id : it.id,
        title: it.title.trim(),
      }))
      .filter((it) => it.title.length > 0);

    const updated: FinanceGroup = {
      ...group,
      title: title.trim() || group.title,
      percentMin: Math.max(0, Math.min(100, Number(percentMin) || 0)),
      percentMax: Math.max(0, Math.min(100, Number(percentMax) || 100)),
      items: cleanItems,
    };
    await onSave(updated);
    setSaving(false);
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`${group.title} 편집`}>
      <div className="space-y-5">
        {/* Group name */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">그룹 이름</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLS}
            placeholder="그룹 이름"
          />
        </div>

        {/* Guide range */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">가이드 범위 (%)</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              value={percentMin}
              onChange={(e) => setPercentMin(e.target.value)}
              className={INPUT_CLS + " text-right"}
              placeholder="최소"
            />
            <span className="text-gray-400 shrink-0">~</span>
            <input
              type="number"
              min={0}
              max={100}
              value={percentMax}
              onChange={(e) => setPercentMax(e.target.value)}
              className={INPUT_CLS + " text-right"}
              placeholder="최대"
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">항목 목록</p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                    aria-label="위로"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                    aria-label="아래로"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItemTitle(idx, e.target.value)}
                  className={INPUT_CLS + " flex-1"}
                  placeholder="항목 이름"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="shrink-0 p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 w-full min-h-[40px] py-2 rounded-xl text-xs font-medium
              text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600
              hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={13} />
            항목 추가
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={SAVE_BTN_CLS}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </BottomSheet>
  );
}

// ── Recurring Editor BottomSheet ───────────────────────────────────────────

interface RecurringEditorProps {
  rule: FinanceRecurring | null; // null = new
  isOpen: boolean;
  onClose: () => void;
  groups: FinanceGroup[];
  incomeCategories: string[];
  onSave: (
    data: Omit<FinanceRecurring, "id" | "user_id" | "created_at" | "is_active">,
    id?: string
  ) => Promise<void>;
}

function RecurringEditor({ rule, isOpen, onClose, groups, incomeCategories, onSave }: RecurringEditorProps) {
  const [desc, setDesc] = useState(rule?.description ?? "");
  const [type, setType] = useState<"income" | "expense">(rule?.type ?? "expense");
  const [amount, setAmount] = useState(rule ? formatCurrency(rule.amount) : "");
  const [day, setDay] = useState(String(rule?.day_of_month ?? 1));
  const [groupId, setGroupId] = useState<string | null>(rule?.group_id ?? null);
  const [itemId, setItemId] = useState<string | null>(rule?.item_id ?? null);
  const [incomeCategory, setIncomeCategory] = useState<string | null>(rule?.income_category ?? null);
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // Reset when rule changes
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

  // Sync on open
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
        {/* Description */}
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

        {/* Type toggle */}
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

        {/* Amount */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
          <AmountInput value={amount} onChange={setAmount} placeholder="금액" />
        </div>

        {/* Day of month */}
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

        {/* Expense: group + item */}
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

        {/* Income: category */}
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

        {/* is_active toggle */}
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

export default function FinanceSettingsPage() {
  const { toast } = useToast();
  const {
    groups,
    incomeCategories,
    loading: settingsLoading,
    updateGroupConfigs,
    updateIncomeCategories,
  } = useBudgetSettings();

  const {
    recurring,
    loading: recurringLoading,
    addRecurring,
    updateRecurring,
    deleteRecurring,
  } = useRecurring();

  // ── Group editor ──────────────────────────────────────────────────────────
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const editingGroup = groups.find((g) => g.id === editingGroupId) ?? null;

  async function handleSaveGroup(updated: FinanceGroup) {
    const newGroups = groups.map((g) => (g.id === updated.id ? updated : g));
    const result = await updateGroupConfigs(newGroups);
    if (result.ok) {
      toast("그룹이 저장되었습니다", "success");
      setEditingGroupId(null);
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }

  // ── Income category editor ────────────────────────────────────────────────
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryText, setEditingCategoryText] = useState("");
  const [deleteCategoryIdx, setDeleteCategoryIdx] = useState<number | null>(null);

  async function handleAddCategory() {
    const val = newCategoryText.trim();
    if (!val) return;
    const result = await updateIncomeCategories([...incomeCategories, val]);
    if (result.ok) {
      setNewCategoryText("");
      setAddingCategory(false);
      toast("카테고리가 추가되었습니다", "success");
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }

  async function handleSaveCategoryEdit() {
    if (editingCategoryIdx === null) return;
    const val = editingCategoryText.trim();
    if (!val) return;
    const next = incomeCategories.map((c, i) => (i === editingCategoryIdx ? val : c));
    const result = await updateIncomeCategories(next);
    if (result.ok) {
      setEditingCategoryIdx(null);
      toast("카테고리가 수정되었습니다", "success");
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }

  async function handleDeleteCategory() {
    if (deleteCategoryIdx === null) return;
    const next = incomeCategories.filter((_, i) => i !== deleteCategoryIdx);
    const result = await updateIncomeCategories(next);
    if (result.ok) {
      setDeleteCategoryIdx(null);
      toast("카테고리가 삭제되었습니다", "success");
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }

  // ── Recurring editor ──────────────────────────────────────────────────────
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

  // ── Recurring filter (exclude subscription-linked entries) ────────────────
  const visibleRecurring = useMemo(
    () => recurring.filter((r) => !r.subscription_id),
    [recurring]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  function getItemsPreview(group: FinanceGroup): string {
    const MAX = 3;
    const titles = group.items.map((i) => i.title);
    if (titles.length <= MAX) return titles.join(" · ");
    return titles.slice(0, MAX).join(" · ") + ` 외 ${titles.length - MAX}개`;
  }

  const loading = settingsLoading || recurringLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32 bg-gray-50/50 dark:bg-[#0b0d12]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a2030] border-b border-gray-100 dark:border-[#2d3748]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/finance"
            aria-label="뒤로가기"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">재정 설정</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-8">

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-[#262c38] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Section 1: 그룹 관리 ──────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                그룹 관리
              </p>
              {groups.map((group) => (
                <FinanceCard key={group.id} groupColor={group.color}>
                  <div className="pl-2 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {group.title}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          가이드: {group.percentMin}~{group.percentMax}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getItemsPreview(group)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(group.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium
                        text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20
                        hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors active:scale-95"
                    >
                      <Pencil size={12} />
                      편집
                    </button>
                  </div>
                </FinanceCard>
              ))}
            </section>

            {/* ── Section 2: 수입 카테고리 ─────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                수입 카테고리
              </p>
              <FinanceCard>
                <div className="space-y-2">
                  {incomeCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2 min-h-[40px]">
                      {editingCategoryIdx === idx ? (
                        <>
                          <input
                            type="text"
                            value={editingCategoryText}
                            onChange={(e) => setEditingCategoryText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategoryEdit();
                              if (e.key === "Escape") setEditingCategoryIdx(null);
                            }}
                            className={INPUT_CLS + " flex-1"}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveCategoryEdit}
                            className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium bg-indigo-600 text-white hover:opacity-90 transition-opacity"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryIdx(null)}
                            className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748] transition-colors"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{cat}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryIdx(idx);
                              setEditingCategoryText(cat);
                            }}
                            className="shrink-0 p-2 rounded-xl text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            aria-label="편집"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCategoryIdx(idx)}
                            className="shrink-0 p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add inline */}
                  {addingCategory ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCategoryText}
                        onChange={(e) => setNewCategoryText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory();
                          if (e.key === "Escape") setAddingCategory(false);
                        }}
                        className={INPUT_CLS + " flex-1"}
                        placeholder="새 카테고리 이름"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium bg-indigo-600 text-white hover:opacity-90 transition-opacity"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingCategory(false); setNewCategoryText(""); }}
                        className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748] transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      className="mt-1 w-full min-h-[40px] py-2 rounded-xl text-xs font-medium
                        text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600
                        hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={13} />
                      카테고리 추가
                    </button>
                  )}
                </div>
              </FinanceCard>
            </section>

            {/* ── Section 3: 반복 거래 ──────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                반복 거래
              </p>
              <FinanceCard>
                {visibleRecurring.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    반복 거래 없음
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleRecurring.map((rule) => {
                      const ruleGroup = rule.group_id ? groups.find((g) => g.id === rule.group_id) : null;
                      const ruleItem = ruleGroup?.items.find((it) => it.id === rule.item_id) ?? null;
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

          </>
        )}
      </div>

      {/* ── Group Editor Sheet ───────────────────────────────────────────────── */}
      {editingGroup && (
        <GroupEditor
          key={editingGroup.id}
          group={editingGroup}
          isOpen={editingGroupId !== null}
          onClose={() => setEditingGroupId(null)}
          onSave={handleSaveGroup}
        />
      )}

      {/* ── Recurring Editor Sheet ───────────────────────────────────────────── */}
      <RecurringEditor
        rule={editingRule}
        isOpen={recurringSheetOpen}
        onClose={() => setRecurringSheetOpen(false)}
        groups={groups}
        incomeCategories={incomeCategories}
        onSave={handleSaveRecurring}
      />

      {/* ── Delete Category Confirm ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteCategoryIdx !== null}
        onClose={() => setDeleteCategoryIdx(null)}
        onConfirm={handleDeleteCategory}
        title="카테고리 삭제"
        description={
          deleteCategoryIdx !== null
            ? `"${incomeCategories[deleteCategoryIdx]}" 카테고리를 삭제하시겠어요?`
            : undefined
        }
        confirmLabel="삭제"
        variant="danger"
      />

      {/* ── Delete Recurring Confirm ─────────────────────────────────────────── */}
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
