import { Check } from "lucide-react-native";

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({
  checked = false,
  label,
  onChange,
  className = "",
}: CheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
          checked
            ? "bg-[var(--accent)]"
            : "border-2 border-[var(--border-primary)] bg-transparent"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-[var(--text-on-dark)]" />}
      </button>
      {label && (
        <span
          className={`text-sm font-normal ${
            checked ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
