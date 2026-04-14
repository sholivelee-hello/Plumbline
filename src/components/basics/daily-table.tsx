"use client";

import { Fragment } from "react";
import { MonthlyItemStat } from "@/lib/hooks/use-monthly-stats";
import { isNumericAchieved } from "@/lib/utils/stats";

interface DailyTableProps {
  items: MonthlyItemStat[];
  monthDates: string[];
  today: string;
}

export function DailyTable({ items, monthDates, today }: DailyTableProps) {
  const spiritualItems = items.filter((s) => s.template.category === "spiritual");
  const physicalItems = items.filter((s) => s.template.category === "physical");

  const renderCell = (stat: MonthlyItemStat, date: string) => {
    const { template, dailyLogs } = stat;

    // Future date: blank
    if (date > today) {
      return <span className="text-gray-300 dark:text-gray-600">·</span>;
    }

    // Before created_at or after deactivated_at: "-"
    const createdDate = template.created_at.slice(0, 10);
    const deactivatedDate = template.deactivated_at
      ? template.deactivated_at.slice(0, 10)
      : null;
    if (date < createdDate || (deactivatedDate && date > deactivatedDate)) {
      return <span className="text-gray-300 dark:text-gray-600">-</span>;
    }

    const log = dailyLogs[date];

    if (template.type === "check") {
      const achieved = log?.completed ?? false;
      return achieved ? (
        <span className="text-primary-500 font-bold">●</span>
      ) : (
        <span className="text-gray-300 dark:text-gray-600">○</span>
      );
    } else {
      // number type
      const value = log?.value ?? null;
      if (value === null) {
        return <span className="text-gray-300 dark:text-gray-600">-</span>;
      }
      const achieved = isNumericAchieved(value, template.target_value);
      return (
        <span className={achieved ? "text-primary-500 font-medium" : "text-red-400"}>
          {value}
        </span>
      );
    }
  };

  const renderRows = (groupItems: MonthlyItemStat[], label: string) => {
    if (groupItems.length === 0) return null;
    return (
      <>
        {/* Category header row */}
        <tr>
          <td
            colSpan={monthDates.length + 2}
            className="sticky left-0 bg-[var(--surface)] z-10 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-[var(--border)]"
          >
            {label}
          </td>
        </tr>
        {groupItems.map((stat) => (
          <Fragment key={stat.template.id}>
            <tr
              className={`border-b border-[var(--border)] last:border-0 ${
                !stat.template.is_active ? "opacity-40" : ""
              }`}
            >
              {/* Item name - sticky left */}
              <td className="sticky left-0 bg-[var(--surface)] z-10 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap min-w-[100px] max-w-[140px] truncate border-r border-[var(--border)]">
                {stat.template.title}
              </td>
              {/* Day cells */}
              {monthDates.map((date) => (
                <td key={date} className="px-1 py-2 text-center text-xs whitespace-nowrap min-w-[24px]">
                  {renderCell(stat, date)}
                </td>
              ))}
              {/* Achievement % - sticky right */}
              <td className="sticky right-0 bg-[var(--surface)] z-10 px-3 py-2 text-sm font-medium text-right whitespace-nowrap border-l border-[var(--border)]">
                <span
                  className={
                    stat.achievementRate >= 80
                      ? "text-primary-500"
                      : stat.achievementRate >= 50
                      ? "text-yellow-500"
                      : "text-red-400"
                  }
                >
                  {Math.round(stat.achievementRate)}%
                </span>
              </td>
            </tr>
          </Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">일별 현황</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {/* Header: item name */}
              <th className="sticky left-0 bg-[var(--surface)] z-10 px-3 py-2 text-left text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap border-r border-[var(--border)]">
                항목
              </th>
              {/* Header: day numbers */}
              {monthDates.map((date) => {
                const day = parseInt(date.slice(8), 10);
                const isToday = date === today;
                return (
                  <th
                    key={date}
                    className={`px-1 py-2 text-center text-xs font-medium whitespace-nowrap min-w-[24px] ${
                      isToday
                        ? "text-primary-500 font-bold"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
              {/* Header: achievement % */}
              <th className="sticky right-0 bg-[var(--surface)] z-10 px-3 py-2 text-right text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap border-l border-[var(--border)]">
                달성률
              </th>
            </tr>
          </thead>
          <tbody>
            {renderRows(spiritualItems, "영적")}
            {renderRows(physicalItems, "신체적")}
          </tbody>
        </table>
      </div>
    </div>
  );
}
