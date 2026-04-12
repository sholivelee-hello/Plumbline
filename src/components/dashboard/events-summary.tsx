"use client";

import Link from "next/link";
import { useEvents } from "@/lib/hooks/use-events";
import { Card } from "@/components/ui/card";

export function EventsSummary() {
  const { upcoming, loading } = useEvents();

  if (loading) {
    return (
      <Card>
        <p className="text-warm-400 text-sm">불러오는 중...</p>
      </Card>
    );
  }

  return (
    <Link href="/schedule">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <h2 className="text-base font-semibold text-warm-700 mb-2">다가오는 이벤트</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-warm-400">예정된 이벤트가 없습니다</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((event) => (
              <li key={event.id} className="flex items-center gap-3">
                <span className="text-xs text-warm-400 w-20 shrink-0">
                  {event.start_date}
                </span>
                <span className="text-sm text-warm-700 truncate">{event.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Link>
  );
}
