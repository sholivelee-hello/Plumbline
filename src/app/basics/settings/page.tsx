"use client";

import { useState } from "react";
import { useBasics } from "@/lib/hooks/use-basics";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { TemplateForm } from "@/components/basics/template-form";
import { PageHeader } from "@/components/ui/page-header";

export default function BasicsSettingsPage() {
  const { templates, addTemplate, deactivateTemplate } = useBasics();
  const [showForm, setShowForm] = useState(false);

  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="베이직 설정" backHref="/basics" />
      <div className="max-w-4xl mx-auto p-4 space-y-4">

      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">📖 영적</h3>
        {spiritual.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-gray-900 dark:text-gray-100">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-obligation-300 dark:text-obligation-400 hover:text-obligation-500 dark:hover:text-obligation-300 px-3 py-1.5 rounded-lg"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">💪 신체적</h3>
        {physical.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="text-gray-900 dark:text-gray-100">{t.title}</span>
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              {t.type === "number" && <span>{t.target_value}{t.unit}</span>}
              <button
                onClick={() => deactivateTemplate(t.id)}
                className="text-obligation-300 dark:text-obligation-400 hover:text-obligation-500 dark:hover:text-obligation-300 px-3 py-1.5 rounded-lg"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </Card>

      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#262c38] text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-[#363c48] hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
    </div>
  );
}
