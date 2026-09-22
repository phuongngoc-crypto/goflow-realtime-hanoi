import { Trash2 } from "lucide-react";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  WEEKDAYS,
  isoWeekday,
  toMinutes,
  type ScheduleItem,
} from "@/lib/goflow";

const HOUR_HEIGHT = 58;

export default function ScheduleGrid({
  items,
  onRemove,
  onEdit,
}: {
  items: ScheduleItem[];
  onRemove?: (id: string) => void;
  onEdit?: (item: ScheduleItem) => void;
}) {
  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
    (_, i) => GRID_START_HOUR + i,
  );
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;
  const today = isoWeekday(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1.5">
          <div />
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`rounded-2xl px-2 py-2 text-center text-xs font-bold ${
                today === i + 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1.5">
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute -translate-y-2 text-[11px] font-bold text-muted-foreground"
                style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {WEEKDAYS.map((day, index) => {
            const weekday = index + 1;
            const dayItems = items.filter((i) => i.weekday === weekday);
            return (
              <div
                key={day}
                className="relative rounded-2xl border border-border bg-card/60"
                style={{ height: gridHeight }}
              >
                {hours.slice(1).map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {dayItems.map((item) => {
                  const start = toMinutes(item.start_time);
                  const end = Math.max(start + 30, toMinutes(item.end_time));
                  const top = ((start - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = ((end - start) / 60) * HOUR_HEIGHT;
                  const study = item.kind !== "work";
                  return (
                    <div
                      key={item.id}
                      role={onEdit ? "button" : undefined}
                      tabIndex={onEdit ? 0 : undefined}
                      onClick={onEdit ? () => onEdit(item) : undefined}
                      title={onEdit ? "Bấm để sửa ca này" : undefined}
                      className={`group absolute left-1 right-1 overflow-hidden rounded-xl border-2 px-1.5 py-1 text-left text-[11px] leading-tight shadow-soft ${
                        onEdit ? "cursor-pointer hover:brightness-95" : ""
                      } ${
                        study
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-accent-foreground bg-accent text-accent-foreground"
                      }`}
                      style={{ top: Math.max(0, top), height }}
                    >
                      <p className="font-extrabold">{item.start_time}</p>
                      <p className="truncate font-bold">{item.title}</p>
                      {item.location && (
                        <p className="truncate opacity-75">{item.location}</p>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.id);
                          }}
                          aria-label="Xoá ca"
                          className="absolute right-1 top-1 hidden rounded-full bg-card p-1 group-hover:block"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold">
          <span className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-md border-2 border-primary bg-primary/20" />
            Ca học
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-md border-2 border-accent-foreground bg-accent" />
            Ca làm thêm
          </span>
        </div>
      </div>
    </div>
  );
}
