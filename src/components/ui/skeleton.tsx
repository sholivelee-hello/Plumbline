interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-lg animate-pulse bg-gray-200 dark:bg-[#262c38] ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card shadow-card p-5">
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-5/6 mb-2" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  );
}
