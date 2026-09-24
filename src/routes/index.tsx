import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { AlarmClock, Clock, Loader2, MapPin, Star, TrafficCone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import AddressSearch from "@/components/goflow/AddressSearch";
import { Button } from "@/components/ui/button";
import { useGoflowData } from "@/hooks/useGoflowData";
import {
  DEFAULT_DEST,
  TRANSPORTS,
  WEEKDAYS,
  calculateRoute,
  findNextItem,
  fmtTime,
  getTransport,
  isoWeekday,
  searchAddress,
  type RouteResult,
  type TransportId,
} from "@/lib/goflow";

const MapPanel = lazy(() => import("@/components/goflow/MapPanel"));

const dashboardSearchSchema = z.object({
  itemId: z.string().optional(),
  destAddress: z.string().optional(),
  destLat: z.coerce.number().optional(),
  destLng: z.coerce.number().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "GoFlow - Nhắc bạn đúng hẹn | Kẹt xe Hà Nội thời gian thực" },
      {
        name: "description",
        content:
          "Xem bản đồ kẹt xe Hà Nội thời gian thực, nhận giờ vàng xuất phát cho ca học và ca làm sắp tới. Tối ưu di chuyển, tận hưởng hành trình.",
      },
      { property: "og:title", content: "GoFlow - Nhắc bạn đúng hẹn" },
      {
        property: "og:description",
        content:
          "Bản đồ kẹt xe Hà Nội thời gian thực và bộ đếm giờ vàng xuất phát cho từng phương tiện.",
      },
    ],
  }),
  component: Dashboard,
});

function formatCountdown(minutes: number): string {
  const m = Math.max(0, minutes);
  if (m < 60) return `${m} phút`;
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
}

function Dashboard() {
  const search = Route.useSearch();
  const {
    home,
    setHome,
    items,
    transport,
    setTransport,
    feedback,
    rateTrip,
    loading,
  } = useGoflowData();

  const [homeText, setHomeText] = useState(home.address);
  const [destText, setDestText] = useState("");
  const [destOverride, setDestOverride] = useState<
    { address: string; lat: number; lng: number } | null
  >(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const homeTouched = useRef(false);
  const appliedSearch = useRef(false);

  useEffect(() => {
    if (
      appliedSearch.current ||
      search.destLat === undefined ||
      search.destLng === undefined
    ) return;
    appliedSearch.current = true;
    const address = search.destAddress ?? "Điểm hẹn từ lịch trình";
    setDestText(address);
    setDestOverride({ address, lat: search.destLat, lng: search.destLng });
    setFocus({ lat: search.destLat, lng: search.destLng, nonce: Date.now() });
  }, [search.destAddress, search.destLat, search.destLng]);

  useEffect(() => {
    if (!homeTouched.current) setHomeText(home.address);
  }, [home.address]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(timer);
  }, []);

  const next = useMemo(() => findNextItem(items, now), [items, now]);
  const selectedSchedule = useMemo(
    () => (search.itemId ? items.find((item) => item.id === search.itemId) ?? null : null),
    [items, search.itemId],
  );
  const activeTrip = useMemo(
    () => (selectedSchedule ? findNextItem([selectedSchedule], now) : next),
    [selectedSchedule, next, now],
  );

  const schedulePlaces = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; address: string; lat: number | null; lng: number | null }
    >();
    for (const item of items) {
      const address = item.location?.trim();
      if (!address) continue;
      if (!map.has(address)) {
        map.set(address, {
          key: address,
          title: item.title,
          address,
          lat: item.dest_lat,
          lng: item.dest_lng,
        });
      }
    }
    return [...map.values()];
  }, [items]);

  async function pickSchedulePlace(place: (typeof schedulePlaces)[number]) {
    if (place.lat !== null && place.lng !== null) {
      setDestOverride({ address: place.address, lat: place.lat, lng: place.lng });
      setDestText(place.address);
      setFocus({ lat: place.lat, lng: place.lng, nonce: Date.now() });
      return;
    }
    setPicking(place.key);
    try {
      const results = await searchAddress(place.address, 1);
      const found = results[0];
      if (!found) {
        toast.error("Không tìm thấy toạ độ của điểm hẹn này");
        return;
      }
      setDestOverride({ address: place.address, lat: found.lat, lng: found.lng });
      setDestText(place.address);
      setFocus({ lat: found.lat, lng: found.lng, nonce: Date.now() });
    } catch {
      toast.error("Không tra được toạ độ, hãy thử nhập thủ công");
    } finally {
      setPicking(null);
    }
  }

  const dest = useMemo(() => {
    if (destOverride) return destOverride;
    if (activeTrip?.item.dest_lat && activeTrip.item.dest_lng) {
      return {
        address: activeTrip.item.location ?? activeTrip.item.title,
        lat: activeTrip.item.dest_lat,
        lng: activeTrip.item.dest_lng,
      };
    }
    return DEFAULT_DEST;
  }, [destOverride, activeTrip]);

  useEffect(() => {
    let cancelled = false;
    setCalculating(true);
    calculateRoute(home, dest, getTransport(transport))
      .then((result) => {
        if (!cancelled) setRoute(result);
      })
      .catch(() => {
        if (!cancelled) setRoute(null);
      })
      .finally(() => {
        if (!cancelled) setCalculating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [home.lat, home.lng, dest.lat, dest.lng, transport, home, dest]);

  const activeTransport = getTransport(transport);
  const totalMinutes = route ? route.minutes + activeTransport.buffer : null;
  const departAt =
    activeTrip && totalMinutes !== null
      ? new Date(activeTrip.startsAt.getTime() - totalMinutes * 60000)
      : null;
  const minutesLeft = departAt
    ? Math.round((departAt.getTime() - now.getTime()) / 60000)
    : null;

  const todayItems = items
    .filter((i) => i.weekday === isoWeekday(now))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="forest-panel overflow-hidden rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-accent">
          GoFlow - Nhắc bạn đúng hẹn
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-primary-foreground sm:text-4xl">
          Tối ưu di chuyển, tận hưởng hành trình
        </h1>
        <div className="mt-5 h-1.5 w-20 rounded-full bg-accent" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <section className="glass-card space-y-4 p-5">
            <AddressSearch
              label="Nơi ở của bạn"
              value={homeText}
              showGps
              onTextChange={(text) => {
                homeTouched.current = true;
                setHomeText(text);
              }}
              onPick={(place) => {
                void setHome(place);
                setFocus({ lat: place.lat, lng: place.lng, nonce: Date.now() });
              }}
            />
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Điểm hẹn từ lịch trình
              </p>
              {schedulePlaces.length === 0 ? (
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Chưa có điểm hẹn nào trong lịch trình của bạn.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {schedulePlaces.map((place) => {
                    const active = dest.address === place.address;
                    return (
                      <button
                        key={place.key}
                        type="button"
                        disabled={picking === place.key}
                        onClick={() => void pickSchedulePlace(place)}
                        className={`flex max-w-full items-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-left text-xs font-extrabold transition ${
                          active
                            ? "border-primary bg-primary/12 text-primary"
                            : "border-border bg-secondary/40 text-foreground hover:border-primary/40"
                        }`}
                      >
                        {picking === place.key ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <MapPin className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {place.title} — {place.address}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <AddressSearch
              label="Thêm điểm hẹn khác"
              value={destText}
              placeholder={dest.address}
              onTextChange={setDestText}
              onPick={(place) => {
                setDestOverride(place);
                setFocus({ lat: place.lat, lng: place.lng, nonce: Date.now() });
              }}
            />
            <p className="text-[11px] font-semibold text-muted-foreground">
              Bạn cũng có thể chạm trực tiếp lên bản đồ để cắm ghim đúng nóc nhà mình.
            </p>
          </section>

          <section className="glass-card space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold">Ca sắp tới gần nhất</h2>
                {loading ? (
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">Đang tải...</p>
                ) : activeTrip ? (
                  <p className="mt-1 text-sm font-bold">
                    {activeTrip.item.title} •{" "}
                    <span className="text-primary">
                      {WEEKDAYS[activeTrip.item.weekday - 1]} {activeTrip.item.start_time}
                    </span>
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {activeTrip.item.location ?? dest.address}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Chưa có ca nào — hãy nạp lịch trình của bạn.
                  </p>
                )}
              </div>
              <span
                className={`rounded-2xl px-3 py-1 text-xs font-bold ${
                  activeTrip?.item.kind === "work"
                    ? "bg-accent text-accent-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {activeTrip?.item.kind === "work" ? "Ca làm" : "Ca học"}
              </span>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Phương tiện
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TRANSPORTS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void setTransport(t.id as TransportId)}
                    className={`rounded-3xl border-2 px-2 py-3 text-center transition ${
                      transport === t.id
                        ? "border-primary bg-primary/12 text-primary shadow-soft"
                        : "border-border bg-secondary/40 text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="block text-xl">{t.emoji}</span>
                    <span className="mt-1 block text-xs font-extrabold">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                {activeTransport.note}
              </p>
            </div>

            <div className="rounded-3xl bg-secondary p-4 ring-1 ring-primary/10">
              {calculating ? (
                <p className="flex items-center gap-2 text-sm font-bold text-secondary-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang kiểm tra lưu lượng giao thông Hà Nội...
                </p>
              ) : route && departAt && minutesLeft !== null ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-bold text-secondary-foreground">
                    <AlarmClock className="size-4" />
                    Bạn cần xuất phát sau:
                  </p>
                   <p className="mt-1 text-4xl font-extrabold text-primary">
                    {formatCountdown(minutesLeft)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-secondary-foreground">
                    <Clock className="mr-1 inline size-4" />
                    Bước chân ra khỏi nhà lúc{" "}
                    {fmtTime(departAt.getHours() * 60 + departAt.getMinutes())} (
                    {WEEKDAYS[departAt.getDay() === 0 ? 6 : departAt.getDay() - 1]})
                    {minutesLeft <= 0 && " — đi ngay nhé!"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <div className="rounded-2xl bg-card p-2">
                      <span className="block text-base font-extrabold text-primary">
                        {route.minutes}′
                      </span>
                      Di chuyển
                    </div>
                    <div className="rounded-2xl bg-card p-2">
                      <span className="block text-base font-extrabold text-primary">
                        {activeTransport.buffer}′
                      </span>
                      Đệm
                    </div>
                    <div className="rounded-2xl bg-card p-2">
                      <span className="block text-base font-extrabold text-primary">
                        {route.distanceKm.toFixed(1)} km
                      </span>
                      Quãng đường
                    </div>
                  </div>
                  {route.delayMinutes > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-destructive">
                      <TrafficCone className="size-4" />
                      Giao thông đang chậm hơn {route.delayMinutes} phút so với bình thường
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-secondary-foreground">
                  Chưa tính được lộ trình. Hãy kiểm tra lại nơi ở và điểm hẹn.
                </p>
              )}
            </div>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-base font-extrabold">Chuyến đi hôm nay</h2>
            {todayItems.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Hôm nay bạn không có ca nào. Nghỉ ngơi thôi!
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {todayItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-3xl border border-border bg-secondary/30 p-3"
                  >
                    <p className="text-sm font-extrabold">
                      {item.start_time} – {item.end_time} • {item.title}
                    </p>
                    <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <MapPin className="size-3" />
                      {item.location ?? dest.address}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Đánh giá ${star} sao`}
                          onClick={() =>
                            void rateTrip({
                              label: item.title,
                              rating: star,
                              outcome: star >= 4 ? "Đúng giờ" : "Bị trễ",
                              itemId: item.id,
                            }).then(() => toast.success("Cảm ơn bạn đã đánh giá!"))
                          }
                          className="text-warning transition hover:scale-110"
                        >
                          <Star className="size-5" />
                        </button>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-2xl text-xs font-bold"
                        onClick={() =>
                          void rateTrip({
                            label: item.title,
                            rating: 5,
                            outcome: "Đúng giờ",
                            itemId: item.id,
                          }).then(() => toast.success("Tuyệt vời, đúng giờ!"))
                        }
                      >
                        Đúng giờ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl text-xs font-bold"
                        onClick={() =>
                          void rateTrip({
                            label: item.title,
                            rating: 2,
                            outcome: "Bị trễ",
                            itemId: item.id,
                          }).then(() => toast("Đã lưu, lần sau GoFlow sẽ nhắc sớm hơn"))
                        }
                      >
                        Bị trễ
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {feedback.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Đánh giá gần đây
                </p>
                <ul className="mt-2 space-y-1 text-xs font-semibold">
                  {feedback.slice(0, 5).map((f) => (
                    <li key={f.id} className="flex justify-between gap-2">
                      <span className="truncate">{f.trip_label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {f.trip_date} • {"★".repeat(f.rating ?? 0)} {f.outcome}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <section className="forest-panel overflow-hidden rounded-3xl p-2">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-extrabold text-primary-foreground">Giao thông Hà Nội thời gian thực</h2>
            <span className="flex items-center gap-2 text-xs font-bold text-accent">
              <span className="size-2 animate-pulse rounded-full bg-accent" /> Trực tiếp
            </span>
          </div>
          <div className="h-[420px] w-full lg:h-[calc(100vh-10rem)] lg:min-h-[560px]">
            <ClientOnly
              fallback={
                <div className="grid h-full place-items-center rounded-3xl bg-muted text-sm font-bold text-muted-foreground">
                  Đang mở bản đồ Hà Nội...
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center rounded-3xl bg-muted text-sm font-bold text-muted-foreground">
                    Đang mở bản đồ Hà Nội...
                  </div>
                }
              >
                <MapPanel
                  home={{ ...home }}
                  dest={dest}
                  points={route?.points ?? []}
                  focus={focus}
                  onPick={(lat, lng) => {
                    void setHome({ address: homeText || home.address, lat, lng });
                    setFocus({ lat, lng, nonce: Date.now() });
                    toast.success("Đã cắm ghim nơi ở mới");
                  }}
                />
              </Suspense>
            </ClientOnly>
          </div>
        </section>
      </div>
    </main>
  );
}
