"use client";

import { useBasicsStats } from "@/lib/hooks/use-basics-stats";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export function BasicsStats() {
  const { stats, loading } = useBasicsStats();

  if (loading) return <p className="text-warm-400 text-center text-sm">통계 로딩 중...</p>;

  const spiritual = stats.filter((s) => s.category === "spiritual");
  const physical = stats.filter((s) => s.category === "physical");
  const avgWeekly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.weeklyRate, 0) / stats.length)
    : 0;
  const avgMonthly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.monthlyRate, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">달성률</h3>
        <div className="flex gap-4 mb-3">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-warm-700">{avgWeekly}%</p>
            <p className="text-xs text-warm-400">주간</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-warm-700">{avgMonthly}%</p>
            <p className="text-xs text-warm-400">월간</p>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm text-warm-500 mb-1">
              <span>영적</span>
              <span>{spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0}%</span>
            </div>
            <ProgressBar percent={spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0} color="bg-sky-300" />
          </div>
          <div>
            <div className="flex justify-between text-sm text-warm-500 mb-1">
              <span>신체적</span>
              <span>{physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0}%</span>
            </div>
            <ProgressBar percent={physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0} color="bg-sage-300" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">연속 달성 (스트릭)</h3>
        <div className="space-y-2">
          {stats.map((s) => (
            <div key={s.templateId} className="flex items-center justify-between py-1">
              <span className="text-warm-600 text-sm">{s.title}</span>
              <span className={`text-sm font-semibold ${s.streak > 0 ? "text-sage-500" : "text-warm-300"}`}>
                {s.streak > 0 ? `${s.streak}일 연속` : "-"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
