import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import { bumpFinance } from "@/lib/finance-bus";

export interface WishContributionInput {
  wishId: string;
  amount: number;
  date: string;
  description?: string;
}

export interface WishContributionResult {
  ok: boolean;
  transactionId?: string;
  error?: string;
}

export async function addWishContribution(
  input: WishContributionInput
): Promise<WishContributionResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: FIXED_USER_ID,
      date: input.date,
      type: "expense",
      group_id: "want",
      item_id: "want",
      amount: input.amount,
      description: input.description ?? "요망사항 기여",
      wishlist_id: input.wishId,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  bumpFinance("transactions");
  bumpFinance("wishlist");
  return { ok: true, transactionId: (data as { id: string }).id };
}
