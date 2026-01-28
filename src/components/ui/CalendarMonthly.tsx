import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface DayCell {
  date: number;
  isToday?: boolean;
  isActive?: boolean;
  isWeekend?: boolean;
  events?: Array<{ color: string }>;
}

interface CalendarMonthlyProps {
  month?: string;
  year?: number;
  days?: DayCell[];
  onPrev?: () => void;
  onNext?: () => void;
  onDateSelect?: (date: number) => void;
  className?: string;
}

const weekHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const defaultDays: DayCell[] = [
  { date: 1, isWeekend: true },
  { date: 2, events: [{ color: "var(--success-alt)" }] },
  { date: 3, isActive: true, events: [{ color: "var(--accent)" }, { color: "var(--success-alt)" }] },
  { date: 4, isToday: true },
  { date: 5 },
  { date: 6, isWeekend: true },
  { date: 7, isWeekend: true },
];

export function CalendarMonthly({
  month = "January",
  year = 2024,
  days = defaultDays,
  onPrev,
  onNext,
  onDateSelect,
  className = "",
}: CalendarMonthlyProps) {
  return (
    <div
      className={`flex w-full flex-col gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-6 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {month} {year}
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
        {weekHeaders.map((header) => (
          <span
            key={header}
            className="w-[60px] text-center text-[11px] font-semibold text-[var(--text-muted)]"
          >
            {header}
          </span>
        ))}
      </div>

      <div className="flex w-full justify-between gap-1">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => onDateSelect?.(day.date)}
            className={`flex h-16 w-[60px] flex-col gap-1 rounded-md p-2 ${
              day.isToday
                ? "bg-[var(--accent)]"
                : day.isActive
                ? "border border-[var(--border-primary)] bg-[var(--bg-tertiary)]"
                : "border border-[var(--border-secondary)]"
            }`}
          >
            <span
              className={`text-sm font-medium ${
                day.isToday
                  ? "font-semibold text-[var(--text-on-dark)]"
                  : day.isActive
                  ? "font-semibold text-[var(--text-primary)]"
                  : day.isWeekend
                  ? "text-[var(--text-muted)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {day.date}
            </span>
            {day.isToday && (
              <span className="text-[9px] font-semibold text-[var(--text-on-dark)]">
                Today
              </span>
            )}
            {!day.isToday && day.events && day.events.length > 0 && (
              <div className="flex gap-0.5">
                {day.events.map((event, i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
