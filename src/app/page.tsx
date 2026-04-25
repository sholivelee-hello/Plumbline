"use client";

import { CategoryBalanceTrend } from "@/components/dashboard/category-balance-trend";
import { FinanceSummary } from "@/components/dashboard/finance-summary";
import { DonutChart } from "@/components/ui/donut-chart";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useBasics } from "@/lib/hooks/use-basics";
import { getLogicalDate, formatDateKR } from "@/lib/utils/date";
import { getGreeting } from "@/lib/utils/greeting";
import { calcPercent } from "@/lib/utils/format";

export default function DashboardPage() {
  const today = getLogicalDate();
  const greeting = getGreeting();

  const { templates, logs, loading } = useBasics();
  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = templates.length;
  const percent = calcPercent(completedCount, totalCount);

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-4 lg:space-y-6">
      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            {formatDateKR(today)}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {greeting}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Hero card: 달성률 도넛 */}
      <Card className="flex items-center gap-5 animate-slide-up-fade">
        <DonutChart
          percent={percent}
          size={112}
          strokeWidth={10}
          label="오늘 달성률"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">오늘의 베이직</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {loading ? "…" : `${completedCount} / ${totalCount}`}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            {totalCount === 0
              ? "베이직을 추가하고 하루의 기준을 세워보세요."
              : percent === 100
              ? "오늘도 끝까지 잘 해냈어요 🙌"
              : "한 걸음씩, 꾸준히 세워가요."}
          </p>
        </div>
      </Card>

      <CategoryBalanceTrend />
      <FinanceSummary />
    </div>
  );
}
