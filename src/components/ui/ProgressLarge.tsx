interface ProgressLargeProps {
  title: string;
  value: string;
  progress: number;
  className?: string;
}

export function ProgressLarge({
  title,
  value,
  progress,
  className = "",
}: ProgressLargeProps) {
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <span className="text-xs font-normal text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <div className="h-2 w-full rounded bg-[var(--bg-tertiary)]">
        <div
          className="h-2 rounded bg-[var(--accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
