"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useBasicsCategoryTrend } from "@/lib/hooks/use-basics-category-trend";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";

export function CategoryBalanceTrend() {
  const { points, hasSpiritual, hasPhysical, loading } =
    useBasicsCategoryTrend(30);

  if (loading) return <SkeletonCard />;
  if (!hasSpiritual && !hasPhysical) return null;

  const validCount = points.filter(
    (p) => p.spiritualRate !== null || p.physicalRate !== null,
  ).length;

  if (validCount < 2) {
    return (
      <Card>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          30일 카테고리 균형
        </p>
        <p className="text-sm text-gray-400 text-center py-6">
          데이터가 쌓이면 추세를 보여드릴게요
        </p>
      </Card>
    );
  }

  const chartData = points.map((p) => ({
    date: p.date.slice(5),
    영적: p.spiritualRate === null ? null : Math.round(p.spiritualRate),
    신체: p.physicalRate === null ? null : Math.round(p.physicalRate),
  }));

  return (
    <Card>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
        30일 카테고리 균형
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, bottom: 5, left: -16 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              formatter={(v) => (typeof v === "number" ? `${v}%` : v)}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {hasSpiritual && (
              <Line
                type="monotone"
                dataKey="영적"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
            {hasPhysical && (
              <Line
                type="monotone"
                dataKey="신체"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
