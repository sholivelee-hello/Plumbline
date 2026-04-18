"use client";

import { FinanceGroup, getItemTitle } from "@/lib/finance-config";

interface GroupBadgeProps {
  groupId: string;
  itemId?: string;
  groups: FinanceGroup[];
  size?: "sm" | "md";
}

export function GroupBadge({ groupId, itemId, groups, size = "md" }: GroupBadgeProps) {
  const group = groups.find((g) => g.id === groupId);

  const dotColor = group?.color ?? "#9CA3AF";
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  let label: string;
  if (group) {
    if (itemId) {
      const itemTitle = getItemTitle(groups, groupId, itemId);
      label = `${group.title} · ${itemTitle}`;
    } else {
      label = group.title;
    }
  } else {
    label = itemId ?? groupId;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block rounded-full flex-shrink-0 ${dotSize}`}
        style={{ backgroundColor: dotColor }}
      />
      <span className={`${textSize} text-gray-500 dark:text-gray-400`}>{label}</span>
    </span>
  );
}
