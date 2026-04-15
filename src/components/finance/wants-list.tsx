"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart } from "lucide-react";
import { formatWon } from "@/lib/utils/format";
import type { FinanceWant } from "@/types/database";

interface WantsListProps {
  wants: FinanceWant[];
  onAdd: (title: string, estimatedPrice: number | null) => void;
  onToggle: (id: string, isPurchased: boolean) => void;
}

export function WantsList({ wants, onAdd, onToggle }: WantsListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const active = wants.filter((w) => !w.is_purchased);
  const purchased = wants.filter((w) => w.is_purchased);

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    const price = newPrice.trim() !== "" ? Number(newPrice) : null;
    onAdd(title, isNaN(price as number) ? null : price);
    setNewTitle("");
    setNewPrice("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="space-y-2">
      {active.map((w) => (
        <Card key={w.id}>
          <div className="flex items-center gap-3">
            <Toggle
              checked={false}
              onChange={(checked) => onToggle(w.id, checked)}
              size="md"
              ariaLabel={`${w.title} 구매 완료 표시`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {w.title}
              </p>
            </div>
            {w.estimated_price != null && (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums flex-shrink-0">
                ₩{formatWon(w.estimated_price)}
              </span>
            )}
          </div>
        </Card>
      ))}

      {purchased.map((w) => (
        <Card key={w.id} className="bg-gray-50 dark:!bg-[#1f242e]">
          <div className="flex items-center gap-3">
            <Toggle
              checked={true}
              onChange={(checked) => onToggle(w.id, checked)}
              size="md"
              ariaLabel={`${w.title} 구매 취소 표시`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 line-through truncate">
                {w.title}
              </p>
            </div>
            {w.estimated_price != null && (
              <span className="text-sm font-semibold text-gray-300 dark:text-gray-600 tabular-nums flex-shrink-0 line-through">
                ₩{formatWon(w.estimated_price)}
              </span>
            )}
          </div>
        </Card>
      ))}

      {wants.length === 0 && (
        <EmptyState
          icon={<Heart size={28} strokeWidth={1.5} />}
          title="아직 담아둔 요망사항이 없어요"
          description="갖고 싶은 것을 적어두고 여유가 될 때 풀어놔요"
        />
      )}

      <Card className="bg-gray-50 dark:!bg-[#1f242e]">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            새 항목 추가
          </p>
          <input
            type="text"
            placeholder="원하는 것..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#161a22] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-want-300"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="예상 가격 (선택)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-xl border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#161a22] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-want-300"
              min="0"
            />
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-want-500 text-white text-sm font-semibold hover:bg-want-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 tap-press"
            >
              추가
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
