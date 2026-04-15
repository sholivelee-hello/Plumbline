"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Wallet } from "lucide-react";

const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/basics", label: "베이직", icon: BookOpen },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/finance", label: "재정", icon: Wallet },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-2 pb-safe z-50 lg:hidden transition-colors">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2.5 px-4 min-h-[44px] text-xs transition-colors ${
                isActive
                  ? "text-primary-600 dark:text-primary-300"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} className="mb-0.5" />
              <span className={isActive ? "font-semibold" : ""}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
