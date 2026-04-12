"use client";

import { useBasics } from "@/lib/hooks/use-basics";
import { useSettings } from "@/lib/hooks/use-settings";
import { BasicsList } from "@/components/basics/basics-list";
import { formatDateKR } from "@/lib/utils/date";
import Link from "next/link";

export default function BasicsPage() {
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

      <BasicsList
        templates={templates}
        logs={logs}
        onToggle={toggleCheck}
        onUpdateValue={updateValue}
      />
    </div>
  );
}
