"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { WeeklyItemStat } from "@/lib/hooks/use-weekly-stats";

interface CategoryLineChartProps {
  title: string;
  items: WeeklyItemStat[];
  weekDates: string[];
  today: string;
}

const COLORS = ["var(--primary)", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export function CategoryLineChart({ title, items, weekDates, today }: CategoryLineChartProps) {
  const numericItems = items.filter((i) => i.template.type === "number");
  if (numericItems.length === 0) return null;

  // Need at least 2 days of data for a meaningful line chart
  const datesWithData = weekDates.filter((date) => {
    if (date > today) return false;
    return numericItems.some((item) => item.dailyLogs[date]?.value !== null && item.dailyLogs[date]?.value !== undefined);
  });
  if (datesWithData.length < 2) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{title} 수치 추세</p>
        <p className="text-sm text-gray-400 text-center py-6">데이터가 쌓이면 추세를 보여드릴게요</p>
      </div>
    );
  }

  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];
  const chartData = weekDates.map((date, idx) => {
    const point: Record<string, string | number | null> = { name: dayLabels[idx], date };
    if (date > today) {
      numericItems.forEach((item) => { point[item.template.title] = null; });
    } else {
      numericItems.forEach((item) => {
        const log = item.dailyLogs[date];
        point[item.template.title] = log?.value ?? null;
      });
    }
    return point;
  });

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{title} 수치 추세</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "13px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {numericItems.map((item, idx) => (
              <Line key={item.template.id} type="monotone" dataKey={item.template.title} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            ))}
            {numericItems.filter((i) => i.template.target_value).map((item, idx) => (
              <ReferenceLine key={`goal-${item.template.id}`} y={item.template.target_value!} stroke={COLORS[idx % COLORS.length]} strokeDasharray="5 5" strokeOpacity={0.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
