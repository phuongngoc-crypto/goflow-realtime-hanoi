import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ScheduleGrid from "@/components/goflow/ScheduleGrid";
import ImportPanel from "@/components/goflow/ImportPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoflowData } from "@/hooks/useGoflowData";
import { WEEKDAYS, type ScheduleItem } from "@/lib/goflow";

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
  const { items, loading, addSchedule, replaceSchedule, removeScheduleItem } =
    useGoflowData();
  const [form, setForm] = useState({
    title: "",
    kind: "study" as "study" | "work",
    weekday: 1,
    start_time: "07:30",
    end_time: "09:10",
    location: "",
  });

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const item: Omit<ScheduleItem, "id"> = {
      title: form.title.trim(),
      kind: form.kind,
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location.trim() || null,
      dest_lat: null,
      dest_lng: null,
    };
    await addSchedule([item]);
    setForm({ ...form, title: "", location: "" });
    toast.success("Đã thêm vào lịch trình");
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <h1 className="text-xl font-black sm:text-2xl">Lịch trình tuần này</h1>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-3 text-lg font-black">Tải lên thời khóa biểu trong tuần của bạn</h2>
        <ImportPanel
          onImport={async (newItems, mode) => {
            if (mode === "replace") await replaceSchedule(newItems);
            else await addSchedule(newItems);
          }}
        />
      </section>

      <section className="glass-card p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải lịch trình...
          </div>
        ) : (
          <ScheduleGrid items={items} onRemove={(id) => void removeScheduleItem(id)} />
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
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Địa điểm</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Đại học Bách Khoa Hà Nội"
              className="h-11 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <Button type="submit" className="h-11 rounded-2xl font-bold sm:col-span-2 lg:col-span-3">
            <CalendarPlus className="size-4" />
            Thêm vào lịch trình
          </Button>
        </form>
      </section>
    </main>
  );
}
