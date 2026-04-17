"use client";

import { FinanceTransaction } from "@/types/database";
import { FinanceGroup, getItemTitle } from "@/lib/finance-config";
import { formatCurrency } from "@/lib/finance-utils";
import { GroupBadge } from "./group-badge";

interface TransactionRowProps {
  transaction: FinanceTransaction;
  groups: FinanceGroup[];
  onEdit?: (transaction: FinanceTransaction) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

const AUTO_SOURCES: Array<FinanceTransaction["source"]> = [
  "installment",
  "debt",
  "heaven_bank",
  "subscription",
];

const SOURCE_LABELS: Record<string, string> = {
  recurring: "반복",
  installment: "할부",
  debt: "상환",
  heaven_bank: "하늘은행",
  subscription: "구독",
};

export function TransactionRow({
  transaction,
  groups,
  onEdit,
  onDelete,
  readOnly,
}: TransactionRowProps) {
  const isAutoSource =
    transaction.source != null && AUTO_SOURCES.includes(transaction.source);
  const effectiveReadOnly = readOnly ?? isAutoSource;

  const group = transaction.group_id
    ? groups.find((g) => g.id === transaction.group_id)
    : null;
  const dotColor = group?.color ?? "#9CA3AF";

  const itemTitle =
    transaction.group_id && transaction.item_id
      ? getItemTitle(groups, transaction.group_id, transaction.item_id)
      : null;
  const displayTitle =
    transaction.description || itemTitle || transaction.group_id || "거래";

  const sourceLabel =
    transaction.source && transaction.source !== "manual"
      ? SOURCE_LABELS[transaction.source]
      : null;

  const amountColor =
    transaction.type === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  function handleClick() {
    if (effectiveReadOnly) return;
    if (onEdit) {
      onEdit(transaction);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!effectiveReadOnly && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick();
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (onDelete) onDelete(transaction.id);
  }

  return (
    <div
      onClick={effectiveReadOnly ? undefined : handleClick}
      onKeyDown={effectiveReadOnly ? undefined : handleKeyDown}
      role={effectiveReadOnly ? undefined : "button"}
      tabIndex={effectiveReadOnly ? undefined : 0}
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-white dark:bg-[#1a2030]",
        "border border-gray-100 dark:border-[#2d3748]",
        !effectiveReadOnly
          ? "cursor-pointer transition-transform active:scale-[0.98] hover:bg-gray-50 dark:hover:bg-[#1e2538]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Color dot */}
      <span
        className="flex-shrink-0 h-2 w-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />

      {/* Middle: title + badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {displayTitle}
          </p>
          {sourceLabel && (
            <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {sourceLabel}
            </span>
          )}
        </div>
        {transaction.group_id && (
          <GroupBadge
            groupId={transaction.group_id}
            itemId={transaction.item_id ?? undefined}
            groups={groups}
            size="sm"
          />
        )}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-semibold tabular-nums ${amountColor}`}>
          {formatCurrency(
            transaction.type === "income"
              ? transaction.amount
              : -transaction.amount,
            { sign: true }
          )}
        </span>
        {!effectiveReadOnly && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors p-1 -mr-1"
            aria-label="삭제"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
