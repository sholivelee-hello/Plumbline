"use client";

import { BasicsSummary } from "@/components/dashboard/basics-summary";
import { EventsSummary } from "@/components/dashboard/events-summary";
import { FinanceSummary } from "@/components/dashboard/finance-summary";
import { useSettings } from "@/lib/hooks/use-settings";
import { getLogicalDate, formatDateKR } from "@/lib/utils/date";
import Link from "next/link";

export default function DashboardPage() {
  const { settings } = useSettings();
  const today = getLogicalDate(settings?.day_start_time);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Plumbline</h1>
          <p className="text-sm text-warm-400">{formatDateKR(today)}</p>
        </div>
        <Link href="/settings" className="text-warm-400 hover:text-warm-600 text-xl">
          ⚙️
        </Link>
      </div>
      <BasicsSummary dayStartTime={settings?.day_start_time} />
      <EventsSummary />
      <FinanceSummary />
    </div>
  );
}
