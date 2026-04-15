"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { WeeklyView } from "@/components/schedule/weekly-view";
import { MonthlyView } from "@/components/schedule/monthly-view";
import { BlockForm } from "@/components/schedule/block-form";
import { EventForm } from "@/components/schedule/event-form";
import { PresetPicker } from "@/components/schedule/preset-picker";
import { Modal } from "@/components/ui/modal";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { useEvents } from "@/lib/hooks/use-events";
import { useSettings } from "@/lib/hooks/use-settings";
import { getWeekStart, getLogicalDate, generateTimeSlots } from "@/lib/utils/date";
import type { Event } from "@/types/database";

export default function SchedulePage() {
  const { settings } = useSettings();
  const today = getLogicalDate(settings?.day_start_time);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const schedule = useSchedule(weekStart);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const [presetOpen, setPresetOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<{
    date: string;
    start?: string;
    title?: string;
    color?: string;
    duration?: number;
    presetId?: string;
    asActual?: boolean;
  } | null>(null);

  const dayStart = settings?.day_start_time ?? "04:00";
  const dayEnd = settings?.day_end_time ?? "00:00";
  const timeUnit = settings?.time_unit ?? 30;
  const timeSlots = generateTimeSlots(dayStart, dayEnd, timeUnit);

  function prevWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }
  function nextWeek() {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }

  function openAdd(date: string, start?: string, asActual: boolean = false) {
    setFormInitial({ date, start, asActual });
    setPresetOpen(true);
  }

  function openManualForm() {
    setFormOpen(true);
  }

  function handleSelectPreset(preset: {
    id: string;
    title: string;
    color: string;
    duration: number;
  }) {
    setFormInitial((prev) =>
      prev
        ? {
            ...prev,
            title: preset.title,
            color: preset.color,
            duration: preset.duration,
            presetId: preset.id,
          }
        : null
    );
    setFormOpen(true);
  }

  async function handleSave(data: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    color: string;
    saveAsPreset: boolean;
    asActual: boolean;
  }) {
    if (data.asActual) {
      await schedule.addActual({
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        title: data.title,
        color: data.color,
      });
    } else {
      await schedule.addPlan({
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        title: data.title,
        color: data.color,
        preset_id: formInitial?.presetId,
      });
    }
    if (data.saveAsPreset) {
      const [sh, sm] = data.start_time.split(":").map(Number);
      const [eh, em] = data.end_time.split(":").map(Number);
      const duration = eh * 60 + em - (sh * 60 + sm);
      await schedule.savePreset({
        title: data.title,
        color: data.color,
        duration,
      });
    }
    setFormOpen(false);
    setFormInitial(null);
  }

  async function handleSaveEvent(data: {
    title: string;
    start_date: string;
    end_date: string;
    color: string;
    memo: string | null;
    start_time: string | null;
  }) {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
    } else {
      await addEvent(data);
    }
    setEventFormOpen(false);
    setEditingEvent(null);
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return;
    await deleteEvent(editingEvent.id);
    setEventFormOpen(false);
    setEditingEvent(null);
  }

  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">일정</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-[#1f242e] rounded-xl p-1">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1 rounded-lg text-sm transition-colors tap-press ${
                view === "weekly"
                  ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              주간
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1 rounded-lg text-sm transition-colors tap-press ${
                view === "monthly"
                  ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              월간
            </button>
          </div>
          {view === "weekly" && (
            <button
              type="button"
              onClick={() => openAdd(today, undefined, false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-sm font-semibold tap-press"
            >
              + 블록
            </button>
          )}
          <button
            type="button"
            onClick={() => { setEditingEvent(null); setEventFormOpen(true); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary-500 text-primary-600 dark:text-primary-300 text-sm font-semibold tap-press"
          >
            + 이벤트
          </button>
          <Link
            href="/schedule/templates"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 text-sm tap-press"
            aria-label="주간 템플릿"
          >
            📋
          </Link>
        </div>
      </div>

      {view === "weekly" && (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={prevWeek}
              aria-label="이전 주"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-600 dark:text-gray-300 font-medium text-sm tabular-nums">
              {schedule.weekDates[0]} ~ {schedule.weekDates[6]}
            </span>
            <button
              onClick={nextWeek}
              aria-label="다음 주"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <WeeklyView
            weekDates={schedule.weekDates}
            plans={schedule.plans}
            actuals={schedule.actuals}
            dayStartTime={dayStart}
            dayEndTime={dayEnd}
            timeUnit={timeUnit}
            onCompletePlan={schedule.completePlan}
            onEditComplete={(plan) => schedule.editAndComplete(plan, {})}
            onDeletePlan={schedule.deletePlan}
            onAddSlot={(date, start, asActual) => openAdd(date, start, asActual)}
            events={events}
            onEventClick={(e) => { setEditingEvent(e); setEventFormOpen(true); }}
          />
        </>
      )}

      {view === "monthly" && (
        <MonthlyView
          events={events}
          onSelectDate={(date) => {
            setWeekStart(getWeekStart(date));
            setView("weekly");
          }}
          onAddEvent={addEvent}
          onDeleteEvent={deleteEvent}
        />
      )}

      <PresetPicker
        isOpen={presetOpen}
        onClose={() => setPresetOpen(false)}
        presets={schedule.presets}
        onSelect={handleSelectPreset}
        onManual={openManualForm}
      />

      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setFormInitial(null);
        }}
        title="일정 추가"
      >
        {formInitial && (
          <BlockForm
            timeSlots={timeSlots}
            defaultDate={formInitial.date}
            defaultStartTime={formInitial.start}
            defaultTitle={formInitial.title}
            defaultColor={formInitial.color}
            defaultDurationMinutes={formInitial.duration}
            defaultAsActual={formInitial.asActual}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setFormInitial(null);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={eventFormOpen}
        onClose={() => { setEventFormOpen(false); setEditingEvent(null); }}
        title={editingEvent ? "이벤트 편집" : "이벤트 추가"}
      >
        <EventForm
          mode={editingEvent ? "edit" : "add"}
          initial={editingEvent ?? undefined}
          defaultDate={today}
          onSave={handleSaveEvent}
          onCancel={() => { setEventFormOpen(false); setEditingEvent(null); }}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
        />
      </Modal>
    </div>
  );
}
