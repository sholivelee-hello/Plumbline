"use client";

import { useState } from "react";
import Link from "next/link";
import { useFinance } from "@/lib/hooks/use-finance";
import { getCurrentMonth } from "@/lib/utils/date";
import { AccountCard } from "@/components/finance/account-card";
import { Modal } from "@/components/ui/modal";
import type { AccountType } from "@/types/database";

const PRESET_COLORS = [
  "#A8C5A0", "#93B5C6", "#D4A5A5", "#C5B8A8",
  "#B0C4B1", "#C4A8C5", "#A8B8C5", "#C5C4A8",
];

export default function AccountsPage() {
  const month = getCurrentMonth();
  const { accounts, loading, addAccount } = useFinance(month);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await addAccount({ name: trimmed, type, color });
    setSaving(false);
    setName("");
    setType("bank");
    setColor(PRESET_COLORS[0]);
    setModalOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 px-4 py-4 flex items-center gap-3">
        <Link
          href="/finance"
          className="text-warm-400 hover:text-warm-600 transition-colors text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-warm-700 flex-1">계좌 관리</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm font-semibold text-warm-600 hover:text-warm-700 bg-cream-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          + 계좌 추가
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Total balance summary */}
        <div className="bg-white rounded-card shadow-card px-4 py-4">
          <p className="text-xs text-warm-400 mb-1">총 잔액</p>
          <p className="text-2xl font-bold text-warm-700 tabular-nums">
            ₩{totalBalance.toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-warm-400 mt-1">{accounts.length}개 계좌</p>
        </div>

        {/* Account list */}
        {loading ? (
          <div className="text-center py-12 text-warm-400 text-sm">
            불러오는 중...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-warm-400 text-sm">
            등록된 계좌가 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acct) => (
              <AccountCard key={acct.id} account={acct} />
            ))}
          </div>
        )}
      </div>

      {/* Add account modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="계좌 추가"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-warm-500 mb-1.5">
              계좌명
            </label>
            <input
              type="text"
              placeholder="예: 토스뱅크"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-warm-500 mb-1.5">
              종류
            </label>
            <div className="flex gap-2">
              {(["bank", "debit_card"] as AccountType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    type === t
                      ? "bg-warm-600 text-white"
                      : "bg-warm-50 text-warm-500 border border-warm-200 hover:bg-warm-100"
                  }`}
                >
                  {t === "bank" ? "은행" : "체크카드"}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-warm-500 mb-1.5">
              색상
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-warm-500 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-500 text-sm font-semibold hover:bg-warm-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              className="flex-1 py-3 rounded-xl bg-warm-600 text-white text-sm font-semibold hover:bg-warm-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
