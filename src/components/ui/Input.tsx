import { LucideIcon, Search } from "lucide-react-native";

interface InputProps {
  placeholder?: string;
  icon?: LucideIcon;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Input({
  placeholder = "Search...",
  icon: Icon = Search,
  value,
  onChange,
  className = "",
}: InputProps) {
  return (
    <div
      className={`flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3.5 py-3 ${className}`}
    >
      <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 bg-transparent text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[#4A4A4E] focus:outline-none"
      />
    </div>
  );
}
