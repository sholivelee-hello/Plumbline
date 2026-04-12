"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/types/database";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from("events").select("*").order("start_date");
    if (data) setEvents(data);
    setLoading(false);
  }, []);

  const loadUpcoming = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const { data } = await supabase.from("events").select("*")
      .gte("end_date", today)
      .lte("start_date", twoWeeks.toISOString().split("T")[0])
      .order("start_date")
      .limit(5);
    if (data) setUpcoming(data);
  }, []);

  useEffect(() => { loadEvents(); loadUpcoming(); }, [loadEvents, loadUpcoming]);

  async function addEvent(event: Omit<Event, "id" | "user_id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("events").insert({ user_id: user.id, ...event });
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
