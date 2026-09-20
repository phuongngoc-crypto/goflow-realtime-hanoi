export const TOMTOM_KEY = "gvmI8Uel6GuwZw2ot0aEiPPGYwEWxX1k";

export const HANOI_CENTER = { lat: 21.0278, lng: 105.8342 };

export const DEFAULT_HOME = {
  address: "Số 15 ngõ 137 Phùng Khoang, Trung Văn, Nam Từ Liêm, Hà Nội",
  lat: 20.9829,
  lng: 105.79,
};

export const DEFAULT_DEST = {
  address: "Đại học Bách Khoa Hà Nội",
  lat: 21.0049,
  lng: 105.8437,
};

export type TransportId = "moto" | "car" | "transit" | "walk";

export type Transport = {
  id: TransportId;
  label: string;
  emoji: string;
  buffer: number;
  note: string;
  travelMode: "motorcycle" | "car" | "bus" | "pedestrian";
  traffic: boolean;
};

export const TRANSPORTS: Transport[] = [
  {
    id: "moto",
    label: "Xe máy",
    emoji: "🛵",
    buffer: 5,
    note: "Đệm gửi xe 5 phút",
    travelMode: "motorcycle",
    traffic: true,
  },
  {
    id: "car",
    label: "Ô tô / Taxi",
    emoji: "🚗",
    buffer: 15,
    note: "Đệm tìm bãi đỗ 15 phút + kẹt xe",
    travelMode: "car",
    traffic: true,
  },
  {
    id: "transit",
    label: "Bus / Tàu điện",
    emoji: "🚇",
    buffer: 10,
    note: "Đệm đi bộ & chờ tàu 10 phút",
    travelMode: "bus",
    traffic: true,
  },
  {
    id: "walk",
    label: "Đi bộ",
    emoji: "🚶",
    buffer: 0,
    note: "Đi bộ trực tiếp",
    travelMode: "pedestrian",
    traffic: false,
  },
];

export function getTransport(id: TransportId): Transport {
  return TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[0]!;
}

export type Suggestion = {
  id: string;
  address: string;
  lat: number;
  lng: number;
};

const SEARCH_BASE = "https://api.tomtom.com/search/2";

/** TomTom Search — luôn encode để tránh lỗi 400 với số nhà, ngõ, ngách. */
export async function searchAddress(query: string, limit = 6): Promise<Suggestion[]> {
  const q = encodeURIComponent(`${query.trim()}, Hà Nội, Việt Nam`);
  const url =
    `${SEARCH_BASE}/search/${q}.json?key=${TOMTOM_KEY}&limit=${limit}` +
    `&countrySet=VN&lat=${HANOI_CENTER.lat}&lon=${HANOI_CENTER.lng}&radius=60000&language=vi-VN`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("search_failed");
  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      address?: { freeformAddress?: string };
      poi?: { name?: string };
      position: { lat: number; lon: number };
    }>;
  };
  return (data.results ?? []).map((r) => ({
    id: r.id,
    address: [r.poi?.name, r.address?.freeformAddress].filter(Boolean).join(" — "),
    lat: r.position.lat,
    lng: r.position.lon,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${SEARCH_BASE}/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}&language=vi-VN`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("reverse_failed");
  const data = (await res.json()) as {
    addresses?: Array<{ address?: { freeformAddress?: string } }>;
  };
  return data.addresses?.[0]?.address?.freeformAddress ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export type RouteResult = {
  minutes: number;
  distanceKm: number;
  delayMinutes: number;
  points: Array<[number, number]>;
};

export async function calculateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  transport: Transport,
): Promise<RouteResult> {
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/${from.lat},${from.lng}:${to.lat},${to.lng}/json` +
    `?key=${TOMTOM_KEY}&traffic=${transport.traffic}&travelMode=${transport.travelMode}` +
    `&routeType=fastest&computeTravelTimeFor=all`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("route_failed");
  const data = (await res.json()) as {
    routes?: Array<{
      summary: {
        lengthInMeters: number;
        travelTimeInSeconds: number;
        liveTrafficIncidentsTravelTimeInSeconds?: number;
        trafficDelayInSeconds?: number;
      };
      legs: Array<{ points: Array<{ latitude: number; longitude: number }> }>;
    }>;
  };
  const route = data.routes?.[0];
  if (!route) throw new Error("no_route");
  const points = route.legs.flatMap((leg) =>
    leg.points.map((p) => [p.latitude, p.longitude] as [number, number]),
  );
  return {
    minutes: Math.max(1, Math.round(route.summary.travelTimeInSeconds / 60)),
    distanceKm: route.summary.lengthInMeters / 1000,
    delayMinutes: Math.round((route.summary.trafficDelayInSeconds ?? 0) / 60),
    points,
  };
}

/* ---------- Thời gian ---------- */

export const WEEKDAYS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 21;

export type ScheduleItem = {
  id: string;
  title: string;
  kind: "study" | "work";
  weekday: number; // 1 = Thứ 2 ... 7 = Chủ Nhật
  start_time: string; // "07:30"
  end_time: string;
  location: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
};

export function toMinutes(hhmm: string): number {
  const parts = hhmm.slice(0, 5).split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

export function fmtTime(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

/** Ca gần nhất kể từ thời điểm hiện tại (trong 7 ngày tới). */
export function findNextItem(
  items: ScheduleItem[],
  now = new Date(),
): { item: ScheduleItem; startsAt: Date } | null {
  const today = isoWeekday(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: { item: ScheduleItem; startsAt: Date } | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const item of items) {
    for (let offset = 0; offset < 8; offset++) {
      const wd = ((today - 1 + offset) % 7) + 1;
      if (wd !== item.weekday) continue;
      const start = toMinutes(item.start_time);
      const delta = offset * 1440 + start - nowMin;
      if (delta < -30) continue;
      if (delta < bestDelta) {
        const startsAt = new Date(now);
        startsAt.setDate(startsAt.getDate() + offset);
        startsAt.setHours(Math.floor(start / 60), start % 60, 0, 0);
        bestDelta = delta;
        best = { item, startsAt };
      }
    }
  }
  return best;
}

export const DEFAULT_SCHEDULE: Omit<ScheduleItem, "id">[] = [
  {
    title: "Giải Tích 2",
    kind: "study",
    weekday: 1,
    start_time: "07:30",
    end_time: "09:10",
    location: DEFAULT_DEST.address,
    dest_lat: DEFAULT_DEST.lat,
    dest_lng: DEFAULT_DEST.lng,
  },
  {
    title: "Giải Tích 2",
    kind: "study",
    weekday: 4,
    start_time: "07:30",
    end_time: "09:10",
    location: DEFAULT_DEST.address,
    dest_lat: DEFAULT_DEST.lat,
    dest_lng: DEFAULT_DEST.lng,
  },
  {
    title: "Vật Lý Đại Cương",
    kind: "study",
    weekday: 3,
    start_time: "13:00",
    end_time: "15:30",
    location: DEFAULT_DEST.address,
    dest_lat: DEFAULT_DEST.lat,
    dest_lng: DEFAULT_DEST.lng,
  },
  {
    title: "Làm thêm quán cafe",
    kind: "work",
    weekday: 6,
    start_time: "17:00",
    end_time: "21:00",
    location: "Trung Văn, Nam Từ Liêm, Hà Nội",
    dest_lat: 20.9846,
    dest_lng: 105.7913,
  },
];
