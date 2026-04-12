"use client";

import { useState } from "react";
import { useBasics } from "@/lib/hooks/use-basics";
import { useSettings } from "@/lib/hooks/use-settings";
import { BasicsList } from "@/components/basics/basics-list";
import { BasicsStats } from "@/components/basics/basics-stats";
import { formatDateKR } from "@/lib/utils/date";
import Link from "next/link";

export default function BasicsPage() {
  const [tab, setTab] = useState<"check" | "stats">("check");
  const { settings } = useSettings();
  const { templates, logs, loading, today, toggleCheck, updateValue } =
    useBasics(settings?.day_start_time);

  if (loading) {
    return <div className="p-6 text-center text-warm-400">로딩 중...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-warm-700">오늘의 베이직</h1>
        <Link
          href="/basics/settings"
          className="text-sm text-warm-400 hover:text-warm-600"
        >
          ⚙️ 설정
        </Link>
      </div>
      <p className="text-sm text-warm-400">{formatDateKR(today)}</p>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("check")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "check" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          체크
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "stats" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          통계
        </button>
      </div>

      {tab === "check" ? (
        <BasicsList
          templates={templates}
          logs={logs}
          onToggle={toggleCheck}
          onUpdateValue={updateValue}
        />
      ) : (
        <BasicsStats />
      )}
    </div>
  );
}
