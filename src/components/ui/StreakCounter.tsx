import { Flame } from "lucide-react-native";

interface StreakCounterProps {
  days: number;
  description?: string;
  className?: string;
}

export function StreakCounter({
  days,
  description = "Keep going! You're on fire 🔥",
  className = "",
}: StreakCounterProps) {
  return (
    <div
      className={`flex w-full items-center gap-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--accent)]">
        <Flame className="h-6 w-6 text-[var(--text-on-dark)]" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          {days} Day Streak
        </span>
        <span className="text-xs font-normal text-[var(--text-secondary)]">
          {description}
        </span>
      </div>
    </div>
  );
}
