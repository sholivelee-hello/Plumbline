"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DonutSegment {
  groupId: string;
  title: string;
  amount: number;
  color: string;
}

interface FinanceDonutChartProps {
  data: DonutSegment[];
  total?: number;
  size?: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000);
    const remainder = amount % 10000;
    if (remainder === 0) return `${man.toLocaleString()}만`;
    return `${man.toLocaleString()}만 ${remainder.toLocaleString()}`;
  }
  return amount.toLocaleString();
}

const EMPTY_COLOR = "#e5e7eb";

export function FinanceDonutChart({ data, total, size = 200 }: FinanceDonutChartProps) {
  const hasData = data.some((d) => d.amount > 0);
  const chartData = hasData ? data.filter((d) => d.amount > 0) : [{ groupId: "__empty__", title: "지출 없음", amount: 1, color: EMPTY_COLOR }];
  const displayTotal = total ?? data.reduce((sum, d) => sum + d.amount, 0);
  const isEmpty = !hasData;

  const innerRadius = "58%";
  const outerRadius = "82%";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chart with center overlay */}
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={true}
            >
              {chartData.map((entry) => (
                <Cell key={entry.groupId} fill={entry.color} />
              ))}
            </Pie>
            {!isEmpty && (
              <Tooltip
                formatter={(value, _name, props) => [
                  `${Number(value).toLocaleString()}원`,
                  (props.payload as DonutSegment | undefined)?.title ?? "",
                ]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  fontSize: "0.8125rem",
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {isEmpty ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">지출 없음</span>
          ) : (
            <>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {formatCurrency(displayTotal)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">원 지출</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      {hasData && (
        <div className="w-full space-y-1.5">
          {data.filter((d) => d.amount > 0).map((item) => (
            <div key={item.groupId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600 dark:text-gray-400 truncate">{item.title}</span>
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-medium ml-3 shrink-0">
                {item.amount.toLocaleString()}원
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
