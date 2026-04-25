"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { UserSettings } from "@/types/database";
import { demoSettings } from "@/lib/demo-data";

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id"> = {
  timezone: "Asia/Seoul",
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

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
            .maybeSingle();
          setSettings(created ?? demoSettings);
        } else {
          setSettings(data);
        }
      } catch {
        setSettings(demoSettings);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function update(updates: Partial<UserSettings>) {
    if (!settings) return;
    const { data } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("id", settings.id)
      .select()
      .maybeSingle();
    if (data) setSettings(data);
  }

  return { settings, loading, update };
}
