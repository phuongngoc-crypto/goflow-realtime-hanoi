import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Clock3, Loader2, MapPin, Pencil, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import ScheduleGrid from "@/components/goflow/ScheduleGrid";
import ImportPanel from "@/components/goflow/ImportPanel";
import AddressSearch from "@/components/goflow/AddressSearch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoflowData } from "@/hooks/useGoflowData";
import {
  WEEKDAYS,
  calculateRoute,
  getTransport,
  searchAddress,
  type RouteResult,
  type ScheduleItem,
} from "@/lib/goflow";

export const Route = createFileRoute("/lich-trinh")({
  head: () => ({
    meta: [
      { title: "Lịch trình tuần — GoFlow - Nhắc bạn đúng hẹn" },
      {
        name: "description",
        content:
          "Bảng ma trận thời gian từ 07:00 đến 21:00: nạp thời khoá biểu bằng ảnh, Excel hoặc CSV và xem ca học, ca làm theo từng khung giờ.",
      },
      { property: "og:title", content: "Lịch trình tuần — GoFlow" },
      {
        property: "og:description",
        content: "Nạp thời khoá biểu bằng ảnh, Excel hoặc CSV và xem theo bảng ma trận giờ.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const navigate = useNavigate();
  const {
    home,
    items,
    transport,
    loading,
    addSchedule,
    replaceSchedule,
    removeScheduleItem,
    updateScheduleItem,
  } = useGoflowData();
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [tripOverview, setTripOverview] = useState<RouteResult | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [origin, setOrigin] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [originText, setOriginText] = useState("");
  const [editOrigin, setEditOrigin] = useState(false);
  const [form, setForm] = useState({
    title: "",
    kind: "study" as "study" | "work",
    weekday: 1,
    start_time: "07:30",
    end_time: "09:10",
    location: "",
    dest_lat: null as number | null,
    dest_lng: null as number | null,
  });

  async function resolveLocation<T extends Omit<ScheduleItem, "id">>(item: T): Promise<T> {
    const location = item.location?.trim();
    if (!location || (item.dest_lat !== null && item.dest_lng !== null)) return item;
    try {
      const found = (await searchAddress(location, 1))[0];
      return found ? { ...item, dest_lat: found.lat, dest_lng: found.lng } : item;
    } catch {
      return item;
    }
  }

  async function openTrip(item: ScheduleItem, from = origin ?? home) {
    setSelected(item);
    setEditing(null);
    setTripOverview(null);
    if (!item.location) return;
    setTripLoading(true);
    try {
      const resolved = await resolveLocation(item);
      if (resolved.dest_lat === null || resolved.dest_lng === null) {
        toast.error("Không tìm thấy tọa độ của địa điểm này");
        return;
      }
      if (item.dest_lat === null || item.dest_lng === null) {
        await updateScheduleItem(item.id, {
          dest_lat: resolved.dest_lat,
          dest_lng: resolved.dest_lng,
        });
      }
      setSelected({ ...item, dest_lat: resolved.dest_lat, dest_lng: resolved.dest_lng });
      setTripOverview(
        await calculateRoute(
          from,
          { lat: resolved.dest_lat, lng: resolved.dest_lng },
          getTransport(transport),
        ),
      );
    } catch {
      toast.error("Chưa thể tính tổng quan hành trình");
    } finally {
      setTripLoading(false);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const item = await resolveLocation<Omit<ScheduleItem, "id">>({
      title: form.title.trim(),
      kind: form.kind,
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location.trim() || null,
      dest_lat: form.dest_lat,
      dest_lng: form.dest_lng,
    });
    await addSchedule([item]);
    setForm({ ...form, title: "", location: "", dest_lat: null, dest_lng: null });
    toast.success("Đã thêm vào lịch trình");
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="forest-panel rounded-3xl p-5 text-primary-foreground sm:p-7">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-accent">GoFlow</p>
        <h1 className="text-xl font-black sm:text-2xl">Lịch trình tuần này</h1>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-3 text-lg font-black">Tải lên thời khóa biểu trong tuần của bạn</h2>
        <ImportPanel
          onImport={async (newItems, mode) => {
            const locatedItems = await Promise.all(newItems.map(resolveLocation));
            if (mode === "replace") await replaceSchedule(locatedItems);
            else await addSchedule(locatedItems);
          }}
        />
      </section>

      <section className="glass-card p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải lịch trình...
          </div>
        ) : (
          <ScheduleGrid
            items={items}
            onRemove={(id) => void removeScheduleItem(id)}
            onEdit={(item) => void openTrip(item)}
          />
        )}
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-3 text-base font-extrabold">Thêm ca thủ công</h2>
        <form onSubmit={addManual} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Tên môn / ca</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Giải Tích 2"
              className="h-11 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Loại</Label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as "study" | "work" })}
              className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 text-sm font-semibold"
            >
              <option value="study">Ca học</option>
              <option value="work">Ca làm thêm</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Thứ</Label>
            <select
              value={form.weekday}
              onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
              className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 text-sm font-semibold"
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Bắt đầu</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="h-11 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Kết thúc</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="h-11 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <AddressSearch
              label="Địa điểm"
              value={form.location}
              onTextChange={(location) =>
                setForm({ ...form, location, dest_lat: null, dest_lng: null })
              }
              onPick={(place) =>
                setForm({ ...form, location: place.address, dest_lat: place.lat, dest_lng: place.lng })
              }
              placeholder="Đại học Bách Khoa Hà Nội"
            />
          </div>
          <Button type="submit" className="h-11 rounded-2xl font-bold sm:col-span-2 lg:col-span-3">
            <CalendarPlus className="size-4" />
            Thêm vào lịch trình
          </Button>
        </form>
      </section>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Tổng quan hành trình</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-lg font-black text-primary">{selected.title}</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-bold">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {selected.location ?? "Chưa có địa điểm"}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold">
                  <Clock3 className="size-4 text-primary" />
                  {WEEKDAYS[selected.weekday - 1]} • {selected.start_time}–{selected.end_time}
                </p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    <span className="text-muted-foreground">Xuất phát: </span>
                    {(origin ?? home).address}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl font-bold" onClick={() => setEditOrigin((v) => !v)}>
                    <MapPin className="size-4" /> {editOrigin ? "Đóng" : "Điều chỉnh"}
                  </Button>
                </div>
                {editOrigin && (
                  <div className="mt-3 space-y-2">
                    <AddressSearch
                      label="Địa chỉ xuất phát"
                      value={originText}
                      showGps
                      onTextChange={setOriginText}
                      onPick={(place) => {
                        setOrigin(place);
                        setOriginText(place.address);
                        setEditOrigin(false);
                        void openTrip(selected, place);
                      }}
                    />
                    {origin && (
                      <Button type="button" variant="ghost" size="sm" className="font-bold" onClick={() => { setOrigin(null); setOriginText(""); setEditOrigin(false); void openTrip(selected, home); }}>
                        Dùng lại nơi ở mặc định
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {tripLoading ? (
                <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang kiểm tra lưu lượng giao thông Hà Nội...
                </p>
              ) : tripOverview ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border p-3 text-center">
                    <span className="block text-xl font-black text-primary">{tripOverview.distanceKm.toFixed(1)} km</span>
                    <span className="text-xs font-bold text-muted-foreground">Quãng đường</span>
                  </div>
                  <div className="rounded-2xl border border-border p-3 text-center">
                    <span className="block text-xl font-black text-primary">{tripOverview.minutes} phút</span>
                    <span className="text-xs font-bold text-muted-foreground">Thời gian dự kiến</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-bold text-muted-foreground">Thêm địa điểm để tính hành trình.</p>
              )}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl font-bold"
                  onClick={() => {
                    setEditing(selected);
                    setSelected(null);
                  }}
                >
                  <Pencil className="size-4" /> Chỉnh sửa
                </Button>
                <Button
                  type="button"
                  disabled={selected.dest_lat === null || selected.dest_lng === null}
                  className="h-11 rounded-2xl font-bold"
                  onClick={() =>
                    void navigate({
                      to: "/",
                      search: {
                        itemId: selected.id,
                        destAddress: selected.location ?? selected.title,
                        destLat: selected.dest_lat ?? undefined,
                        destLng: selected.dest_lng ?? undefined,
                        originAddress: origin?.address,
                        originLat: origin?.lat,
                        originLng: origin?.lng,
                      },
                    })
                  }
                >
                  <RouteIcon className="size-4" /> Xem chi tiết
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Sửa ca trong lịch</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold uppercase">Tên môn / ca</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="h-11 rounded-2xl bg-secondary/40 font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Loại</Label>
                <select
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({ ...editing, kind: e.target.value as "study" | "work" })
                  }
                  className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 text-sm font-semibold"
                >
                  <option value="study">Ca học</option>
                  <option value="work">Ca làm thêm</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Thứ</Label>
                <select
                  value={editing.weekday}
                  onChange={(e) => setEditing({ ...editing, weekday: Number(e.target.value) })}
                  className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 text-sm font-semibold"
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i + 1}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Bắt đầu</Label>
                <Input
                  type="time"
                  value={editing.start_time}
                  onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                  className="h-11 rounded-2xl bg-secondary/40 font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Kết thúc</Label>
                <Input
                  type="time"
                  value={editing.end_time}
                  onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                  className="h-11 rounded-2xl bg-secondary/40 font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <AddressSearch
                  label="Địa điểm"
                  value={editing.location ?? ""}
                  onTextChange={(location) =>
                    setEditing({ ...editing, location, dest_lat: null, dest_lng: null })
                  }
                  onPick={(place) =>
                    setEditing({
                      ...editing,
                      location: place.address,
                      dest_lat: place.lat,
                      dest_lng: place.lng,
                    })
                  }
                  placeholder="Đại học Bách Khoa Hà Nội"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl font-bold"
              onClick={() => {
                if (editing) void removeScheduleItem(editing.id);
                setEditing(null);
                toast.success("Đã xoá ca khỏi lịch");
              }}
            >
              Xoá ca
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl font-bold"
              onClick={async () => {
                if (!editing) return;
                const current = await resolveLocation(editing);
                setEditing(null);
                await updateScheduleItem(current.id, {
                  title: current.title.trim() || "Ca chưa đặt tên",
                  kind: current.kind,
                  weekday: current.weekday,
                  start_time: current.start_time,
                  end_time: current.end_time,
                  location: current.location?.trim() ? current.location.trim() : null,
                  dest_lat: current.dest_lat,
                  dest_lng: current.dest_lng,
                });
                toast.success("Đã lưu thay đổi");
              }}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
