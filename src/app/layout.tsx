import type { Metadata, Viewport } from "next";
import { TabNav } from "@/components/ui/tab-nav";
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
  themeColor: "#fefcf8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-cream-50 text-warm-700 antialiased">
        <main className="max-w-lg mx-auto pb-20 min-h-screen">
          {children}
        </main>
        <TabNav />
      </body>
    </html>
  );
}
