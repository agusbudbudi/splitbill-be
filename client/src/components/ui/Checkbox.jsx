import { useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Checkbox({
  label,
  hint,
  error,
  className,
  id,
  checked = false,
  indeterminate = false,
  disabled,
  onChange,
  name,
  title,
  ...props
}) {
  const inputRef = useRef(null);
  const inputId =
    id || (label && typeof label === "string"
      ? label.toLowerCase().replace(/\s+/g, "-")
      : undefined);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const active = checked || indeterminate;

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <label
        htmlFor={inputId}
        title={title}
        className={cn(
          "group inline-flex items-center gap-2",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className="relative inline-flex h-4 w-4 flex-shrink-0">
          <input
            id={inputId}
            ref={inputRef}
            type="checkbox"
            name={name}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer absolute inset-0 h-full w-full m-0 opacity-0 cursor-[inherit]"
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-xs border-[1.5px] transition-colors",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
              active
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-white border-muted-foreground/60",
              !active && !disabled && "group-hover:border-primary",
              error && !active && "border-destructive"
            )}
          >
            {indeterminate ? (
              <Minus className="h-3 w-3" strokeWidth={3} />
            ) : checked ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : null}
          </span>
        </span>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
