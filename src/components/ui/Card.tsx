interface CardProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, badge, children, className = "" }: CardProps) {
  return (
    <div
      className={`flex w-full flex-col gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        {badge && (
          <div className="rounded-full bg-[var(--accent-bg)] px-2.5 py-1">
            <span className="text-[10px] font-semibold text-[var(--accent)]">
              {badge}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
