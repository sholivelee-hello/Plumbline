"use client";

import { useEffect, useId, useRef, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  role?: "dialog" | "alertdialog";
  ariaDescribedBy?: string;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, role: roleProp = "dialog", ariaDescribedBy }: ModalProps) {
  const autoId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [vpHeight, setVpHeight] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Allow DOM to paint before triggering transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "";
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // 키보드가 올라오면 모달이 가려지지 않도록 visualViewport로 오프셋 계산
  useEffect(() => {
    if (!isOpen) {
      setKeyboardOffset(0);
      setVpHeight(null);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    function onViewportChange() {
      const offset = window.innerHeight - vv!.height - vv!.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
      setVpHeight(vv!.height);
    }
    onViewportChange();
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    return () => {
      vv.removeEventListener("resize", onViewportChange);
      vv.removeEventListener("scroll", onViewportChange);
    };
  }, [isOpen]);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const firstFocusable = dialogRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    firstFocusable?.focus();
  }, [isOpen, isMounted]);

  // Keyboard: Escape to close + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
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

  if (!isMounted) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{
        paddingBottom: keyboardOffset,
        transition: "padding-bottom 0.25s ease-out",
      }}
    >
      <div
        className="absolute inset-0 bg-black transition-opacity duration-200 ease-in-out"
        style={{ opacity: isVisible ? 0.4 : 0 }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role={roleProp}
        aria-modal="true"
        aria-labelledby={title ? `${autoId}-title` : undefined}
        aria-describedby={ariaDescribedBy}
        className="relative bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-y-auto p-6 transition-transform duration-300 ease-out text-gray-900 dark:text-gray-100"
        style={{
          transform: isVisible ? "translateY(0)" : "translateY(100%)",
          maxHeight: vpHeight ? vpHeight * 0.92 : "85vh",
        }}
      >
        {title && (
          <h3 id={`${autoId}-title`} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
