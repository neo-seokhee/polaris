import { Plus } from "lucide-react-native";

interface TimeSlotEvent {
  title: string;
  duration: string;
  description?: string;
  color: string;
}

interface TimeSlot {
  time: string;
  event?: TimeSlotEvent;
}

interface CalendarDailyTimetableProps {
  dayName?: string;
  date?: string;
  slots?: TimeSlot[];
  onAddEvent?: () => void;
  className?: string;
}

const defaultSlots: TimeSlot[] = [
  { time: "08:00" },
  {
    time: "09:00",
    event: {
      title: "Team Standup",
      duration: "09:00 - 09:30 (30 min)",
      description: "Daily sync with the team",
      color: "var(--accent)",
    },
  },
  { time: "10:00" },
  { time: "11:00" },
  {
    time: "14:00",
    event: {
      title: "Client Meeting",
      duration: "14:00 - 15:00 (1 hour)",
      color: "var(--success-alt)",
    },
  },
  { time: "15:00" },
  { time: "16:00" },
];

export function CalendarDailyTimetable({
  dayName = "Thursday",
  date = "January 4, 2024",
  slots = defaultSlots,
  onAddEvent,
  className = "",
}: CalendarDailyTimetableProps) {
  return (
    <div
      className={`flex w-full flex-col gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-6 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-[var(--text-muted)]">
            {dayName}
          </span>
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {date}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-[var(--bg-tertiary)] px-3.5 py-2">
            <span className="text-xs font-semibold text-[var(--accent)]">
              Today
            </span>
          </div>
          <button
            onClick={onAddEvent}
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 py-2"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--text-on-dark)]" />
            <span className="text-xs font-semibold text-[var(--text-on-dark)]">
              Add Event
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        {slots.map((slot, index) => (
          <div
            key={slot.time}
            className={`flex w-full gap-3 py-3 ${
              index < slots.length - 1
                ? "border-b border-[var(--border-secondary)]"
                : ""
            }`}
          >
            <span className="w-12 text-xs font-semibold text-[var(--text-muted)]">
              {slot.time}
            </span>
            {slot.event ? (
              <div
                className="flex flex-1 flex-col gap-1 rounded-lg border-2 p-3"
                style={{
                  borderColor: slot.event.color,
                  backgroundColor: `${slot.event.color}20`,
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: slot.event.color }}
                >
                  {slot.event.title}
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {slot.event.duration}
                </span>
                {slot.event.description && (
                  <span className="text-xs font-normal text-[#8B8B90]">
                    {slot.event.description}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
