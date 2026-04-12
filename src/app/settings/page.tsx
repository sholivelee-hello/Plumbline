"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/hooks/use-settings";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { ScheduleTimeUnit } from "@/types/database";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

const TIME_UNITS: { label: string; value: ScheduleTimeUnit }[] = [
  { label: "10분", value: 10 },
  { label: "15분", value: 15 },
  { label: "30분", value: 30 },
  { label: "1시간", value: 60 },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, update, loading } = useSettings();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !settings) {
    return (
      <div className="p-4">
        <p className="text-warm-400 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="text-warm-500 hover:text-warm-700 text-sm">
          ← 돌아가기
        </Link>
      </div>
      <h1 className="text-xl font-bold text-warm-700">설정</h1>

      {/* 하루 시작 시간 */}
      <Card>
        <label className="block text-sm font-medium text-warm-600 mb-2">
          하루 시작 시간
        </label>
        <select
          className="w-full border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300"
          value={settings.day_start_time}
          onChange={(e) => update({ day_start_time: e.target.value })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </Card>

      {/* 하루 종료 시간 */}
      <Card>
        <label className="block text-sm font-medium text-warm-600 mb-2">
          하루 종료 시간
        </label>
        <select
          className="w-full border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300"
          value={settings.day_end_time}
          onChange={(e) => update({ day_end_time: e.target.value })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </Card>

      {/* 시간 단위 */}
      <Card>
        <p className="text-sm font-medium text-warm-600 mb-2">시간 단위</p>
        <div className="flex gap-2">
          {TIME_UNITS.map(({ label, value }) => (
            <button
              key={value}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                settings.time_unit === value
                  ? "bg-sage-300 text-white border-sage-300"
                  : "bg-cream-50 text-warm-600 border-warm-200 hover:bg-cream-100"
              }`}
              onClick={() => update({ time_unit: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <button
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
          onClick={handleSignOut}
        >
          로그아웃
        </button>
      </Card>
    </div>
  );
}
