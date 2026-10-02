import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Clock3, Loader2, MapPin, Pencil, Route as RouteIcon, Trash2 } from "lucide-react";
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
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPicked, setBulkPicked] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    kind: "study" as "study" | "work",
    weekday: 1,
    weekdays: [1] as number[],
    start_time: "07:30",
    end_time: "09:10",
    note: "",
    start_date: "",
    end_date: "",
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
    if (!form.weekdays.length) {
      toast.error("Chọn ít nhất một thứ trong tuần");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    const base = await resolveLocation<Omit<ScheduleItem, "id">>({
      title: form.title.trim(),
      kind: form.kind,
      weekday: form.weekdays[0] ?? 1,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location.trim() || null,
      dest_lat: form.dest_lat,
      dest_lng: form.dest_lng,
      note: form.note.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    await addSchedule(form.weekdays.map((weekday) => ({ ...base, weekday })));
    setForm({ ...form, title: "", note: "", location: "", dest_lat: null, dest_lng: null });
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
        {!!items.length && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold">Sơ đồ lịch trình</h2>
              {bulkMode && (
                <p className="text-xs font-bold text-muted-foreground">
                  Bấm vào các ca trên sơ đồ để chọn · Đã chọn {bulkPicked.length} ca
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {bulkMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold"
                  onClick={() =>
                    setBulkPicked(bulkPicked.length === items.length ? [] : items.map((item) => item.id))
                  }
                >
                  {bulkPicked.length === items.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Button>
              )}
              <Button
                type="button"
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                className="rounded-xl font-bold"
                onClick={() => {
                  setBulkMode((current) => !current);
                  setBulkPicked([]);
                }}
              >
                {bulkMode ? "Xong" : "Chỉnh sửa hàng loạt"}
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải lịch trình...
          </div>
        ) : (
          <ScheduleGrid
            items={items}
            onRemove={(id) => void removeScheduleItem(id)}
            onEdit={(item) => void openTrip(item)}
            selectionMode={bulkMode}
            selectedIds={bulkPicked}
            onToggleSelect={(id) =>
              setBulkPicked((current) =>
                current.includes(id) ? current.filter((pickedId) => pickedId !== id) : [...current, id],
              )
            }
          />
        )}
      </section>

      {bulkMode && (
        <BulkEdit
          pickedCount={bulkPicked.length}
          onApply={async (patch) => {
            for (const id of bulkPicked) await updateScheduleItem(id, patch);
            toast.success(`Đã cập nhật ${bulkPicked.length} ca`);
            setBulkPicked([]);
            setBulkMode(false);
          }}
          onDelete={async () => {
            for (const id of bulkPicked) await removeScheduleItem(id);
            toast.success(`Đã xoá ${bulkPicked.length} ca`);
            setBulkPicked([]);
            setBulkMode(false);
          }}
        />
      )}

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
            <Label className="text-xs font-bold uppercase">Lặp lại vào các thứ</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => {
                const on = form.weekdays.includes(i + 1);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        weekdays: on ? form.weekdays.filter((w) => w !== i + 1) : [...form.weekdays, i + 1].sort(),
                      })
                    }
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40"}`}
                  >
                    {d.replace("Thứ ", "T").replace("Chủ Nhật", "CN")}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1 text-[11px] font-bold text-primary">
              <button type="button" onClick={() => setForm({ ...form, weekdays: [1, 2, 3, 4, 5] })}>T2–T6</button>
              <button type="button" onClick={() => setForm({ ...form, weekdays: [1, 2, 3, 4, 5, 6, 7] })}>Cả tuần</button>
            </div>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Từ ngày (tuỳ chọn)</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Đến ngày (tuỳ chọn)</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Ghi chú</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Phòng D9-301, nộp BTVN chương 2..." className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
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
                {(selected.start_date || selected.end_date) && (
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    Áp dụng: {selected.start_date ?? "…"} → {selected.end_date ?? "…"}
                  </p>
                )}
                {selected.note && <p className="mt-2 text-sm font-semibold">📝 {selected.note}</p>}
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
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Từ ngày</Label>
                <Input type="date" value={editing.start_date ?? ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value || null })} className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Đến ngày</Label>
                <Input type="date" value={editing.end_date ?? ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value || null })} className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold uppercase">Ghi chú</Label>
                <Input value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="Phòng học, BTVN..." className="h-11 rounded-2xl bg-secondary/40 font-semibold" />
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
                  note: current.note?.trim() ? current.note.trim() : null,
                  start_date: current.start_date || null,
                  end_date: current.end_date || null,
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

function BulkAddress({
  picked,
  onApply,
}: {
  picked: string[];
  onApply: (place: { address: string; lat: number; lng: number }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [place, setPlace] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="glass-card p-5">
      <div className="mb-3">
        <h2 className="text-base font-extrabold">Chỉnh địa chỉ hàng loạt</h2>
        <p className="text-xs font-bold text-muted-foreground">Đã chọn {picked.length} ca trên sơ đồ</p>
      </div>
      <AddressSearch
        label="Địa chỉ mới cho các ca đã chọn"
        value={text}
        onTextChange={(v) => {
          setText(v);
          setPlace(null);
        }}
        onPick={(p) => {
          setText(p.address);
          setPlace(p);
        }}
      />
      <Button
        type="button"
        disabled={!picked.length || !text.trim() || busy}
        className="mt-3 h-11 w-full rounded-2xl font-bold"
        onClick={async () => {
          setBusy(true);
          let target = place;
          if (!target) {
            const found = (await searchAddress(text, 1).catch(() => []))[0];
            target = found ? { address: text.trim(), lat: found.lat, lng: found.lng } : null;
          }
          if (!target) {
            toast.error("Không tìm thấy tọa độ địa chỉ này");
            setBusy(false);
            return;
          }
          await onApply(target);
          setBusy(false);
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
        Áp dụng cho {picked.length} ca
      </Button>
    </section>
  );
}
