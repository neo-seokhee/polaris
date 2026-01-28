import { StickyNote } from "lucide-react-native";

interface MemoCardProps {
  content: string;
  date: string;
  className?: string;
}

export function MemoCard({ content, date, className = "" }: MemoCardProps) {
  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-[10px] bg-[var(--bg-tertiary)] p-4 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <StickyNote className="h-4 w-4 text-[var(--accent)]" />
        <span className="text-[11px] font-normal text-[var(--text-muted)]">
          {date}
        </span>
      </div>
      <p className="text-[13px] font-normal text-[var(--text-secondary)]">
        {content}
      </p>
    </div>
  );
}
