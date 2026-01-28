import { Trophy, Check } from "lucide-react-native";

interface MilestoneCardProps {
  title: string;
  date: string;
  completed?: boolean;
  className?: string;
}

export function MilestoneCard({
  title,
  date,
  completed = true,
  className = "",
}: MilestoneCardProps) {
  return (
    <div
      className={`flex w-full items-center gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--bg-tertiary)]">
        <Trophy className="h-6 w-6 text-[var(--accent)]" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <span className="text-xs font-normal text-[var(--text-muted)]">
          {date}
        </span>
      </div>
      {completed && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success-alt)]">
          <Check className="h-3.5 w-3.5 text-[var(--text-on-dark)]" />
        </div>
      )}
    </div>
  );
}
