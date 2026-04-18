"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface Toast {
  id: number;
  message: string;
  tone?: "success" | "info" | "error";
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISPLAY_MS = 1800;
const EXIT_MS = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);

    // Start exit animation after DISPLAY_MS
    const exitTimer = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Remove from DOM after exit animation completes
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, EXIT_MS);
      timersRef.current.set(id + 0.5, removeTimer);
    }, DISPLAY_MS);
    timersRef.current.set(id, exitTimer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

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
            role={t.tone === "error" ? "alert" : undefined}
            className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-card transition-all duration-300 ${
              t.exiting
                ? "opacity-0 translate-y-[-8px]"
                : "animate-slide-up-fade"
            } ${
              t.tone === "success"
                ? "bg-green-500 text-white"
                : t.tone === "error"
                  ? "bg-red-500 text-white"
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
