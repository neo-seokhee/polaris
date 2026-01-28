interface ProgressCircularProps {
  percentage: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressCircular({
  percentage,
  label,
  size = 80,
  strokeWidth = 6,
  className = "",
}: ProgressCircularProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`flex w-[170px] flex-col items-center gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold text-[var(--accent)]">
            {percentage}%
          </span>
        </div>
      </div>
      <span className="text-xs font-normal text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}
