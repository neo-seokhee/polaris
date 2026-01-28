import { Flame } from "lucide-react-native";

interface TodoItemProps {
  title: string;
  dueTime?: string;
  isActive?: boolean;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  onFocus?: () => void;
  className?: string;
}

export function TodoItem({
  title,
  dueTime,
  isActive = false,
  checked = false,
  onCheck,
  onFocus,
  className = "",
}: TodoItemProps) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-4 py-3 ${className}`}
    >
      <button
        type="button"
        onClick={() => onCheck?.(!checked)}
        className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
          checked
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--border-primary)] bg-transparent"
        }`}
      />
      <div className="flex flex-1 flex-col gap-1">
        <span
          className={`text-sm font-medium ${
            checked
              ? "text-[var(--text-muted)] line-through"
              : "text-[var(--text-primary)]"
          }`}
        >
          {title}
        </span>
        {dueTime && (
          <span className="text-xs font-normal text-[var(--text-muted)]">
            {dueTime}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onFocus}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
          isActive ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)]"
        }`}
      >
        <Flame
          className={`h-[18px] w-[18px] ${
            isActive ? "text-[var(--text-on-dark)]" : "text-[var(--text-muted)]"
          }`}
        />
      </button>
    </div>
  );
}
