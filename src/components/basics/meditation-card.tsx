"use client";

import Link from "next/link";
import { useMeditation } from "@/lib/hooks/use-meditation";
import { useSettings } from "@/lib/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { useToast, vibrate } from "@/components/ui/toast";
import { formatDateKR } from "@/lib/utils/date";

const ENCOURAGE = [
  "오늘의 묵상 완료",
  "한 절씩 채워가요",
  "꾸준한 묵상이 멋져요",
  "마음에 한 줄을 새겼어요",
  "오늘도 한 편을 마쳤어요",
  "잠잠히 오늘을 살아가요",
  "한 걸음 더 가까이",
  "고요한 시간 잘했어요",
  "말씀이 곁에 있어요",
  "오늘도 잘 머물렀어요",
];

export function MeditationCard() {
  const { loading, hasStartDate, isFuture, psalm, cycle, completed, toggle } =
    useMeditation();
  const { settings } = useSettings();
  const { toast } = useToast();
  const startDate = settings?.meditation_start_date ?? null;

  if (loading) {
    return (
      <Card>
        <div className="h-16 animate-pulse bg-gray-100 dark:bg-[#1f242e] rounded-lg" />
      </Card>
    );
  }

  if (!hasStartDate) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
              ✨ 묵상
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
              시편 150편을 매일 1편씩 묵상해요. 시작일을 정하면 오늘의 본문이 표시돼요.
            </p>
            <Link
              href="/basics/settings"
              className="inline-block text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              시작일 설정하기 →
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  if (isFuture) {
    return (
      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
          ✨ 묵상
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {startDate ? formatDateKR(startDate) : "시작일"}부터 시작돼요.
        </p>
        <Link
          href="/basics/settings"
          className="inline-block text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          시작일 수정 →
        </Link>
      </Card>
    );
  }

  async function handleToggle() {
    const wasCompleted = completed;
    await toggle();
    if (!wasCompleted) {
      vibrate(18);
      toast(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">
          ✨ 묵상
        </h3>
        {cycle && cycle > 1 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {cycle}회독
          </span>
        )}
      </div>
      <div
        onClick={handleToggle}
        role="button"
        aria-pressed={completed}
        aria-label={`시편 ${psalm}편 묵상${completed ? " 완료" : ""}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors tap-press min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
          completed
            ? "bg-primary-50 dark:bg-[#2a2e45]"
            : "bg-gray-50 dark:bg-[#1f242e] hover:bg-gray-100 dark:hover:bg-[#262c38]"
        }`}
      >
        <Toggle
          checked={completed}
          onChange={handleToggle}
          size="md"
          ariaLabel={`시편 ${psalm}편 묵상 완료`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
            오늘의 본문
          </div>
          <div
            className={`font-medium ${
              completed
                ? "text-gray-400 dark:text-gray-500 line-through"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            시편 {psalm}편
          </div>
        </div>
      </div>
    </Card>
  );
}
