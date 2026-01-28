import { Clock, MapPin } from "lucide-react-native";

interface CalendarEventCardProps {
  title: string;
  time: string;
  location?: string;
  priority?: "high" | "normal";
  color?: string;
  className?: string;
}

export function CalendarEventCard({
  title,
  time,
  location,
  priority,
  color = "var(--accent)",
  className = "",
}: CalendarEventCardProps) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-[10px] border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-4 ${className}`}
    >
      <div
        className="h-full w-1 self-stretch rounded-sm"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </span>
          {priority === "high" && (
            <div className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5">
              <span className="text-[9px] font-semibold text-[var(--accent)]">
                High Priority
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {time}
            </span>
          </div>
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                {location}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
