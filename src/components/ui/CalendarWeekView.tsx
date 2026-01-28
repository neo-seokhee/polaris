import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface WeekDay {
  day: string;
  date: number;
  isToday?: boolean;
  isActive?: boolean;
  events?: Array<{ color: string }>;
}

interface CalendarWeekViewProps {
  title?: string;
  days?: WeekDay[];
  onPrev?: () => void;
  onNext?: () => void;
  onDateSelect?: (date: number) => void;
  className?: string;
}

const defaultDays: WeekDay[] = [
  { day: "Mon", date: 1, events: [{ color: "var(--accent)" }] },
  { day: "Tue", date: 2, events: [{ color: "var(--success-alt)" }, { color: "var(--accent)" }] },
  { day: "Wed", date: 3, isActive: true, events: [{ color: "var(--accent)" }, { color: "var(--success-alt)" }, { color: "var(--accent)" }] },
  { day: "Thu", date: 4, isToday: true },
  { day: "Fri", date: 5 },
  { day: "Sat", date: 6 },
  { day: "Sun", date: 7 },
];

export function CalendarWeekView({
  title = "Jan 1 - Jan 7, 2024",
  days = defaultDays,
  onPrev,
  onNext,
  onDateSelect,
  className = "",
}: CalendarWeekViewProps) {
  return (
    <div
      className={`flex w-full flex-col gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-6 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-tertiary)]"
          >
            <ChevronLeft className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-tertiary)]"
          >
            <ChevronRight className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="flex w-full justify-between gap-1">
        {days.map((item) => (
          <button
            key={item.date}
            onClick={() => onDateSelect?.(item.date)}
            className="flex w-[62px] flex-col items-center gap-2"
          >
            <span
              className={`text-[11px] font-semibold ${
                item.isToday
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {item.day}
            </span>
            <div
              className={`flex h-[62px] w-[62px] items-center justify-center rounded-lg ${
                item.isToday
                  ? "bg-[var(--accent)]"
                  : item.isActive
                  ? "border border-[var(--border-primary)] bg-[var(--bg-tertiary)]"
                  : "border border-[var(--border-secondary)]"
              }`}
            >
              <span
                className={`text-base font-semibold ${
                  item.isToday
                    ? "text-[var(--text-on-dark)]"
                    : item.isActive
                    ? "text-[var(--text-primary)]"
                    : item.date === 6 || item.date === 7
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {item.date}
              </span>
            </div>
            {item.isToday ? (
              <span className="text-[9px] font-semibold text-[var(--accent)]">
                Today
              </span>
            ) : item.events && item.events.length > 0 ? (
              <div className="flex h-2 items-center justify-center gap-0.5">
                {item.events.map((event, i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
