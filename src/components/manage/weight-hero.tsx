"use client";

import type { Stats } from "@/lib/weight-utils";
import type { WeightGoal } from "@/types/database";

interface Props {
  stats: Stats;
  goal: WeightGoal | null;
  onOpenGoal?: () => void;
}

function formatKg(n: number | null): string {
  return n == null ? "—" : `${n.toFixed(1)}`;
}

export function WeightHero({ stats, goal, onOpenGoal }: Props) {
  const { currentKg, startKg, remainKg, daysLeft, weeklyPace } = stats;
  const hasCurrent = currentKg != null;

  const deadlinePassed = daysLeft != null && daysLeft <= 0 && remainKg != null && remainKg > 0;
  const achieved = remainKg != null && remainKg <= 0;

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        현재 체중
      </p>
      <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {hasCurrent ? `${formatKg(currentKg)} kg` : "—"}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <MetricCell label="목표" value={goal ? `${formatKg(goal.target_kg)} kg` : null} onClick={!goal ? onOpenGoal : undefined} />
        <MetricCell
          label="차이"
          value={remainKg == null ? "—" : `${remainKg > 0 ? "-" : "+"}${Math.abs(remainKg).toFixed(1)} kg`}
          colorClass={
            remainKg == null
              ? ""
              : remainKg > 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-500 dark:text-red-400"
          }
        />
        <MetricCell label="시작" value={startKg != null ? `${formatKg(startKg)} kg` : "—"} />
      </div>

      {goal && hasCurrent && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {achieved ? (
            <span className="text-emerald-600 dark:text-emerald-400">🎉 목표 달성! {Math.abs(remainKg!).toFixed(1)}kg 초과 감량 · 유지중</span>
          ) : deadlinePassed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">🕐 데드라인 지남 · 목표 재설정 필요</span>
          ) : (
            <>🎯 {goal.deadline}까지 {daysLeft}일 남음 · 주 {weeklyPace?.toFixed(2)}kg 필요</>
          )}
        </p>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  colorClass = "",
  onClick,
}: {
  label: string;
  value: string | null;
  colorClass?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${colorClass || "text-gray-900 dark:text-gray-100"}`}>
        {value ?? "목표 설정"}
      </p>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="text-left rounded-xl bg-gray-50 dark:bg-[#262c38] px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors">
      {content}
    </button>
  ) : (
    <div className="rounded-xl bg-gray-50 dark:bg-[#262c38] px-3 py-2">{content}</div>
  );
}
