"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";
import { useBasics } from "@/lib/hooks/use-basics";
import { useMeditation } from "@/lib/hooks/use-meditation";
import { useBibleReading } from "@/lib/hooks/use-bible-reading";
import { BasicsList } from "@/components/basics/basics-list";
import { BasicsStats } from "@/components/basics/basics-stats";
import { StatsView } from "@/components/basics/stats-view";
import { CelebrateOverlay } from "@/components/ui/celebrate-overlay";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast, vibrate } from "@/components/ui/toast";
import { formatDateKR } from "@/lib/utils/date";

export default function BasicsPage() {
  const [tab, setTab] = useState<"check" | "stats">("check");
  const { templates, logs, loading, today, toggleCheck, updateValue } =
    useBasics();
  const { toast } = useToast();

  const meditation = useMeditation();
  const reading = useBibleReading();

  const [celebrateTick, setCelebrateTick] = useState(0);
  const prevAllDone = useRef(false);
  const didInit = useRef(false);

  const meditationActive = meditation.hasStartDate && !meditation.isFuture;
  const readingActive = reading.hasStartDate && !reading.isFuture;
  const meditationDone = meditationActive && meditation.completed;
  const readingDone =
    readingActive && reading.total > 0 && reading.checkedCount === reading.total;

  const baseCompleted = logs.filter((l) => l.completed).length;
  const extraTotal = (meditationActive ? 1 : 0) + (readingActive ? 1 : 0);
  const extraDone = (meditationDone ? 1 : 0) + (readingDone ? 1 : 0);
  const completedCount = baseCompleted + extraDone;
  const totalCount = templates.length + extraTotal;
  const allDone = totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    if (!didInit.current) {
      prevAllDone.current = allDone;
      didInit.current = true;
      return;
    }
    if (allDone && !prevAllDone.current) {
      setCelebrateTick((t) => t + 1);
      vibrate([20, 60, 20]);
      toast("오늘의 베이직을 모두 완료했어요! 🎉");
    }
    prevAllDone.current = allDone;
  }, [allDone, toast]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          오늘의 베이직
        </h1>
        <Link
          href="/basics/settings"
          className="text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="베이직 설정"
        >
          <SettingsIcon size={20} />
        </Link>
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        {formatDateKR(today)}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("check")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors tap-press ${
            tab === "check"
              ? "bg-primary-500 text-white"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          체크
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors tap-press ${
            tab === "stats"
              ? "bg-primary-500 text-white"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          통계
        </button>
      </div>

      {tab === "check" ? (
        <>
          <BasicsList
            templates={templates}
            logs={logs}
            meditation={meditation}
            reading={reading}
            onToggle={toggleCheck}
            onUpdateValue={updateValue}
          />
          <div className="mt-4">
            <BasicsStats />
          </div>
        </>
      ) : (
        <StatsView />
      )}

      <CelebrateOverlay trigger={celebrateTick} />
    </div>
  );
}
