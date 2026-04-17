export interface FaithBudgetItem {
  id: string;
  title: string;
}

export interface FaithBudgetGroup {
  id: string;
  title: string;
  percentGuide: string;
  items: FaithBudgetItem[];
}

export function getItemKey(groupId: string, itemId: string): string {
  return `${groupId}_${itemId}`;
}

export function getBudgetGroupId(budgetKey: string): string {
  return budgetKey.split("_")[0];
}

/** Default (fallback) group definitions */
export const FAITH_BUDGET_GROUPS: FaithBudgetGroup[] = [
  {
    id: "obligation",
    title: "의무사항",
    percentGuide: "35~40%",
    items: [
      { id: "tithe", title: "십일조" },
      { id: "debt", title: "빚 청산" },
      { id: "offering", title: "약속 헌금" },
      { id: "utility", title: "공과금" },
      { id: "tax", title: "세금" },
      { id: "parents", title: "부모님 용돈" },
    ],
  },
  {
    id: "necessity",
    title: "필요사항",
    percentGuide: "50~55%",
    items: [
      { id: "food", title: "식비" },
      { id: "grocery", title: "생필품" },
      { id: "transport", title: "교통비" },
      { id: "saving", title: "저축" },
      { id: "leisure", title: "여가선용비" },
      { id: "allowance", title: "개인 용돈" },
    ],
  },
  {
    id: "sowing",
    title: "좋은 땅 (하늘은행)",
    percentGuide: "5~10%",
    items: [
      { id: "heaven", title: "하늘은행" },
    ],
  },
  {
    id: "want",
    title: "요망사항",
    percentGuide: "5~10%",
    items: [
      { id: "want", title: "요망사항" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Dynamic custom-items helpers (localStorage-backed)
// ---------------------------------------------------------------------------

function getCustomStorageKey(groupId: string): string {
  return `faith-custom-items-${groupId}`;
}

/** Load user-customised items for a group from localStorage. Returns null if none saved. */
export function getCustomItems(groupId: string): FaithBudgetItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getCustomStorageKey(groupId));
    if (!raw) return null;
    const parsed: FaithBudgetItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist user-customised items for a group to localStorage. */
export function saveCustomItems(groupId: string, items: FaithBudgetItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCustomStorageKey(groupId), JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

/** Remove custom items for a group (revert to defaults). */
export function clearCustomItems(groupId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getCustomStorageKey(groupId));
  } catch {
    // ignore
  }
}

/**
 * Build the effective group list:
 * – If user has saved custom items for a group, use those.
 * – Otherwise fall back to the hardcoded defaults.
 */
export function getEffectiveGroups(): FaithBudgetGroup[] {
  return FAITH_BUDGET_GROUPS.map((group) => {
    const custom = getCustomItems(group.id);
    if (custom && custom.length > 0) {
      return { ...group, items: custom };
    }
    return group;
  });
}

/** Resolve a budgetKey (e.g. "obligation_tithe") to its human title using the effective (dynamic) groups. */
export function getBudgetItemTitle(budgetKey: string): string | null {
  const groups = getEffectiveGroups();
  for (const group of groups) {
    for (const item of group.items) {
      if (getItemKey(group.id, item.id) === budgetKey) {
        return item.title;
      }
    }
  }
  return null;
}
