"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { SOWING_PRESETS } from "@/lib/finance-config";
import type { HeavenBankEntry } from "@/types/database";
import { demoHeavenBank } from "@/lib/demo-data";

import { FinanceCard } from "@/components/finance/finance-card";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { GroupPageSkeleton } from "@/components/finance/finance-skeleton";
import { useToast } from "@/components/ui/toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface EntryWithBalance extends HeavenBankEntry {
  balance: number;
}

// ── Custom hook: fetch ALL heaven_bank entries (no month filter) ─────────────

function useAllHeavenBank() {
  const [entries, setEntries] = useState<HeavenBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("heaven_bank")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;
      setEntries(data ?? []);
    } catch {
      setEntries(demoHeavenBank as HeavenBankEntry[]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function insertEntry(entry: Omit<HeavenBankEntry, "id" | "user_id">): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("heaven_bank")
        .insert({ user_id: FIXED_USER_ID, ...entry });
      if (error) throw error;
      await load();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" };
    }
  }

  return { entries, loading, insertEntry, refresh: load };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getMonthLabel(date: string): string {
  const [year, month] = date.split("-");
  return `${year}년 ${parseInt(month)}월`;
}

function computeEntriesWithBalance(entries: HeavenBankEntry[]): EntryWithBalance[] {
  if (entries.length === 0) return [];

  const totalSow = entries.filter(e => e.type === "sow").reduce((s, e) => s + e.amount, 0);
  const totalReap = entries.filter(e => e.type === "reap").reduce((s, e) => s + e.amount, 0);
  const currentBalance = totalSow - totalReap;

  // entries are already sorted newest-first
  let runningBalance = currentBalance;
  return entries.map(entry => {
    const rowBalance = runningBalance;
    if (entry.type === "sow") runningBalance -= entry.amount;
    else runningBalance += entry.amount;
    return { ...entry, balance: rowBalance };
  });
}

function groupByMonth(entriesWithBalance: EntryWithBalance[]): Array<{ month: string; entries: EntryWithBalance[] }> {
  const map = new Map<string, EntryWithBalance[]>();
  for (const e of entriesWithBalance) {
    const key = e.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([month, entries]) => ({ month, entries }));
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SowingPage() {
  const { toast } = useToast();
  const currentMonth = getCurrentMonth();

  const { entries, loading, insertEntry } = useAllHeavenBank();
  const { addTransaction } = useFinanceTransactions(currentMonth);

  // ── Computed stats ───────────────────────────────────────────────────────
  const totalSow = entries.filter(e => e.type === "sow").reduce((s, e) => s + e.amount, 0);
  const totalReap = entries.filter(e => e.type === "reap").reduce((s, e) => s + e.amount, 0);
  const currentBalance = totalSow - totalReap;

  const thisMonth = currentMonth;
  const monthEntries = entries.filter(e => e.date.startsWith(thisMonth));
  const monthSow = monthEntries.filter(e => e.type === "sow").reduce((s, e) => s + e.amount, 0);
  const monthReap = monthEntries.filter(e => e.type === "reap").reduce((s, e) => s + e.amount, 0);

  const entriesWithBalance = computeEntriesWithBalance(entries);
  const grouped = groupByMonth(entriesWithBalance);

  // ── Sow sheet ────────────────────────────────────────────────────────────
  const [sowSheet, setSowSheet] = useState(false);
  const [sowTarget, setSowTarget] = useState("");
  const [sowCustomTarget, setSowCustomTarget] = useState("");
  const [sowAmount, setSowAmount] = useState("");
  const [sowDate, setSowDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [sowDesc, setSowDesc] = useState("");
  const [sowSaving, setSowSaving] = useState(false);

  function openSowSheet() {
    setSowTarget("");
    setSowCustomTarget("");
    setSowAmount("");
    setSowDate(new Date().toLocaleDateString("sv-SE"));
    setSowDesc("");
    setSowSheet(true);
  }

  const parsedSowAmount = parseCurrencyInput(sowAmount);
  const resolvedSowTarget = sowTarget === "__custom__" ? sowCustomTarget.trim() : sowTarget;
  const canSaveSow = parsedSowAmount > 0 && resolvedSowTarget.length > 0;

  const handleSaveSow = useCallback(async () => {
    if (!canSaveSow) return;
    setSowSaving(true);

    const hbResult = await insertEntry({
      date: sowDate,
      type: "sow",
      target: resolvedSowTarget,
      description: sowDesc.trim() || null,
      amount: parsedSowAmount,
    });

    if (!hbResult.ok) {
      toast(hbResult.error ?? "심음 기록 실패", "error");
      setSowSaving(false);
      return;
    }

    const txResult = await addTransaction({
      type: "expense",
      amount: parsedSowAmount,
      description: `하늘은행: ${resolvedSowTarget}${sowDesc.trim() ? " - " + sowDesc.trim() : ""}`,
      date: sowDate,
      group_id: "sowing",
      item_id: "heaven",
      source: "heaven_bank",
    });

    if (!txResult.ok) {
      toast("가계부 연동 실패 (심음은 기록됨)", "info");
    } else {
      toast(`심음 ${formatCurrency(parsedSowAmount)}원 기록됨`, "success");
    }

    setSowSaving(false);
    setSowSheet(false);
  }, [canSaveSow, parsedSowAmount, resolvedSowTarget, sowDate, sowDesc, insertEntry, addTransaction, toast]);

  // ── Reap sheet ────────────────────────────────────────────────────────────
  const [reapSheet, setReapSheet] = useState(false);
  const [reapDesc, setReapDesc] = useState("");
  const [reapAmount, setReapAmount] = useState("");
  const [reapDate, setReapDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [reapSaving, setReapSaving] = useState(false);

  function openReapSheet() {
    setReapDesc("");
    setReapAmount("");
    setReapDate(new Date().toLocaleDateString("sv-SE"));
    setReapSheet(true);
  }

  const parsedReapAmount = parseCurrencyInput(reapAmount);
  const canSaveReap = parsedReapAmount > 0 && reapDesc.trim().length > 0;

  const handleSaveReap = useCallback(async () => {
    if (!canSaveReap) return;
    setReapSaving(true);

    const hbResult = await insertEntry({
      date: reapDate,
      type: "reap",
      target: null,
      description: reapDesc.trim(),
      amount: parsedReapAmount,
    });

    if (!hbResult.ok) {
      toast(hbResult.error ?? "거둠 기록 실패", "error");
      setReapSaving(false);
      return;
    }

    const txResult = await addTransaction({
      type: "income",
      amount: parsedReapAmount,
      description: `하늘은행 거둠: ${reapDesc.trim()}`,
      date: reapDate,
      group_id: "sowing",
      item_id: "heaven",
      source: "heaven_bank",
    });

    if (!txResult.ok) {
      toast("가계부 연동 실패 (거둠은 기록됨)", "info");
    } else {
      toast(`거둠 ${formatCurrency(parsedReapAmount)}원 기록됨`, "success");
    }

    setReapSaving(false);
    setReapSheet(false);
  }, [canSaveReap, parsedReapAmount, reapDesc, reapDate, insertEntry, addTransaction, toast]);

  // ── Render ────────────────────────────────────────────────────────────────

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
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">하늘은행</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {loading ? (
          <GroupPageSkeleton />
        ) : (
          <>
            {/* ── Passbook Header Card ─────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] px-6 py-7 text-white">
                <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-3">
                  하늘은행 잔액
                </p>
                <p className="text-4xl font-bold tabular-nums tracking-tight mb-1">
                  {formatCurrency(currentBalance)}
                  <span className="text-lg font-medium opacity-80 ml-1">원</span>
                </p>
                <p className="text-xs opacity-70 mt-2 tabular-nums">
                  총 심음 {formatCurrency(totalSow)}원 · 총 거둠 {formatCurrency(totalReap)}원
                </p>
                {(monthSow > 0 || monthReap > 0) && (
                  <p className="text-xs opacity-60 mt-1 tabular-nums">
                    이번 달 심음 {formatCurrency(monthSow)}원 · 거둠 {formatCurrency(monthReap)}원
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="bg-[#6D28D9] flex">
                <button
                  type="button"
                  onClick={openSowSheet}
                  className="flex-1 py-3.5 text-sm font-semibold text-white/90
                    hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  심기
                </button>
                <div className="w-px bg-white/20" />
                <button
                  type="button"
                  onClick={openReapSheet}
                  className="flex-1 py-3.5 text-sm font-semibold text-white/90
                    hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  거두기
                </button>
              </div>
            </div>

            {/* ── Transactions List ────────────────────────────────────────── */}
            {entries.length === 0 ? (
              <FinanceCard>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  아직 기록이 없어요. 첫 심음을 시작해보세요!
                </p>
              </FinanceCard>
            ) : (
              <section className="space-y-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                  거래 내역
                </p>

                {grouped.map(({ month, entries: monthRows }) => (
                  <div key={month}>
                    {/* Month divider */}
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-1 mb-2">
                      {getMonthLabel(month + "-01")}
                    </p>

                    <FinanceCard>
                      <div className="divide-y divide-gray-100 dark:divide-[#2d3748]">
                        {monthRows.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            {/* Date */}
                            <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500 w-8 shrink-0">
                              {formatDate(entry.date)}
                            </span>

                            {/* Description */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                {entry.type === "sow"
                                  ? entry.target ?? "심음"
                                  : entry.description ?? "거둠"}
                              </p>
                              {entry.type === "sow" && entry.description && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                  {entry.description}
                                </p>
                              )}
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0">
                              <p
                                className={`text-sm font-semibold tabular-nums ${
                                  entry.type === "sow"
                                    ? "text-[#7C3AED] dark:text-violet-400"
                                    : "text-red-500 dark:text-red-400"
                                }`}
                              >
                                {entry.type === "sow" ? "+" : "-"}
                                {formatCurrency(entry.amount)}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                                잔액 {formatCurrency(entry.balance)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </FinanceCard>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Sow BottomSheet ──────────────────────────────────────────────────── */}
      <BottomSheet isOpen={sowSheet} onClose={() => setSowSheet(false)} title="심기">
        <div className="space-y-5">

          {/* Preset target chips */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">대상 선택</p>
            <div className="flex flex-wrap gap-2">
              {SOWING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setSowTarget(preset); setSowCustomTarget(""); }}
                  className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                    sowTarget === preset
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-violet-300 hover:bg-[#7C3AED]/20"
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSowTarget("__custom__")}
                className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                  sowTarget === "__custom__"
                    ? "bg-[#7C3AED] text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-[#262c38] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3748]"
                }`}
              >
                직접 입력
              </button>
            </div>
          </div>

          {/* Custom target input */}
          {sowTarget === "__custom__" && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">직접 입력</p>
              <input
                type="text"
                value={sowCustomTarget}
                onChange={(e) => setSowCustomTarget(e.target.value)}
                placeholder="예: 특별 헌금"
                autoFocus
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                  bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
            <AmountInput value={sowAmount} onChange={setSowAmount} placeholder="금액" autoFocus={sowTarget !== "" && sowTarget !== "__custom__"} />
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
            <input
              type="date"
              value={sowDate}
              onChange={(e) => setSowDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">메모 (선택)</p>
            <input
              type="text"
              value={sowDesc}
              onChange={(e) => setSowDesc(e.target.value)}
              placeholder="내역 설명"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveSow(); }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveSow}
            disabled={sowSaving || !canSaveSow}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#7C3AED] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {sowSaving ? "저장 중..." : "심기"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Reap BottomSheet ─────────────────────────────────────────────────── */}
      <BottomSheet isOpen={reapSheet} onClose={() => setReapSheet(false)} title="거두기">
        <div className="space-y-5">

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">어떻게 채워주셨나요?</p>
            <input
              type="text"
              value={reapDesc}
              onChange={(e) => setReapDesc(e.target.value)}
              placeholder="예: 사업 계약, 예상치 못한 선물"
              autoFocus
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
            />
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
            <AmountInput value={reapAmount} onChange={setReapAmount} placeholder="금액" />
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
            <input
              type="date"
              value={reapDate}
              onChange={(e) => setReapDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveReap}
            disabled={reapSaving || !canSaveReap}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#7C3AED] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {reapSaving ? "저장 중..." : "거두기"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
