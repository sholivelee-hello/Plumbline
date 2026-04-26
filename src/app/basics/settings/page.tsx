"use client";

import { useState } from "react";
import { useBasics } from "@/lib/hooks/use-basics";
import { useSettings } from "@/lib/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { TemplateForm } from "@/components/basics/template-form";
import { PageHeader } from "@/components/ui/page-header";
import { getLogicalDate, formatDateKR } from "@/lib/utils/date";
import type { BasicsTemplate } from "@/types/database";

export default function BasicsSettingsPage() {
  const { templates, addTemplate, updateTemplate, deactivateTemplate } = useBasics();
  const { settings, update: updateSettings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BasicsTemplate | null>(null);

  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");

  function renderStartDateRow({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string | null;
    onChange: (v: string | null) => void;
  }) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {label}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(getLogicalDate())}
              className="text-xs text-primary-500 hover:text-primary-600 px-2 py-1.5 rounded-md min-h-[28px]"
            >
              오늘
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1.5 rounded-md min-h-[28px]"
              >
                비우기
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2e45] bg-white dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-300 min-h-[44px]"
          />
          {value && (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
              {formatDateKR(value)}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderRow(t: BasicsTemplate) {
    return (
      <div key={t.id} className="flex items-center justify-between gap-2 py-2">
        <button
          onClick={() => setEditing(t)}
          className="flex-1 text-left text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
          {t.title}
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          {t.type === "number" && (
            <span className="tabular-nums">
              {t.target_value}
              {t.unit}
              {t.step_value != null && ` · ±${t.step_value}`}
            </span>
          )}
          <button
            onClick={() => setEditing(t)}
            className="text-primary-500 hover:text-primary-600 px-2 py-1.5 rounded-lg"
          >
            수정
          </button>
          <button
            onClick={() => deactivateTemplate(t.id)}
            className="text-obligation-300 dark:text-obligation-400 hover:text-obligation-500 dark:hover:text-obligation-300 px-2 py-1.5 rounded-lg"
          >
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="베이직 설정" backHref="/basics" />
      <div className="max-w-4xl mx-auto p-4 space-y-4">

      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
          📖 통독 / ✨ 묵상
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          시작일 기준으로 매일 오늘의 본문이 자동 계산돼요. 통독은 100일, 묵상은 150편 사이클이 끝나면 다시 1일차로 돌아가요.
        </p>
        <div className="space-y-5">
          {renderStartDateRow({
            label: "통독 1일차 시작일",
            value: settings?.bible_reading_start_date ?? null,
            onChange: (v) => updateSettings({ bible_reading_start_date: v }),
          })}
          {renderStartDateRow({
            label: "묵상 1일차 시작일",
            value: settings?.meditation_start_date ?? null,
            onChange: (v) => updateSettings({ meditation_start_date: v }),
          })}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">📖 영적</h3>
        {spiritual.map(renderRow)}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">💪 신체적</h3>
        {physical.map(renderRow)}
      </Card>

      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#262c38] text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-[#363c48] hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        + 베이직 항목 추가
      </button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="새 베이직 항목">
        <TemplateForm
          submitLabel="추가"
          onSave={(data) => {
            addTemplate(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="베이직 항목 수정">
        {editing && (
          <TemplateForm
            initialValues={{
              category: editing.category,
              title: editing.title,
              type: editing.type,
              unit: editing.unit,
              target_value: editing.target_value,
              step_value: editing.step_value,
            }}
            submitLabel="저장"
            onSave={(data) => {
              updateTemplate(editing.id, data);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      </div>
    </div>
  );
}
