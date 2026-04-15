"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useEvents } from "@/lib/hooks/use-events";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { formatDateKR } from "@/lib/utils/date";

export function EventsSummary() {
  const { upcoming, loading } = useEvents();

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <Link href="/schedule" className="block h-full">
      <Card className="h-full min-h-[220px] flex flex-col hover:shadow-card-hover transition-shadow">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          다가오는 이벤트
        </h2>
        {upcoming.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <Calendar
              size={28}
              className="text-gray-200 dark:text-gray-600 mb-2"
              strokeWidth={1.5}
            />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              예정된 이벤트가 없어요
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              일정 페이지에서 추가해 보세요
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 flex-1">
            {upcoming.slice(0, 5).map((event) => (
              <li key={event.id} className="flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: event.color }}
                  aria-hidden
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 w-20 shrink-0">
                  {formatDateKR(event.start_date)}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {event.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Link>
  );
}
