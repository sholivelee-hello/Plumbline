"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { WeekComparison } from "@/lib/hooks/use-monthly-stats";

interface WeeklyComparisonProps { data: WeekComparison[]; }

export function WeeklyComparison({ data }: WeeklyComparisonProps) {
  if (data.length === 0) return null;

  const chartData = data.map((w) => ({
    name: w.label,
    영적: Math.round(w.spiritualRate),
    신체적: Math.round(w.physicalRate),
  }));

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">주차별 비교</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "13px" }} formatter={(value) => typeof value === "number" ? `${value}%` : value} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="영적" fill="var(--primary-light)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="신체적" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
