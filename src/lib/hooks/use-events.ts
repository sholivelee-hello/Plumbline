"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXED_USER_ID } from "@/lib/constants";
import type { Event } from "@/types/database";
import { demoEvents } from "@/lib/demo-data";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    try {
      const { data } = await supabase.from("events").select("*").order("start_date");
      if (data) setEvents(data);
    } catch {
      setEvents(demoEvents);
    }
    setLoading(false);
  }, []);

  const loadUpcoming = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const { data } = await supabase.from("events").select("*")
        .gte("end_date", today)
        .lte("start_date", twoWeeks.toISOString().split("T")[0])
        .order("start_date")
        .limit(5);
      if (data) setUpcoming(data);
    } catch {
      const today = new Date().toISOString().split("T")[0];
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const twoWeeksStr = twoWeeks.toISOString().split("T")[0];
      setUpcoming(
        demoEvents
          .filter((e) => e.end_date >= today && e.start_date <= twoWeeksStr)
          .slice(0, 5)
      );
    }
  }, []);

  useEffect(() => { loadEvents(); loadUpcoming(); }, [loadEvents, loadUpcoming]);

  async function addEvent(event: Omit<Event, "id" | "user_id">) {
    await supabase.from("events").insert({ user_id: FIXED_USER_ID, ...event });
    await loadEvents();
    await loadUpcoming();
  }

  async function deleteEvent(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    await loadEvents();
    await loadUpcoming();
  }

  return { events, upcoming, loading, addEvent, deleteEvent };
}
