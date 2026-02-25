interface ScheduleItemProps {
  time: string;
  period: "오전" | "오후";
  title: string;
  description?: string;
  color?: string;
  className?: string;
}

export function ScheduleItem({
  time,
  period,
  title,
  description,
  color = "var(--accent)",
  className = "",
}: ScheduleItemProps) {
  return (
    <div
      className={`flex w-full items-stretch gap-3 rounded-[10px] border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-4 ${className}`}
    >
      <div className="flex w-[60px] flex-col gap-0.5">
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {time}
        </span>
        <span className="text-[11px] font-normal text-[var(--text-muted)]">
          {period}
        </span>
      </div>
      <div
        className="w-0.5 self-stretch rounded-sm"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        {description && (
          <span className="text-xs font-normal text-[var(--text-secondary)]">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
