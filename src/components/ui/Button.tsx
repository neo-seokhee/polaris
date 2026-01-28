import { LucideIcon } from "lucide-react-native";

interface ButtonProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  icon: Icon,
  variant = "primary",
  onClick,
  className = "",
}: ButtonProps) {
  const baseStyles = "flex items-center gap-2 rounded-lg px-5 py-3 text-[13px] font-semibold transition-opacity hover:opacity-90";

  const variants = {
    primary: "bg-[var(--accent)] text-[var(--text-on-dark)]",
    secondary: "border border-[var(--border-primary)] bg-transparent text-[var(--text-primary)]",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && (
        <Icon
          className={`h-4 w-4 ${
            variant === "primary"
              ? "text-[var(--text-on-dark)]"
              : "text-[var(--text-secondary)]"
          }`}
        />
      )}
      {children}
    </button>
  );
}
