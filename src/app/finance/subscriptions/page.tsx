"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp, MoreHorizontal, Trash2, Pencil, DollarSign, X, RefreshCw } from "lucide-react";

import { useSubscriptions } from "@/lib/hooks/use-subscriptions";
import { formatCurrency, parseCurrencyInput, adjustDayOfMonth, getCurrentMonth, shiftMonth, getLastDayOfMonth } from "@/lib/finance-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FinanceCard } from "@/components/finance/finance-card";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { useToast } from "@/components/ui/toast";

import type {
  FinanceSubscription,
  FinanceSubscriptionAmountChange,
  FinanceSubscriptionCancellation,
} from "@/types/database";

// ── Upcoming calculation ────────────────────────────────────────────────────

interface UpcomingEntry {
  sub: FinanceSubscription;
  daysUntil: number;
}

function computeUpcoming(active: FinanceSubscription[]): UpcomingEntry[] {
  const today = new Date();
  const todayDay = today.getDate();
  const currentMonth = getCurrentMonth();

  return active
    .map((s) => {
      const targetDay = adjustDayOfMonth(s.day_of_month, currentMonth);
      let daysUntil: number;
      if (targetDay >= todayDay) {
        daysUntil = targetDay - todayDay;
      } else {
        const nextMonth = shiftMonth(currentMonth, 1);
        const nextTargetDay = adjustDayOfMonth(s.day_of_month, nextMonth);
        daysUntil = getLastDayOfMonth(currentMonth) - todayDay + nextTargetDay;
      }
      return { sub: s, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);
}

// ── History cache type ──────────────────────────────────────────────────────

interface HistoryCache {
  amount: FinanceSubscriptionAmountChange[];
  cancel: FinanceSubscriptionCancellation[];
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { toast } = useToast();

  const {
    activeSubscriptions,
    cancelledSubscriptions,
    totalMonthlyAmount,
    loading,
    addSubscription,
    updateSubscription,
    updateAmount,
    cancelSubscription,
    rejoinSubscription,
    deleteSubscription,
    getAmountHistory,
    getCancellationHistory,
  } = useSubscriptions();

  // ── UI state ──────────────────────────────────────────────────────────

  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState<string | null>(null);

  // History cache per subscription
  const [histories, setHistories] = useState<Record<string, HistoryCache>>({});

  const loadHistory = useCallback(
    async (id: string) => {
      if (histories[id]) return;
      const [amount, cancel] = await Promise.all([
        getAmountHistory(id),
        getCancellationHistory(id),
      ]);
      setHistories((h) => ({ ...h, [id]: { amount, cancel } }));
    },
    [histories, getAmountHistory, getCancellationHistory]
  );

  function toggleExpand(id: string) {
    const next = expandedSub === id ? null : id;
    setExpandedSub(next);
    if (next) loadHistory(next);
  }

  // ── Add sheet ─────────────────────────────────────────────────────────

  const [addSheet, setAddSheet] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addCard, setAddCard] = useState("");
  const [addDay, setAddDay] = useState("1");
  const [addStartDate, setAddStartDate] = useState(
    () => new Date().toLocaleDateString("sv-SE")
  );
  const [addSaving, setAddSaving] = useState(false);

  const parsedAddAmount = parseCurrencyInput(addAmount);
  const canSaveAdd =
    addTitle.trim().length > 0 &&
    parsedAddAmount > 0 &&
    Number(addDay) >= 1 &&
    Number(addDay) <= 31;

  function openAddSheet() {
    setAddTitle("");
    setAddAmount("");
    setAddCard("");
    setAddDay("1");
    setAddStartDate(new Date().toLocaleDateString("sv-SE"));
    setAddSheet(true);
  }

  const handleAdd = useCallback(async () => {
    if (!canSaveAdd) return;
    setAddSaving(true);
    const result = await addSubscription({
      title: addTitle.trim(),
      amount: parsedAddAmount,
      card_label: addCard.trim() || undefined,
      day_of_month: Number(addDay),
      start_date: addStartDate,
    });
    setAddSaving(false);
    if (result.ok) {
      toast("구독이 추가되었습니다", "success");
      setAddSheet(false);
    } else {
      toast(result.error ?? "추가에 실패했습니다", "error");
    }
  }, [canSaveAdd, addTitle, parsedAddAmount, addCard, addDay, addStartDate, addSubscription, toast]);

  // ── Edit info sheet ───────────────────────────────────────────────────

  const [editSheet, setEditSheet] = useState(false);
  const [editTarget, setEditTarget] = useState<FinanceSubscription | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCard, setEditCard] = useState("");
  const [editDay, setEditDay] = useState("1");
  const [editSaving, setEditSaving] = useState(false);

  function openEditSheet(sub: FinanceSubscription) {
    setEditTarget(sub);
    setEditTitle(sub.title);
    setEditCard(sub.card_label ?? "");
    setEditDay(String(sub.day_of_month));
    setEditSheet(true);
    setOverflowOpen(null);
  }

  const canSaveEdit =
    editTitle.trim().length > 0 &&
    Number(editDay) >= 1 &&
    Number(editDay) <= 31;

  const handleSaveEdit = useCallback(async () => {
    if (!editTarget || !canSaveEdit) return;
    setEditSaving(true);
    const result = await updateSubscription(editTarget.id, {
      title: editTitle.trim(),
      card_label: editCard.trim() || undefined,
      day_of_month: Number(editDay),
    });
    setEditSaving(false);
    if (result.ok) {
      toast("수정되었습니다", "success");
      setEditSheet(false);
    } else {
      toast(result.error ?? "수정에 실패했습니다", "error");
    }
  }, [editTarget, canSaveEdit, editTitle, editCard, editDay, updateSubscription, toast]);

  // ── Change amount sheet ───────────────────────────────────────────────

  const [amountSheet, setAmountSheet] = useState(false);
  const [amountTarget, setAmountTarget] = useState<FinanceSubscription | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [amountEffDate, setAmountEffDate] = useState(
    () => new Date().toLocaleDateString("sv-SE")
  );
  const [amountNote, setAmountNote] = useState("");
  const [amountSaving, setAmountSaving] = useState(false);

  function openAmountSheet(sub: FinanceSubscription) {
    setAmountTarget(sub);
    setNewAmount("");
    setAmountEffDate(new Date().toLocaleDateString("sv-SE"));
    setAmountNote("");
    setAmountSheet(true);
    setOverflowOpen(null);
  }

  const parsedNewAmount = parseCurrencyInput(newAmount);
  const canSaveAmount = parsedNewAmount > 0;

  const handleSaveAmount = useCallback(async () => {
    if (!amountTarget || !canSaveAmount) return;
    setAmountSaving(true);
    const result = await updateAmount(
      amountTarget.id,
      parsedNewAmount,
      amountEffDate,
      amountNote.trim() || undefined
    );
    setAmountSaving(false);
    if (result.ok) {
      toast("금액이 변경되었습니다", "success");
      setAmountSheet(false);
      // Invalidate cached history so it reloads on next expand
      setHistories((h) => {
        const copy = { ...h };
        delete copy[amountTarget.id];
        return copy;
      });
    } else {
      toast(result.error ?? "변경에 실패했습니다", "error");
    }
  }, [amountTarget, canSaveAmount, parsedNewAmount, amountEffDate, amountNote, updateAmount, toast]);

  // ── Cancel sheet ──────────────────────────────────────────────────────

  const [cancelSheet, setCancelSheet] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<FinanceSubscription | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  function openCancelSheet(sub: FinanceSubscription) {
    setCancelTarget(sub);
    setCancelNote("");
    setCancelSheet(true);
    setOverflowOpen(null);
  }

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    const result = await cancelSubscription(cancelTarget.id, cancelNote.trim() || undefined);
    setCancelSaving(false);
    if (result.ok) {
      toast("구독이 해제되었습니다", "success");
      setCancelSheet(false);
    } else {
      toast(result.error ?? "해제에 실패했습니다", "error");
    }
  }, [cancelTarget, cancelNote, cancelSubscription, toast]);

  // ── Rejoin confirm ────────────────────────────────────────────────────

  const [rejoinConfirm, setRejoinConfirm] = useState(false);
  const [rejoinTarget, setRejoinTarget] = useState<FinanceSubscription | null>(null);
  const [rejoinLoading, setRejoinLoading] = useState(false);

  function openRejoinConfirm(sub: FinanceSubscription) {
    setRejoinTarget(sub);
    setRejoinConfirm(true);
  }

  const handleRejoin = useCallback(async () => {
    if (!rejoinTarget) return;
    setRejoinLoading(true);
    const result = await rejoinSubscription(rejoinTarget.id);
    setRejoinLoading(false);
    if (result.ok) {
      toast("재구독되었습니다", "success");
    } else {
      toast(result.error ?? "재구독에 실패했습니다", "error");
    }
    setRejoinConfirm(false);
    setRejoinTarget(null);
  }, [rejoinTarget, rejoinSubscription, toast]);

  // ── Delete confirm (two-step) ─────────────────────────────────────────

  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=closed,1=step1,2=step2
  const [deleteTarget, setDeleteTarget] = useState<FinanceSubscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openDeleteConfirm(sub: FinanceSubscription) {
    setDeleteTarget(sub);
    setDeleteStep(1);
  }

  const handleDeleteStep1 = useCallback(() => {
    setDeleteStep(2);
  }, []);

  const handleDeleteFinal = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteSubscription(deleteTarget.id);
    setDeleteLoading(false);
    if (result.ok) {
      toast("영구 삭제되었습니다", "success");
    } else {
      toast(result.error ?? "삭제에 실패했습니다", "error");
    }
    setDeleteStep(0);
    setDeleteTarget(null);
  }, [deleteTarget, deleteSubscription, toast]);

  function closeDeleteConfirm() {
    setDeleteStep(0);
    setDeleteTarget(null);
  }

  // ── Upcoming ──────────────────────────────────────────────────────────

  const upcoming = computeUpcoming(activeSubscriptions);

  // ── Render ─────────────────────────────────────────────────────────────

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
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">구독 관리</h1>
          <button
            type="button"
            onClick={openAddSheet}
            className="px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-white
              bg-[#2563EB] hover:opacity-90 active:scale-95 transition-all"
          >
            + 구독 추가
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {/* ── Summary Card ─────────────────────────────────────────────── */}
        <FinanceCard groupColor="#2563EB">
          <div className="pl-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              구독 현황
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">활성 구독</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                  {activeSubscriptions.length}건
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">월 총액</p>
                <p className="text-sm font-semibold text-[#2563EB] dark:text-blue-300 tabular-nums">
                  {formatCurrency(totalMonthlyAmount)}원
                </p>
              </div>
            </div>
            {upcoming.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">다음 결제 예정</p>
                <div className="space-y-1">
                  {upcoming.map(({ sub, daysUntil }) => (
                    <div key={sub.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-200 truncate flex-1">
                        {sub.title}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 tabular-nums shrink-0 ml-2">
                        매달 {sub.day_of_month}일
                        {daysUntil === 0 ? " (오늘)" : ` (${daysUntil}일 후)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FinanceCard>

        {/* ── Active Subscriptions ──────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
            활성 구독 ({activeSubscriptions.length})
          </p>

          {loading ? (
            <FinanceCard>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                불러오는 중...
              </p>
            </FinanceCard>
          ) : activeSubscriptions.length === 0 ? (
            <FinanceCard>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                등록된 구독이 없어요
              </p>
            </FinanceCard>
          ) : (
            activeSubscriptions.map((sub) => {
              const isExpanded = expandedSub === sub.id;
              const isOverflowOpen = overflowOpen === sub.id;
              const hist = histories[sub.id];

              return (
                <FinanceCard key={sub.id} groupColor="#2563EB">
                  <div className="pl-2">
                    {/* Title row + overflow */}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {sub.title}
                          </h3>
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                            bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                            구독
                          </span>
                        </div>
                      </div>
                      <div className="relative shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setOverflowOpen(isOverflowOpen ? null : sub.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500
                            hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
                          aria-label="더보기"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {isOverflowOpen && (
                          <div className="absolute right-0 top-9 z-20 w-36 rounded-xl shadow-lg border border-gray-100 dark:border-[#2d3748]
                            bg-white dark:bg-[#1a2030] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => openEditSheet(sub)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200
                                hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                            >
                              <Pencil size={13} />
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => openAmountSheet(sub)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200
                                hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                            >
                              <DollarSign size={13} />
                              금액 변경
                            </button>
                            <button
                              type="button"
                              onClick={() => openCancelSheet(sub)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-orange-500 dark:text-orange-400
                                hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              <X size={13} />
                              해제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount + day */}
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums mb-1">
                      {formatCurrency(sub.amount)}원 / 월
                    </p>
                    <div className="space-y-0.5 mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        결제일: 매달 {sub.day_of_month}일
                      </p>
                      {sub.card_label && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          결제 카드: {sub.card_label}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        시작일: {sub.start_date}
                      </p>
                    </div>

                    {/* History toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(sub.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                        hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? "이력 숨기기" : "이력 보기"}
                    </button>

                    {/* History panel */}
                    {isExpanded && (
                      <div className="mt-3 border-t border-gray-100 dark:border-[#2d3748] pt-3 space-y-4">
                        {/* Amount change history */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                            금액 변경 이력
                          </p>
                          {!hist ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">불러오는 중...</p>
                          ) : hist.amount.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">변경 이력 없음</p>
                          ) : (
                            hist.amount.map((ch) => (
                              <div key={ch.id} className="flex items-center text-xs text-gray-600 dark:text-gray-300 mb-1">
                                <span className="tabular-nums text-gray-400 dark:text-gray-500 shrink-0 mr-2">
                                  {ch.effective_date}
                                </span>
                                <span className="tabular-nums">
                                  {formatCurrency(ch.old_amount)} → {formatCurrency(ch.new_amount)}원
                                </span>
                                {ch.note && (
                                  <span className="ml-1 text-gray-400 dark:text-gray-500">
                                    ({ch.note})
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Cancellation history (for rejoined subs) */}
                        {hist && hist.cancel.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                              해제 이력
                            </p>
                            {hist.cancel.map((c) => (
                              <div key={c.id} className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                <span className="tabular-nums text-gray-400 dark:text-gray-500">
                                  {c.cancelled_at.slice(0, 10)} 해제
                                </span>
                                {c.rejoined_at && (
                                  <span className="tabular-nums text-gray-400 dark:text-gray-500">
                                    {" → "}{c.rejoined_at.slice(0, 10)} 재구독
                                  </span>
                                )}
                                {c.note && (
                                  <span className="ml-1 text-gray-400 dark:text-gray-500">
                                    ({c.note})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FinanceCard>
              );
            })
          )}
        </section>

        {/* ── Cancelled Subscriptions ───────────────────────────────────── */}
        {cancelledSubscriptions.length > 0 && (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setCancelledExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-1
                text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
            >
              <span>해제된 구독 ({cancelledSubscriptions.length}건)</span>
              {cancelledExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {cancelledExpanded &&
              cancelledSubscriptions.map((sub) => (
                <FinanceCard key={sub.id} groupColor="#9CA3AF">
                  <div className="pl-2 opacity-60">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate flex-1">
                        {sub.title}
                      </h3>
                      <span className="shrink-0 ml-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                        해제됨
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 tabular-nums">
                      {formatCurrency(sub.amount)}원 / 월
                    </p>
                    {sub.cancelled_at && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                        해제일: {sub.cancelled_at.slice(0, 10)}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openRejoinConfirm(sub)}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-500 dark:text-blue-400
                          hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <RefreshCw size={12} />
                        재구독
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(sub)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-400 dark:text-red-500
                          hover:text-red-600 dark:hover:text-red-400 transition-colors ml-3"
                      >
                        <Trash2 size={12} />
                        영구 삭제
                      </button>
                    </div>
                  </div>
                </FinanceCard>
              ))}
          </section>
        )}
      </div>

      {/* ── Add Subscription Sheet ────────────────────────────────────────── */}
      <BottomSheet isOpen={addSheet} onClose={() => setAddSheet(false)} title="구독 추가">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="예: 유튜브 프리미엄"
              autoFocus
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
            <AmountInput value={addAmount} onChange={setAddAmount} placeholder="구독료" />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              결제 카드 (선택)
            </p>
            <input
              type="text"
              value={addCard}
              onChange={(e) => setAddCard(e.target.value)}
              placeholder="예: 신한카드 1234"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              결제일 (1–31)
            </p>
            <input
              type="number"
              min={1}
              max={31}
              value={addDay}
              onChange={(e) => setAddDay(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">시작일</p>
            <input
              type="date"
              value={addStartDate}
              onChange={(e) => setAddStartDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={addSaving || !canSaveAdd}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#2563EB] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {addSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit Info Sheet ───────────────────────────────────────────────── */}
      <BottomSheet isOpen={editSheet} onClose={() => setEditSheet(false)} title="구독 수정">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목"
              autoFocus
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              결제 카드 (선택)
            </p>
            <input
              type="text"
              value={editCard}
              onChange={(e) => setEditCard(e.target.value)}
              placeholder="예: 신한카드 1234"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              결제일 (1–31)
            </p>
            <input
              type="number"
              min={1}
              max={31}
              value={editDay}
              onChange={(e) => setEditDay(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          {editTarget && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#262c38] text-xs text-gray-500 dark:text-gray-400">
              금액 변경은 <span className="font-semibold text-gray-700 dark:text-gray-200">&quot;금액 변경&quot;</span> 메뉴를 이용하세요
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={editSaving || !canSaveEdit}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#2563EB] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {editSaving ? "저장 중..." : "수정 저장"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Change Amount Sheet ───────────────────────────────────────────── */}
      <BottomSheet isOpen={amountSheet} onClose={() => setAmountSheet(false)} title="금액 변경">
        <div className="space-y-5">
          {amountTarget && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#262c38] text-xs text-gray-500 dark:text-gray-400">
              현재 금액:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                {formatCurrency(amountTarget.amount)}원
              </span>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">새 금액 (원)</p>
            <AmountInput value={newAmount} onChange={setNewAmount} placeholder="새 구독료" autoFocus />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">적용 시작일</p>
            <input
              type="date"
              value={amountEffDate}
              onChange={(e) => setAmountEffDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              변경 사유 (선택)
            </p>
            <input
              type="text"
              value={amountNote}
              onChange={(e) => setAmountNote(e.target.value)}
              placeholder="예: 인상, 할인 적용"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20
            rounded-xl px-3 py-2">
            이전 거래는 변경되지 않습니다
          </p>

          <button
            type="button"
            onClick={handleSaveAmount}
            disabled={amountSaving || !canSaveAmount}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#2563EB] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {amountSaving ? "저장 중..." : "금액 변경"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Cancel Sheet ─────────────────────────────────────────────────── */}
      <BottomSheet isOpen={cancelSheet} onClose={() => setCancelSheet(false)} title="구독 해제">
        <div className="space-y-5">
          {cancelTarget && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{cancelTarget.title}</span> 구독을 해제하시겠어요?
            </p>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              해제 사유 (선택)
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="해제 사유를 입력하세요"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30
                resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCancelSheet(false)}
              disabled={cancelSaving}
              className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-[#262c38]
                text-sm font-medium text-gray-600 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-[#1a1f29] transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelSaving}
              className="flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white
                bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40"
            >
              {cancelSaving ? "처리 중..." : "해제"}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Rejoin Confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={rejoinConfirm}
        title="재구독"
        description={rejoinTarget ? `"${rejoinTarget.title}"을(를) 재구독하시겠어요?` : ""}
        confirmLabel="재구독"
        cancelLabel="취소"
        variant="default"
        loading={rejoinLoading}
        onConfirm={handleRejoin}
        onClose={() => { setRejoinConfirm(false); setRejoinTarget(null); }}
      />

      {/* ── Delete Step 1 ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteStep === 1}
        title="구독 영구 삭제"
        description={deleteTarget ? `"${deleteTarget.title}" 구독을 영구 삭제하시겠어요? (모든 이력 포함)` : ""}
        confirmLabel="계속"
        cancelLabel="취소"
        variant="danger"
        loading={false}
        onConfirm={handleDeleteStep1}
        onClose={closeDeleteConfirm}
      />

      {/* ── Delete Step 2 ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteStep === 2}
        title="정말 삭제하시겠어요?"
        description="이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?"
        confirmLabel="영구 삭제"
        cancelLabel="취소"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteFinal}
        onClose={closeDeleteConfirm}
      />
    </div>
  );
}
