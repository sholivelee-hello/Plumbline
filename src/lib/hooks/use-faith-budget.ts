"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getEffectiveGroups } from "@/lib/faith-budget-config";

function getStorageKey(month: string) {
  return `faith-budget-${month}`;
}

function getItemKey(groupId: string, itemId: string) {
  return `${groupId}_${itemId}`;
}

export interface BudgetItemData {
  key: string;
  title: string;
  amount: number;
}

export interface BudgetGroupData {
  id: string;
  title: string;
  percentGuide: string;
  items: BudgetItemData[];
  subtotal: number;
}

export function useFaithBudget(month: string, categoryVersion: number = 0) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(month));
      if (stored) {
        setAmounts(JSON.parse(stored));
      } else {
        setAmounts({});
      }
    } catch {
      setAmounts({});
    }
  }, [month]);

  const updateAmount = useCallback(
    (itemKey: string, amount: number) => {
      setAmounts((prev) => {
        const next = { ...prev, [itemKey]: amount };
        try {
          localStorage.setItem(getStorageKey(month), JSON.stringify(next));
        } catch {
          // localStorage full or unavailable
        }
        return next;
      });
    },
    [month],
  );

  const bulkUpdateAmounts = useCallback(
    (updates: Record<string, number>) => {
      setAmounts((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem(getStorageKey(month), JSON.stringify(next));
        } catch {
          // localStorage full or unavailable
        }
        return next;
      });
    },
    [month],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveGroups = useMemo(() => getEffectiveGroups(), [categoryVersion]);

  const groups: BudgetGroupData[] = effectiveGroups.map((group) => {
    const items: BudgetItemData[] = group.items.map((item) => {
      const key = getItemKey(group.id, item.id);
      return {
        key,
        title: item.title,
        amount: amounts[key] || 0,
      };
    });
    return {
      id: group.id,
      title: group.title,
      percentGuide: group.percentGuide,
      items,
      subtotal: items.reduce((s, i) => s + i.amount, 0),
    };
  });

  const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);

  return { groups, grandTotal, updateAmount, bulkUpdateAmounts };
}
