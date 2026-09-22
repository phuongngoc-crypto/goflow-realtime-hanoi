import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { DEFAULT_HOME, type ScheduleItem, type TransportId } from "@/lib/goflow";

export type HomePlace = { address: string; lat: number; lng: number };

export type TripFeedback = {
  id: string;
  trip_label: string;
  trip_date: string;
  rating: number | null;
  outcome: string | null;
};

const LS_HOME = "goflow.home";
const LS_ITEMS = "goflow.items";
const LS_TRANSPORT = "goflow.transport";
const LS_FEEDBACK = "goflow.feedback";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function seedItems(): ScheduleItem[] {
  return [];
}

export function useGoflowData() {
  const { user, loading: authLoading } = useSession();
  const userId = user?.id ?? null;

  const [home, setHomeState] = useState<HomePlace>(DEFAULT_HOME);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [transport, setTransportState] = useState<TransportId>("moto");
  const [feedback, setFeedback] = useState<TripFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuest = useCallback(() => {
    setHomeState(readLS<HomePlace>(LS_HOME, DEFAULT_HOME));
    const stored = readLS<ScheduleItem[] | null>(LS_ITEMS, null);
    const next = stored ?? seedItems();
    if (!stored) writeLS(LS_ITEMS, next);
    setItems(next);
    setTransportState(readLS<TransportId>(LS_TRANSPORT, "moto"));
    setFeedback(readLS<TripFeedback[]>(LS_FEEDBACK, []));
    setLoading(false);
  }, []);

  const loadCloud = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_address, home_lat, home_lng, transport")
      .eq("id", uid)
      .maybeSingle();

    if (profile) {
      setHomeState({
        address: profile.home_address,
        lat: profile.home_lat,
        lng: profile.home_lng,
      });
      setTransportState((profile.transport as TransportId) ?? "moto");
    } else {
      await supabase.from("profiles").insert({ id: uid });
      setHomeState(DEFAULT_HOME);
    }

    const { data: rows } = await supabase
      .from("schedule_items")
      .select("id, title, kind, weekday, start_time, end_time, location, dest_lat, dest_lng")
      .eq("user_id", uid)
      .order("weekday")
      .order("start_time");


    setItems(
      (rows ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        kind: (r.kind as "study" | "work") ?? "study",
        weekday: r.weekday,
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
        location: r.location,
        dest_lat: r.dest_lat,
        dest_lng: r.dest_lng,
      })),
    );

    const { data: fb } = await supabase
      .from("trip_feedback")
      .select("id, trip_label, trip_date, rating, outcome")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setFeedback(fb ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (userId) void loadCloud(userId);
    else loadGuest();
  }, [authLoading, userId, loadCloud, loadGuest]);

  const setHome = useCallback(
    async (next: HomePlace) => {
      setHomeState(next);
      if (userId) {
        await supabase
          .from("profiles")
          .update({ home_address: next.address, home_lat: next.lat, home_lng: next.lng })
          .eq("id", userId);
      } else {
        writeLS(LS_HOME, next);
      }
    },
    [userId],
  );

  const setTransport = useCallback(
    async (next: TransportId) => {
      setTransportState(next);
      if (userId) await supabase.from("profiles").update({ transport: next }).eq("id", userId);
      else writeLS(LS_TRANSPORT, next);
    },
    [userId],
  );

  const replaceSchedule = useCallback(
    async (next: Omit<ScheduleItem, "id">[]) => {
      if (userId) {
        await supabase.from("schedule_items").delete().eq("user_id", userId);
        if (next.length)
          await supabase
            .from("schedule_items")
            .insert(next.map((item) => ({ ...item, user_id: userId })));
        await loadCloud(userId);
      } else {
        const withIds = next.map((item, i) => ({ ...item, id: `local-${Date.now()}-${i}` }));
        setItems(withIds);
        writeLS(LS_ITEMS, withIds);
      }
    },
    [userId, loadCloud],
  );

  const addSchedule = useCallback(
    async (next: Omit<ScheduleItem, "id">[]) => {
      if (!next.length) return;
      if (userId) {
        await supabase
          .from("schedule_items")
          .insert(next.map((item) => ({ ...item, user_id: userId })));
        await loadCloud(userId);
      } else {
        const withIds = [
          ...items,
          ...next.map((item, i) => ({ ...item, id: `local-${Date.now()}-${i}` })),
        ];
        setItems(withIds);
        writeLS(LS_ITEMS, withIds);
      }
    },
    [userId, items, loadCloud],
  );

  const removeScheduleItem = useCallback(
    async (id: string) => {
      if (userId) {
        await supabase.from("schedule_items").delete().eq("id", id).eq("user_id", userId);
        await loadCloud(userId);
      } else {
        const next = items.filter((i) => i.id !== id);
        setItems(next);
        writeLS(LS_ITEMS, next);
      }
    },
    [userId, items, loadCloud],
  );

  const updateScheduleItem = useCallback(
    async (id: string, patch: Partial<Omit<ScheduleItem, "id">>) => {
      if (userId && !id.startsWith("local-") && !id.startsWith("seed-")) {
        await supabase.from("schedule_items").update(patch).eq("id", id).eq("user_id", userId);
        await loadCloud(userId);
      } else {
        const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
        setItems(next);
        writeLS(LS_ITEMS, next);
      }
    },
    [userId, items, loadCloud],
  );

  const rateTrip = useCallback(
    async (payload: { label: string; rating: number; outcome: string; itemId?: string | null }) => {
      const today = new Date().toISOString().slice(0, 10);
      if (userId) {
        await supabase.from("trip_feedback").insert({
          user_id: userId,
          trip_label: payload.label,
          rating: payload.rating,
          outcome: payload.outcome,
          trip_date: today,
          schedule_item_id:
            payload.itemId && !payload.itemId.startsWith("seed-") && !payload.itemId.startsWith("local-")
              ? payload.itemId
              : null,
        });
        const { data: fb } = await supabase
          .from("trip_feedback")
          .select("id, trip_label, trip_date, rating, outcome")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        setFeedback(fb ?? []);
      } else {
        const next: TripFeedback[] = [
          {
            id: `fb-${Date.now()}`,
            trip_label: payload.label,
            trip_date: today,
            rating: payload.rating,
            outcome: payload.outcome,
          },
          ...feedback,
        ].slice(0, 20);
        setFeedback(next);
        writeLS(LS_FEEDBACK, next);
      }
    },
    [userId, feedback],
  );

  return {
    user,
    authLoading,
    loading,
    home,
    setHome,
    items,
    transport,
    setTransport,
    feedback,
    replaceSchedule,
    addSchedule,
    removeScheduleItem,
    updateScheduleItem,
    rateTrip,
  };
}
