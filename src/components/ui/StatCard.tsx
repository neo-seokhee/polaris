import { TrendingUp, TrendingDown } from "lucide-react-native";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend = "up",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex w-[170px] flex-col gap-2 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-5 ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-[32px] font-semibold text-[var(--accent)]">
        {value}
      </span>
      {change && (
        <div className="flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-[var(--success-alt)]" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-[var(--error)]" />
          )}
          <span
            className={`text-xs font-semibold ${
              trend === "up"
                ? "text-[var(--success-alt)]"
                : "text-[var(--error)]"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}
