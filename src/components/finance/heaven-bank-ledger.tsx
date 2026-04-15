import { formatWon } from "@/lib/utils/format";
import type { HeavenBankEntry } from "@/types/database";

interface HeavenBankLedgerProps {
  entries: HeavenBankEntry[];
  monthlySow: number;
  monthlyReap: number;
  cumulativeSow: number;
}

export function HeavenBankLedger({
  entries,
  monthlySow,
  monthlyReap,
  cumulativeSow,
}: HeavenBankLedgerProps) {
  return (
    <div className="space-y-4">
      {/* Cumulative sow total */}
      <div className="bg-gray-50 dark:bg-[#1f242e] rounded-card p-5 text-center shadow-card">
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">누적 심음 총액</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          ₩{formatWon(cumulativeSow)}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">하늘나라에 쌓인 보물</p>
      </div>

      {/* Passbook table */}
      <div className="bg-white dark:bg-[#161a22] rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1f242e] border-b border-gray-100 dark:border-[#262c38]">
                <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold w-24">
                  날짜
                </th>
                <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold">
                  내용
                </th>
                <th className="text-right px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold w-28">
                  심음(입금)
                </th>
                <th className="text-right px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold w-28">
                  거둠(출금)
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm"
                  >
                    이번 달 내역이 없습니다
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-100 dark:border-[#262c38] ${
                      idx % 2 === 0 ? "bg-white dark:bg-[#161a22]" : "bg-gray-50 dark:bg-[#1f242e]"
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 tabular-nums">
                      {entry.date.slice(5)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {entry.type === "sow"
                        ? (entry.target ?? "—")
                        : (entry.description ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {entry.type === "sow" ? (
                        <span className="text-primary-500 font-medium">
                          +{formatWon(entry.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {entry.type === "reap" ? (
                        <span className="text-primary-500 font-medium">
                          -{formatWon(entry.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 dark:bg-[#262c38] border-t-2 border-gray-200 dark:border-[#262c38]">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold"
                  >
                    이번 달 합계
                  </td>
                  <td className="px-4 py-3 text-right text-primary-500 font-semibold tabular-nums">
                    +{formatWon(monthlySow)}
                  </td>
                  <td className="px-4 py-3 text-right text-primary-500 font-semibold tabular-nums">
                    -{formatWon(monthlyReap)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
