"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Wallet, Scale } from "lucide-react";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/basics", label: "베이직", icon: BookOpen },
  { href: "/finance", label: "재정", icon: Wallet },
  { href: "/manage", label: "관리", icon: Scale },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-[var(--border)] bg-[var(--surface)] min-h-screen fixed left-0 top-0 z-40 transition-colors">
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-300">Plumbline</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">나의 하루를 세우는 다림줄</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-50 dark:bg-[#2a2e45] text-primary-700 dark:text-primary-200"
                  : "text-gray-500 dark:text-gray-400 hover:bg-[var(--surface-muted)] hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
