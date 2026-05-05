import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className,
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "block w-full pl-9 py-2 text-sm rounded-sm border border-border",
          "bg-input text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:border-primary transition-all",
          value ? "pr-8" : "pr-3",
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
