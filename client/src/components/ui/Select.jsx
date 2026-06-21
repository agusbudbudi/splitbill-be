import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Select({
  label,
  error,
  hint,
  className,
  id,
  required,
  children,
  ...props
}) {
  const selectId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "block w-full py-2 pl-3 pr-10 text-sm rounded-md border transition-all appearance-none cursor-pointer",
            "bg-input text-foreground",
            "focus:outline-none focus:border-primary",
            error ? "border-destructive" : "border-border",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground/70">
          <ChevronDown size={16} />
        </div>
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
