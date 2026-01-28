import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface CalendarMiniProps {
  month?: string;
  year?: number;
  selectedDate?: number;
  todayDate?: number;
  hasEventDates?: number[];
  onPrev?: () => void;
  onNext?: () => void;
  onDateSelect?: (date: number) => void;
  className?: string;
}

const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CalendarMini({
  month = "January",
  year = 2024,
  selectedDate = 4,
  todayDate = 4,
  hasEventDates = [3],
  onPrev,
  onNext,
  onDateSelect,
  className = "",
}: CalendarMiniProps) {
  const dates = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {month} {year}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)]"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)]"
          >
            <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="flex w-full justify-between gap-2">
        {weekDays.map((day) => (
          <span
            key={day}
            className="flex-1 text-center text-[11px] font-semibold text-[var(--text-muted)]"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="flex w-full justify-between gap-2">
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const hasEvent = hasEventDates.includes(date);
          const isWeekend = date === 1 || date === 7;

          return (
            <button
              key={date}
              onClick={() => onDateSelect?.(date)}
              className={`flex h-9 w-9 flex-col items-center justify-center rounded-md ${
                isSelected
                  ? "bg-[var(--accent)]"
                  : hasEvent
                  ? "bg-[var(--bg-tertiary)]"
                  : "bg-transparent"
              }`}
            >
              <span
                className={`text-[13px] ${
                  isSelected
                    ? "font-semibold text-[var(--text-on-dark)]"
                    : hasEvent
                    ? "font-semibold text-[var(--text-primary)]"
                    : isWeekend
                    ? "font-normal text-[var(--text-muted)]"
                    : "font-normal text-[var(--text-secondary)]"
                }`}
              >
                {date}
              </span>
              {hasEvent && !isSelected && (
                <div className="h-1 w-1 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
