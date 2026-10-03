import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function ResetFiltersButton({ onClick, count, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors shrink-0",
        className
      )}
    >
      <X className="h-3.5 w-3.5" />
      Reset{count ? ` (${count})` : ""}
    </button>
  );
}
