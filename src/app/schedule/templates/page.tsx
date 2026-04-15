"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { useTemplates } from "@/lib/hooks/use-templates";

export default function TemplatesPage() {
  const { templates, loading, createTemplate, deleteTemplate } = useTemplates();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const id = await createTemplate(newName.trim());
    setCreating(false);
    setNewName("");
    if (id) {
      window.location.href = `/schedule/templates/${id}`;
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/schedule" aria-label="일정으로 돌아가기"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">주간 템플릿</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="새 템플릿 이름 (예: 평일 루틴)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          <Plus size={16} className="inline mr-1" />생성
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          아직 템플릿이 없어요.<br />위 입력창에 이름을 넣어 만들어보세요.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id}
              className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <Link href={`/schedule/templates/${t.id}`}
                className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-primary-500">
                {t.name}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`"${t.name}" 템플릿을 삭제할까요?`)) deleteTemplate(t.id);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]"
                aria-label="템플릿 삭제">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
