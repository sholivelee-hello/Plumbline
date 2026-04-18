"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [vpHeight, setVpHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) { setKeyboardOffset(0); setVpHeight(null); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    function onViewportChange() {
      const offset = window.innerHeight - vv!.height - vv!.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
      setVpHeight(vv!.height);
    }
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    return () => {
      vv.removeEventListener("resize", onViewportChange);
      vv.removeEventListener("scroll", onViewportChange);
    };
  }, [isOpen]);

  // Save trigger element and manage scroll lock
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // Focus first focusable element inside sheet
      requestAnimationFrame(() => {
        const first = sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
        first?.focus();
      });
    } else {
      document.body.style.overflow = "";
      // Return focus to trigger
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = Array.from(
          sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black transition-opacity duration-300 ${
          isOpen ? "opacity-40 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          bottom: keyboardOffset,
          maxHeight: vpHeight ? vpHeight * 0.92 : undefined,
          transition: "transform 0.3s ease-out, bottom 0.25s ease-out, max-height 0.25s ease-out",
        }}
        className={`fixed left-0 right-0 z-[60] bg-white dark:bg-[#1a2030]
          rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto
          ${isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
      >
        {/* Sticky header: drag handle + title + close */}
        <div className="sticky top-0 bg-white dark:bg-[#1a2030] z-10 pt-3 px-5 pb-3 border-b border-gray-100 dark:border-[#2d3748]">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
          <div className="flex items-center justify-between">
            {title ? (
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors"
              aria-label="닫기"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M14 4L4 14M4 4l10 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 pb-10">
          {children}
        </div>
      </div>
    </>
  );
}
