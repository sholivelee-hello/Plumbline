"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/basics", label: "베이직", icon: "📖" },
  { href: "/schedule", label: "일정", icon: "📅" },
  { href: "/finance", label: "재정", icon: "💰" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-100 px-2 pb-safe z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-4 text-xs transition-colors ${
                isActive ? "text-warm-600" : "text-warm-300"
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
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
