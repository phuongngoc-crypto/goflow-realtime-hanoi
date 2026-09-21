import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { reverseGeocode, searchAddress, type Suggestion } from "@/lib/goflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onTextChange: (text: string) => void;
  onPick: (place: { address: string; lat: number; lng: number }) => void;
  label: string;
  placeholder?: string;
  showGps?: boolean;
};

export default function AddressSearch({
  value,
  onTextChange,
  onPick,
  label,
  placeholder,
  showGps = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) {
      setOpen(false);
      setSuggestions([]);
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const results = await searchAddress(q);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(s: Suggestion) {
    typed.current = false;
    onTextChange(s.address);
    onPick({ address: s.address, lat: s.lat, lng: s.lng });
    setOpen(false);
  }

  function useGps() {
    if (!navigator.geolocation) {
      toast.error("Thiết bị không hỗ trợ định vị");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          typed.current = false;
          onTextChange(address);
          onPick({ address, lat: latitude, lng: longitude });
          toast.success("Đã lấy vị trí hiện tại của bạn");
        } catch {
          typed.current = false;
          const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          onTextChange(fallback);
          onPick({ address: fallback, lat: latitude, lng: longitude });
        } finally {
          setGpsBusy(false);
        }
      },
      () => {
        setGpsBusy(false);
        toast.error("Không lấy được GPS. Hãy cho phép quyền truy cập vị trí.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <Input
            value={value}
            onChange={(e) => {
              typed.current = true;
              onTextChange(e.target.value);
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder ?? "Nhập số nhà, ngõ, ngách, tên đường..."}
            className="h-12 rounded-2xl border-border bg-secondary/40 pl-9 pr-9 text-sm font-semibold"
          />
          {busy && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>
        {showGps && (
          <Button
            type="button"
            variant="secondary"
            onClick={useGps}
            disabled={gpsBusy}
            className="h-12 shrink-0 gap-2 rounded-2xl px-4 font-bold"
          >
            {gpsBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LocateFixed className="size-4" />
            )}
            <span className="hidden sm:inline">GPS</span>
          </Button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-[900] mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-float">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-secondary"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{s.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
