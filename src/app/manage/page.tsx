"use client";

import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { Fab } from "@/components/finance/fab";
import { useWeight } from "@/lib/hooks/use-weight";
import { WeightHero } from "@/components/manage/weight-hero";
import { WeightInputSheet } from "@/components/manage/weight-input-sheet";
import { WeightLogList } from "@/components/manage/weight-log-list";
import { WeightChart } from "@/components/manage/weight-chart";
import { WeightComparisons } from "@/components/manage/weight-comparisons";
import type { WeightEntry } from "@/types/database";

export default function ManagePage() {
  const { entries, goal, stats, loading, addEntry, updateEntry, deleteEntry } = useWeight();
  const { toast } = useToast();
  const [inputOpen, setInputOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  async function handleSubmit(weight_kg: number, weighed_on: string) {
    setSaving(true);
    const res = editing
      ? await updateEntry(editing.id, weight_kg, weighed_on)
      : await addEntry(weight_kg, weighed_on);
    setSaving(false);
    if (res.ok) {
      toast(editing ? "기록이 수정됨" : `${weight_kg.toFixed(1)}kg 기록됨`, "success");
      setInputOpen(false);
      setEditing(null);
    } else {
      toast(res.error ?? "저장 실패", "error");
    }
  }

  async function handleDelete() {
    if (!editing) return;
    const res = await deleteEntry(editing.id);
    if (res.ok) {
      toast("기록이 삭제됨", "success");
      setInputOpen(false);
      setEditing(null);
    } else {
      toast(res.error ?? "삭제 실패", "error");
    }
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader
        title="관리"
        contentMaxWidth="max-w-3xl"
        rightAction={
          <button
            type="button"
            aria-label="목표 설정"
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d3748] transition-colors"
          >
            <SettingsIcon size={20} />
          </button>
        }
      />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <div className="h-40 rounded-2xl bg-gray-100 dark:bg-[#1a2030] animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="rounded-2xl p-8 text-center bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">첫 체중을 기록해보세요</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">우측 하단 + 버튼으로 시작</p>
          </div>
        ) : (
          <>
            <WeightHero stats={stats} goal={goal} />
            <WeightChart entries={entries} goal={goal} />
            <WeightComparisons comparisons={stats.comparisons} />
            <WeightLogList
              entries={entries}
              onTap={(e) => {
                setEditing(e);
                setInputOpen(true);
              }}
            />
          </>
        )}
      </div>

      <Fab onClick={() => setInputOpen(true)} label="체중 기록" />

      <WeightInputSheet
        isOpen={inputOpen}
        onClose={() => {
          setInputOpen(false);
          setEditing(null);
        }}
        mode={editing ? "edit" : "create"}
        initial={editing ? { weight_kg: editing.weight_kg, weighed_on: editing.weighed_on } : undefined}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        saving={saving}
      />
    </div>
  );
}
