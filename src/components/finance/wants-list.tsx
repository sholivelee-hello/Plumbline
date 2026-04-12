"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
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
      {/* Active wants */}
      {active.map((w) => (
        <Card key={w.id}>
          <div className="flex items-center gap-3">
            <Toggle
              checked={false}
              onChange={(checked) => onToggle(w.id, checked)}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-700 truncate">
                {w.title}
              </p>
            </div>
            {w.estimated_price != null && (
              <span className="text-sm font-semibold text-warm-500 tabular-nums flex-shrink-0">
                ₩{formatWon(w.estimated_price)}
              </span>
            )}
          </div>
        </Card>
      ))}

      {/* Purchased wants */}
      {purchased.map((w) => (
        <Card key={w.id} className="bg-warm-50">
          <div className="flex items-center gap-3">
            <Toggle
              checked={true}
              onChange={(checked) => onToggle(w.id, checked)}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-300 line-through truncate">
                {w.title}
              </p>
            </div>
            {w.estimated_price != null && (
              <span className="text-sm font-semibold text-warm-300 tabular-nums flex-shrink-0 line-through">
                ₩{formatWon(w.estimated_price)}
              </span>
            )}
          </div>
        </Card>
      ))}

      {wants.length === 0 && (
        <div className="text-center py-6 text-warm-400 text-sm">
          요망 사항이 없습니다
        </div>
      )}

      {/* Inline add form */}
      <Card className="bg-cream-50">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-warm-500 mb-1">새 항목 추가</p>
          <input
            type="text"
            placeholder="원하는 것..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="예상 가격 (선택)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
              min="0"
            />
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-warm-600 text-white text-sm font-semibold hover:bg-warm-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              추가
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
