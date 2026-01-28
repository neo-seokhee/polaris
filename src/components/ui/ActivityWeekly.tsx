interface ActivityWeeklyProps {
  title?: string;
  total?: string;
  data: number[];
  activeIndices?: number[];
  className?: string;
}

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export function ActivityWeekly({
  title = "Weekly Activity",
  total,
  data,
  activeIndices = [2, 3, 4],
  className = "",
}: ActivityWeeklyProps) {
  const maxValue = Math.max(...data);

  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        {total && (
          <span className="text-xs font-normal text-[var(--accent)]">
            {total}
          </span>
        )}
      </div>
      <div className="flex h-20 w-full items-end gap-2">
        {data.map((value, index) => (
          <div
            key={index}
            className={`flex-1 rounded-t transition-all ${
              activeIndices.includes(index)
                ? "bg-[var(--accent)]"
                : "bg-[var(--bg-tertiary)]"
            }`}
            style={{ height: `${(value / maxValue) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex w-full justify-between gap-2">
        {dayLabels.map((label, index) => (
          <span
            key={index}
            className="flex-1 text-center text-[10px] font-normal text-[var(--text-muted)]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
