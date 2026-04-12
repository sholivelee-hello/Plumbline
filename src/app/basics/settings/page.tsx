"use client";

import { useState } from "react";
import { useBasics } from "@/lib/hooks/use-basics";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { TemplateForm } from "@/components/basics/template-form";
import Link from "next/link";

export default function BasicsSettingsPage() {
  const { templates, addTemplate, deactivateTemplate } = useBasics();
  const [showForm, setShowForm] = useState(false);

  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/basics" className="text-warm-400 hover:text-warm-600">
          ← 돌아가기
        </Link>
        <h1 className="text-lg font-bold text-warm-700">베이직 설정</h1>
        <div className="w-16" />
      </div>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">📖 영적</h3>
        {spiritual.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-warm-700">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-warm-400">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-red-300 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="font-semibold text-warm-600 mb-3">💪 신체적</h3>
        {physical.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-warm-700">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-warm-400">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-red-300 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-warm-200 text-warm-400 hover:border-warm-400 hover:text-warm-600 transition-colors"
      >
        + 베이직 항목 추가
      </button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="새 베이직 항목">
        <TemplateForm
          onSave={(data) => {
            addTemplate(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
