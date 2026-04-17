import { Skeleton } from "@/components/ui/skeleton";

// ─── Hub Dashboard Skeleton ───────────────────────────────────────────────────
export function HubSkeleton() {
  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-4 space-y-2"
          >
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>

      {/* Donut chart placeholder */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-5 flex flex-col items-center gap-4">
        <Skeleton className="h-4 w-20 self-start" />
        <Skeleton className="w-[160px] h-[160px] rounded-full" />
        <div className="w-full space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* 4 group cards */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-5 space-y-3 overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center justify-between pl-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full ml-2" />
          <div className="flex items-center justify-between pl-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}

      {/* Quick links row */}
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-3 flex flex-col items-center gap-2"
          >
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Group Page Skeleton ───────────────────────────────────────────────────────
export function GroupPageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Summary card */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* 6 item cards */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-2 w-40 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cashbook Skeleton ─────────────────────────────────────────────────────────
export function CashbookSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      {/* Month summary */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-4 flex justify-around">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>

      {/* Date groups with transaction rows */}
      {[0, 1, 2].map((group) => (
        <div key={group} className="space-y-2">
          {/* Date header */}
          <div className="flex items-center gap-2 px-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
          {/* Transaction rows */}
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Budget Skeleton ───────────────────────────────────────────────────────────
export function BudgetSkeleton() {
  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <Skeleton className="h-7 w-24" />

      {/* Income input card */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] p-5 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* 4 group accordion placeholders */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] overflow-hidden"
        >
          {/* Accordion header */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center justify-between p-4 pl-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
          </div>
          {/* Expanded rows (visible for first 2) */}
          {i < 2 && (
            <div className="border-t border-gray-100 dark:border-[#2d3748] p-4 pl-5 space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
              ))}
              <Skeleton className="h-9 w-full rounded-xl mt-1" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
