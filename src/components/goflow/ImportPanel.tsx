import { useRef, useState } from "react";
import { Camera, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractScheduleFromImage } from "@/lib/schedule-ocr.functions";
import { Button } from "@/components/ui/button";
import type { ScheduleItem } from "@/lib/goflow";

type NewItem = Omit<ScheduleItem, "id">;

const WEEKDAY_WORDS: Array<[RegExp, number]> = [
  [/chủ\s*nhật|cn|sunday|sun/i, 7],
  [/thứ\s*7|thứ\s*bảy|t7|saturday|sat/i, 6],
  [/thứ\s*6|thứ\s*sáu|t6|friday|fri/i, 5],
  [/thứ\s*5|thứ\s*năm|t5|thursday|thu/i, 4],
  [/thứ\s*4|thứ\s*tư|t4|wednesday|wed/i, 3],
  [/thứ\s*3|thứ\s*ba|t3|tuesday|tue/i, 2],
  [/thứ\s*2|thứ\s*hai|t2|monday|mon/i, 1],
];

function parseWeekday(raw: unknown): number {
  const text = String(raw ?? "").trim();
  const num = Number(text);
  if (Number.isInteger(num) && num >= 1 && num <= 7) return num;
  for (const [re, wd] of WEEKDAY_WORDS) if (re.test(text)) return wd;
  return 1;
}

function parseTime(raw: unknown, fallback: string): string {
  const text = String(raw ?? "").trim();
  const m = text.match(/(\d{1,2})[:h.](\d{2})/);
  if (m) return `${m[1]!.padStart(2, "0")}:${m[2]}`;
  const onlyHour = text.match(/^(\d{1,2})$/);
  if (onlyHour) return `${onlyHour[1]!.padStart(2, "0")}:00`;
  return fallback;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([k]) => k.toLowerCase().trim().includes(key));
    if (hit && hit[1] !== undefined && hit[1] !== "") return hit[1];
  }
  return undefined;
}

export default function ImportPanel({
  onImport,
}: {
  onImport: (items: NewItem[], mode: "replace" | "append") => Promise<void> | void;
}) {
  const imageInput = useRef<HTMLInputElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleImage(file: File) {
    setScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });
      const { items } = await extractScheduleFromImage({ data: { dataUrl } });
      if (!items.length) {
        toast.error("Chưa nhận diện được ca nào, thử ảnh rõ hơn nhé!");
        return;
      }
      await onImport(
        items.map((i) => ({
          title: i.title,
          kind: i.kind,
          weekday: i.weekday,
          start_time: i.start_time,
          end_time: i.end_time,
          location: i.location,
          dest_lat: null,
          dest_lng: null,
        })),
        "append",
      );
      toast.success(`Đã nạp ${items.length} ca từ ảnh thời khoá biểu`);
    } catch {
      toast.error("Không đọc được ảnh, bạn thử lại sau nhé");
    } finally {
      setScanning(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  async function handleSheet(file: File) {
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("empty");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
        defval: "",
      });
      const items: NewItem[] = rows
        .map((row): NewItem | null => {
          const title = String(pick(row, ["mon", "tên", "ten", "title", "subject"]) ?? "").trim();
          if (!title) return null;
          const kindRaw = String(pick(row, ["loai", "loại", "kind", "type"]) ?? "").toLowerCase();
          return {
            title,
            kind: /lam|làm|work|shift/.test(kindRaw) ? ("work" as const) : ("study" as const),
            weekday: parseWeekday(pick(row, ["thu", "thứ", "weekday", "day"])),
            start_time: parseTime(pick(row, ["bat dau", "bắt đầu", "start", "giờ vào"]), "07:30"),
            end_time: parseTime(pick(row, ["ket thuc", "kết thúc", "end", "giờ ra"]), "09:10"),
            location: String(pick(row, ["dia diem", "địa điểm", "phong", "phòng", "location"]) ?? "")
              .trim() || null,
            dest_lat: null,
            dest_lng: null,
          };
        })
        .filter((v): v is NewItem => v !== null);

      if (!items.length) {
        toast.error("File chưa có dòng nào hợp lệ. Hãy tải file mẫu để đối chiếu.");
        return;
      }
      await onImport(items, "replace");
      toast.success(`Đã nạp ${items.length} ca từ file`);
    } catch {
      toast.error("Không đọc được file, hãy kiểm tra định dạng .xlsx / .xls / .csv");
    } finally {
      setParsing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const rows = [
      {
        "Môn / Ca": "Giải Tích 2",
        "Loại (hoc/lam)": "hoc",
        Thứ: "Thứ 2",
        "Bắt đầu": "07:30",
        "Kết thúc": "09:10",
        "Địa điểm": "Đại học Bách Khoa Hà Nội",
      },
      {
        "Môn / Ca": "Làm thêm quán cafe",
        "Loại (hoc/lam)": "lam",
        Thứ: "Thứ 7",
        "Bắt đầu": "17:00",
        "Kết thúc": "21:00",
        "Địa điểm": "Trung Văn, Nam Từ Liêm",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LichTrinh");
    XLSX.writeFile(wb, "GoFlow-mau-lich-trinh.xlsx");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && void handleImage(e.target.files[0])}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && void handleSheet(e.target.files[0])}
      />

      <Button
        type="button"
        onClick={() => imageInput.current?.click()}
        disabled={scanning}
        className="h-auto flex-col gap-1 rounded-3xl py-4 font-bold"
      >
        {scanning ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Camera className="size-5" />
        )}
        <span>{scanning ? "Đang đọc ảnh..." : "Quét ảnh TKB"}</span>
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() => fileInput.current?.click()}
        disabled={parsing}
        className="h-auto flex-col gap-1 rounded-3xl py-4 font-bold"
      >
        {parsing ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <FileSpreadsheet className="size-5" />
        )}
        <span>{parsing ? "Đang nạp..." : "Tải Excel / CSV"}</span>
        <span className="text-[11px] font-semibold opacity-80">.xlsx • .xls • .csv</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => void downloadTemplate()}
        className="h-auto flex-col gap-1 rounded-3xl py-4 font-bold"
      >
        <Download className="size-5" />
        <span>Tải file mẫu</span>
      </Button>
    </div>
  );
}
