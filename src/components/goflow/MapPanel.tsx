import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TOMTOM_KEY } from "@/lib/goflow";

type Props = {
  home: { lat: number; lng: number; address: string };
  dest: { lat: number; lng: number; address: string } | null;
  points: Array<[number, number]>;
  focus?: { lat: number; lng: number; nonce: number } | null;
  onPick?: (lat: number, lng: number) => void;
};

function pin(color: string, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:${color};box-shadow:0 6px 16px rgba(29,78,216,.35);border:3px solid #fff;font-size:16px">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function MapPanel({ home, dest, points, focus, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const homeMarker = useRef<L.Marker | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [home.lat, home.lng],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer(
      `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
      { maxZoom: 20, attribution: "&copy; TomTom" },
    ).addTo(map);
    // Lớp phủ giao thông thời gian thực (dữ liệu GPS thật của TomTom)
    L.tileLayer(
      `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
      { maxZoom: 20, opacity: 0.95 },
    ).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      pickRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!homeMarker.current) {
      homeMarker.current = L.marker([home.lat, home.lng], {
        icon: pin("#1D4ED8", "🏠"),
      }).addTo(map);
    } else {
      homeMarker.current.setLatLng([home.lat, home.lng]);
    }
    homeMarker.current.bindPopup(`<b>Nơi ở</b><br/>${home.address}`);
  }, [home.lat, home.lng, home.address]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!dest) {
      destMarker.current?.remove();
      destMarker.current = null;
      return;
    }
    if (!destMarker.current) {
      destMarker.current = L.marker([dest.lat, dest.lng], {
        icon: pin("#BAE6FD", "🎯"),
      }).addTo(map);
    } else {
      destMarker.current.setLatLng([dest.lat, dest.lng]);
    }
    destMarker.current.bindPopup(`<b>Điểm hẹn</b><br/>${dest.address}`);
  }, [dest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeLine.current?.remove();
    routeLine.current = null;
    if (points.length < 2) return;
    routeLine.current = L.polyline(points, {
      color: "#1D4ED8",
      weight: 6,
      opacity: 0.9,
      lineJoin: "round",
    }).addTo(map);
    map.fitBounds(routeLine.current.getBounds(), { padding: [34, 34] });
  }, [points]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo([focus.lat, focus.lng], 16, { duration: 1.1 });
  }, [focus]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-2xl border border-border bg-card/90 px-3 py-2 text-[11px] font-semibold shadow-soft backdrop-blur">
        🔴 Tắc nghẽn • 🟠 Ùn ứ • 🟢 Thông thoáng
      </div>
    </div>
  );
}
