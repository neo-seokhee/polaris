interface GoalCardProps {
  title: string;
  progress: number;
  className?: string;
}

export function GoalCard({ title, progress, className = "" }: GoalCardProps) {
  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex w-full items-center justify-between">
          <span className="text-xs font-normal text-[var(--text-secondary)]">
            Progress
          </span>
          <span className="text-xs font-semibold text-[var(--accent)]">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-sm bg-[var(--bg-tertiary)]">
          <div
            className="h-1.5 rounded-sm bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
