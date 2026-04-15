"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { UserSettings } from "@/types/database";
import { demoSettings } from "@/lib/demo-data";

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id"> = {
  day_start_time: "04:00",
  day_end_time: "00:00",
  timezone: "Asia/Seoul",
  time_unit: 30,
  salary_day: 25,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", FIXED_USER_ID)
          .maybeSingle();

        if (!data) {
          const { data: created } = await supabase
            .from("user_settings")
            .insert({ user_id: FIXED_USER_ID, ...DEFAULT_SETTINGS })
            .select()
            .single();
          setSettings(created);
        } else {
          setSettings(data);
        }
      } catch {
        // Supabase 미연결 시 기본값 사용
        setSettings(demoSettings);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function update(updates: Partial<UserSettings>) {
    if (!settings) return;
    const { data } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("id", settings.id)
      .select()
      .single();
    if (data) setSettings(data);
  }

  return { settings, loading, update };
}
