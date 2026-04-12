import { Card } from "@/components/ui/card";
import { formatWon } from "@/lib/utils/format";
import type { FinanceAccount } from "@/types/database";

interface AccountCardProps {
  account: FinanceAccount;
}

export function AccountCard({ account }: AccountCardProps) {
  const typeLabel = account.type === "bank" ? "은행" : "체크카드";

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex items-stretch">
        {/* Left color stripe */}
        <div
          className="w-1.5 flex-shrink-0 rounded-l-card"
          style={{ backgroundColor: account.color }}
        />

        {/* Content */}
        <div className="flex-1 flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div>
              <p className="text-sm font-semibold text-warm-700 truncate">
                {account.name}
              </p>
              <span className="inline-block mt-0.5 text-xs font-medium bg-cream-100 text-warm-500 px-2 py-0.5 rounded-full">
                {typeLabel}
              </span>
            </div>
          </div>
          <span className="text-base font-bold text-warm-700 tabular-nums flex-shrink-0 ml-3">
            ₩{formatWon(account.balance)}
          </span>
        </div>
      </div>
    </Card>
  );
}
