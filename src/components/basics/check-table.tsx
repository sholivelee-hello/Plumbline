"use client";

import { WeeklyItemStat } from "@/lib/hooks/use-weekly-stats";

interface CheckTableProps {
  items: WeeklyItemStat[];
  weekDates: string[];
  today: string;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function CheckTable({ items, weekDates, today }: CheckTableProps) {
  const checkItems = items.filter((i) => i.template.type === "check");
  if (checkItems.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">체크 항목 달성 현황</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 dark:text-gray-500">
              <th className="text-left py-2 pr-3 font-medium min-w-[80px]">항목</th>
              {DAY_LABELS.map((day) => (
                <th key={day} className="text-center py-2 px-1 font-medium w-8">{day}</th>
              ))}
              <th className="text-right py-2 pl-3 font-medium">달성률</th>
            </tr>
          </thead>
          <tbody>
            {checkItems.map((item) => {
              const createdDate = item.template.created_at.slice(0, 10);
              return (
                <tr key={item.template.id} className={`border-t border-[var(--border)] ${!item.template.is_active ? "opacity-40" : ""}`}>
                  <td className="py-2.5 pr-3 text-gray-700 dark:text-gray-200">{item.template.title}</td>
                  {weekDates.map((date) => {
                    const isFuture = date > today;
                    const notYetCreated = date < createdDate;
                    const log = item.dailyLogs[date];
                    let cell = "";
                    if (isFuture) cell = "";
                    else if (notYetCreated) cell = "-";
                    else if (log?.completed) cell = "●";
                    else cell = "○";
                    return (
                      <td key={date} className={`text-center py-2.5 px-1 ${cell === "●" ? "text-primary-500 font-bold" : "text-gray-300 dark:text-gray-600"}`}>{cell}</td>
                    );
                  })}
                  <td className="text-right py-2.5 pl-3 font-medium text-gray-600 dark:text-gray-300">{Math.round(item.achievementRate)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
