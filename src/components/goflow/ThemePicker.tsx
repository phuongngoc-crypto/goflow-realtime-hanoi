import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Theme = { id: string; name: string; hue: number; swatch: string };

export const THEMES: Theme[] = [
  { id: "green", name: "Xanh lá", hue: 158, swatch: "oklch(0.43 0.125 158)" },
  { id: "blue", name: "Xanh dương", hue: 262, swatch: "oklch(0.43 0.125 262)" },
  { id: "red", name: "Đỏ", hue: 25, swatch: "oklch(0.43 0.125 25)" },
  { id: "orange", name: "Cam", hue: 50, swatch: "oklch(0.5 0.125 50)" },
  { id: "purple", name: "Tím", hue: 300, swatch: "oklch(0.43 0.125 300)" },
  { id: "pink", name: "Hồng", hue: 350, swatch: "oklch(0.48 0.125 350)" },
];

const KEY = "goflow.theme";

export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const h = t.hue;
  const r = document.documentElement.style;
  if (t.id === "green") {
    ["--primary", "--ring", "--primary-soft", "--secondary", "--secondary-foreground", "--accent", "--accent-foreground", "--foreground", "--background"].forEach((v) => r.removeProperty(v));
    return;
  }
  r.setProperty("--primary", `oklch(0.45 0.14 ${h})`);
  r.setProperty("--ring", `oklch(0.45 0.14 ${h})`);
  r.setProperty("--primary-soft", `oklch(0.67 0.16 ${h})`);
  r.setProperty("--secondary", `oklch(0.955 0.03 ${h})`);
  r.setProperty("--secondary-foreground", `oklch(0.31 0.09 ${h})`);
  r.setProperty("--accent", `oklch(0.86 0.12 ${h})`);
  r.setProperty("--accent-foreground", `oklch(0.22 0.065 ${h})`);
  r.setProperty("--foreground", `oklch(0.22 0.055 ${h})`);
  r.setProperty("--background", `oklch(0.975 0.012 ${h})`);
}

export default function ThemePicker() {
  const [current, setCurrent] = useState("green");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) ?? "green";
    setCurrent(saved);
    applyTheme(saved);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Đổi màu giao diện" className="rounded-2xl p-2 transition hover:bg-primary-foreground/10">
          <Palette className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[900] w-56 rounded-2xl">
        <p className="mb-2 text-xs font-black uppercase">Màu giao diện</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCurrent(t.id);
                localStorage.setItem(KEY, t.id);
                applyTheme(t.id);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-bold ${current === t.id ? "bg-secondary ring-2 ring-primary" : "hover:bg-secondary"}`}
            >
              <span className="size-6 rounded-full" style={{ background: t.swatch }} />
              {t.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
