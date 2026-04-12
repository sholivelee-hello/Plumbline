"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types/database";

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id"> = {
  day_start_time: "04:00",
  day_end_time: "00:00",
  timezone: "Asia/Seoul",
  time_unit: 30,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!data) {
        const { data: created } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
          .select()
          .single();
        setSettings(created);
      } else {
        setSettings(data);
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
