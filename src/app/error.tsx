"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#161a22] px-6 text-center">
      <div className="mb-6 w-16 h-16 rounded-2xl bg-primary-50 dark:bg-[#2a2e45] flex items-center justify-center">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        문제가 발생했어요
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
        예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="w-full py-3 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
