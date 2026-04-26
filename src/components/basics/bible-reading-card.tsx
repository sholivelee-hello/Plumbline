"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { UseBibleReadingReturn } from "@/lib/hooks/use-bible-reading";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ProgressBar } from "@/components/ui/progress-bar";
import { vibrate, useToast } from "@/components/ui/toast";
import { formatDateKR } from "@/lib/utils/date";

interface BibleReadingCardProps {
  reading: UseBibleReadingReturn;
  embedded?: boolean;
}

function Wrapper({ embedded, children }: { embedded?: boolean; children: React.ReactNode }) {
  return embedded ? <div className="space-y-2">{children}</div> : <Card>{children}</Card>;
}

export function BibleReadingCard({ reading, embedded = false }: BibleReadingCardProps) {
  const {
    loading,
    hasStartDate,
    isFuture,
    day,
    cycle,
    chapters,
    checkedSet,
    total,
    checkedCount,
    percent,
    toggleChapter,
    startDate,
  } = reading;
  const [userToggled, setUserToggled] = useState(false);
  const [collapsedOverride, setCollapsedOverride] = useState(false);
  const allDone = total > 0 && checkedCount === total;
  const defaultCollapsed = total > 8 && allDone;
  const collapsed = userToggled ? collapsedOverride : defaultCollapsed;
  const { toast } = useToast();

  if (loading) {
    return (
      <Wrapper embedded={embedded}>
        <div className="h-24 animate-pulse bg-gray-100 dark:bg-[#1f242e] rounded-lg" />
      </Wrapper>
    );
  }

  if (!hasStartDate) {
    return (
      <Wrapper embedded={embedded}>
        {!embedded && (
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            📖 통독
          </h3>
        )}
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
          100일 1독 통독표를 매일 한 묶음씩 읽어요. 시작일을 정하면 오늘의 범위가 표시돼요.
        </p>
        <Link
          href="/basics/settings"
          className="inline-block text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          시작일 설정하기 →
        </Link>
      </Wrapper>
    );
  }

  if (isFuture) {
    return (
      <Wrapper embedded={embedded}>
        {!embedded && (
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            📖 통독
          </h3>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {startDate ? formatDateKR(startDate) : "시작일"}부터 시작돼요.
        </p>
        <Link
          href="/basics/settings"
          className="inline-block text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          시작일 수정 →
        </Link>
      </Wrapper>
    );
  }

  function toggleCollapse() {
    setUserToggled(true);
    setCollapsedOverride((c) => (userToggled ? !c : !defaultCollapsed));
  }

  async function handleToggle(
    ord: number,
    label: string,
    currentlyChecked: boolean,
  ) {
    const newCount = await toggleChapter(ord, label);
    if (newCount === null) return;
    if (!currentlyChecked) {
      vibrate(14);
      if (newCount === total && total > 0) {
        vibrate([20, 60, 20]);
        toast("오늘 통독을 모두 마쳤어요! 🎉");
      }
    }
  }

  return (
    <Wrapper embedded={embedded}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
          📖 통독
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          <span>{day}일차</span>
          {cycle && cycle > 1 && (
            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#262c38] text-gray-600 dark:text-gray-300">
              {cycle}회독
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {checkedCount}/{total}장
          </span>
          <span
            className={`text-xs font-semibold tabular-nums ${
              allDone
                ? "text-primary-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {percent}%
          </span>
        </div>
        <ProgressBar
          percent={percent}
          color={allDone ? "bg-primary-500" : "bg-amber-400 dark:bg-amber-500"}
        />
      </div>

      <button
        onClick={toggleCollapse}
        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2 min-h-[28px]"
        aria-label={collapsed ? "장 목록 펼치기" : "장 목록 접기"}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <>
            <ChevronDown size={14} />
            장 목록 펼치기 ({total - checkedCount}장 남음)
          </>
        ) : (
          <>
            <ChevronUp size={14} />
            장 목록 접기
          </>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1.5">
          {chapters.map((ch) => {
            const checked = checkedSet.has(ch.ord);
            return (
              <div
                key={ch.ord}
                onClick={() => handleToggle(ch.ord, ch.label, checked)}
                role="button"
                aria-pressed={checked}
                aria-label={`${ch.label}${checked ? " 완독" : ""}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(ch.ord, ch.label, checked);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors tap-press min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                  checked
                    ? "bg-primary-50 dark:bg-[#2a2e45]"
                    : "bg-gray-50 dark:bg-[#1f242e] hover:bg-gray-100 dark:hover:bg-[#262c38]"
                }`}
              >
                <Toggle
                  checked={checked}
                  onChange={() => handleToggle(ch.ord, ch.label, checked)}
                  size="sm"
                  ariaLabel={`${ch.label} 완독`}
                />
                <span
                  className={`text-sm ${
                    checked
                      ? "text-gray-400 dark:text-gray-500 line-through"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {ch.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Wrapper>
  );
}
