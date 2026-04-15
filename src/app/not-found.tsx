import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#161a22] px-6 text-center">
      <div className="mb-6 w-16 h-16 rounded-2xl bg-primary-50 dark:bg-[#2a2e45] flex items-center justify-center">
        <span className="text-3xl">🔍</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        페이지를 찾을 수 없어요
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="px-8 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
