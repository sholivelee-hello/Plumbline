import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  rightAction?: ReactNode;
  subtitle?: string;
  /** Max-width class for the inner content. Defaults to `max-w-4xl`. Pass empty string to disable. */
  contentMaxWidth?: string;
}

export function PageHeader({
  title,
  backHref,
  rightAction,
  subtitle,
  contentMaxWidth = "max-w-4xl",
}: PageHeaderProps) {
  return (
    <div className="bg-[var(--surface)] border-b border-[var(--border)] transition-colors">
      <div className={`${contentMaxWidth} mx-auto px-4 lg:px-8 py-4 flex items-center gap-3`}>
        {backHref && (
          <Link
            href={backHref}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={20} />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightAction}
      </div>
    </div>
  );
}
