"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  tone?: "success" | "info";
}

interface ToastContextValue {
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 2200)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 lg:top-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-slide-up-fade rounded-full px-4 py-2 text-sm font-medium shadow-card ${
              t.tone === "success"
                ? "bg-surplus-500 text-white"
                : "bg-[#161a22] dark:bg-gray-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Gracefully no-op when provider missing (SSR, isolated tests)
    return { toast: () => {} };
  }
  return ctx;
}

export function vibrate(pattern: number | number[] = 18) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }
}
