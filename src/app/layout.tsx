import type { Metadata, Viewport } from "next";
import { TabNav } from "@/components/ui/tab-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plumbline",
  description: "나의 하루를 세우는 다림줄",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

// 다크 모드 플래시 방지 스크립트 (hydration 이전 실행)
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('plumbline-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-[#0b0d12] dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <ToastProvider>
            <OfflineBanner />
            <Sidebar />
            <main className="min-h-screen pb-20 lg:pb-0 lg:pl-60">
              {children}
            </main>
            <TabNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
