"use client";

import { useEffect, useState } from "react";

// Topics that finance-data subscribers can watch. Bumping any topic tells
// every mounted hook for that topic to re-fetch. Use `"all"` to invalidate
// every topic at once (e.g. after a cascade delete that could affect anything).
export type FinanceTopic =
  | "transactions"
  | "debts"
  | "installments"
  | "subscriptions"
  | "recurring"
  | "heaven_bank"
  | "budget"
  | "wishlist"
  | "all";

type Listener = () => void;

const listeners: Record<FinanceTopic, Set<Listener>> = {
  transactions: new Set(),
  debts: new Set(),
  installments: new Set(),
  subscriptions: new Set(),
  recurring: new Set(),
  heaven_bank: new Set(),
  budget: new Set(),
  wishlist: new Set(),
  all: new Set(),
};

// Map from topic → which other topics it implies. When a mutation affects
// transactions it should also invalidate every derived view (debts, installments,
// etc.) because any of them could have a linked row that just got CASCADE-deleted.
const implications: Record<FinanceTopic, FinanceTopic[]> = {
  transactions: ["debts", "installments", "subscriptions", "recurring", "heaven_bank", "budget"],
  debts: ["transactions"],
  installments: ["transactions"],
  subscriptions: ["transactions", "recurring"],
  recurring: ["transactions"],
  heaven_bank: ["transactions"],
  budget: [],
  wishlist: [],
  all: ["transactions", "debts", "installments", "subscriptions", "recurring", "heaven_bank", "budget", "wishlist"],
};

function notify(topic: FinanceTopic) {
  for (const fn of listeners[topic]) fn();
  for (const fn of listeners.all) fn();
}

export function bumpFinance(topic: FinanceTopic) {
  notify(topic);
  for (const implied of implications[topic]) {
    notify(implied);
  }
}

export function subscribeFinance(topic: FinanceTopic, fn: Listener): () => void {
  listeners[topic].add(fn);
  return () => {
    listeners[topic].delete(fn);
  };
}

// Hook: returns a monotonically increasing tick that bumps whenever the given
// topic (or anything that implies it) is bumped. Use it as a useEffect dep to
// trigger re-fetching.
export function useFinanceTick(topic: FinanceTopic): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribeFinance(topic, () => setTick((n) => n + 1));
  }, [topic]);
  return tick;
}
