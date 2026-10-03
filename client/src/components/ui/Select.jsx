import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

function getOptions(children) {
  return Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === "option")
    .map((child) => ({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled,
    }));
}

export default function Select({
  label,
  error,
  hint,
  className,
  id,
  required,
  children,
  value,
  onChange,
  disabled,
  placeholder,
  name,
  ...props
}) {
  const selectId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const options = getOptions(children);
  const selected = options.find((o) => String(o.value) === String(value));

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const updateCoords = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updateCoords();
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  const handlePick = (opt) => {
    if (opt.disabled) return;
    onChange?.({ target: { name, value: opt.value } });
    setOpen(false);
  };

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
      <div className={cn("relative", className)}>
        <button
          id={selectId}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "block w-full py-2 pl-3 pr-10 text-sm rounded-xs border transition-all text-left cursor-pointer whitespace-nowrap truncate",
            "bg-input text-foreground",
            "focus:outline-none focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-destructive" : "border-border"
          )}
          {...props}
        >
          {selected ? selected.label : (placeholder ?? "")}
        </button>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground/70">
          <ChevronDown size={16} />
        </div>

        {open &&
          coords &&
          createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
              }}
              className="z-[100] max-h-64 overflow-y-auto rounded-xs border border-border bg-white shadow-lg py-1"
            >
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handlePick(opt)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted",
                      opt.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
