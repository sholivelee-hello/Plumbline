"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { filterByRange, type RangeKey } from "@/lib/weight-utils";
import type { WeightEntry, WeightGoal } from "@/types/database";

const RANGES: RangeKey[] = ["all", "1M", "3M", "6M", "1Y"];
const RANGE_LABEL: Record<RangeKey, string> = {
  all: "전체",
  "1M": "1개월",
  "3M": "3개월",
  "6M": "6개월",
  "1Y": "1년",
};

interface Props {
  entries: WeightEntry[];
  goal: WeightGoal | null;
}

export function WeightChart({ entries, goal }: Props) {
  const [range, setRange] = useState<RangeKey>("3M");

  const data = useMemo(() => {
    const filtered = filterByRange(entries, range);
    return [...filtered]
      .sort((a, b) =>
        a.weighed_on !== b.weighed_on
          ? a.weighed_on.localeCompare(b.weighed_on)
          : a.created_at.localeCompare(b.created_at)
      )
      .map((e) => ({
        date: e.weighed_on,
        weight: e.weight_kg,
      }));
  }, [entries, range]);

  const yDomain = useMemo<[number, number] | ["auto", "auto"]>(() => {
    const kgs = data.map((d) => d.weight);
    if (goal) kgs.push(goal.target_kg);
    if (kgs.length === 0) return ["auto", "auto"];
    return [Math.floor(Math.min(...kgs) - 2), Math.ceil(Math.max(...kgs) + 2)];
  }, [data, goal]);

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#262c38] mb-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 min-h-[32px] rounded-lg text-xs font-medium transition-all ${
              range === r
                ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <div className="h-48 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
          기록이 더 쌓이면 그래프가 그려져요
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00");
                  return `${d.getMonth() + 1}월`;
                }}
                tick={{ fontSize: 11 }}
                minTickGap={20}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v: unknown) => [`${Number(v).toFixed(1)} kg`, "체중"]}
                labelFormatter={(l: unknown) => String(l)}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  border: "1px solid rgba(125,125,125,0.2)",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              {goal && (
                <ReferenceLine
                  y={goal.target_kg}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: `목표 ${goal.target_kg}kg`, fontSize: 10, fill: "#94a3b8", position: "right" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
