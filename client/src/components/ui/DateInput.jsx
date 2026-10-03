import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];

function parseValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const PANEL_WIDTH = 256;

export default function DateInput({
  value,
  onChange,
  min,
  max,
  className,
  placeholder = "Pilih tanggal",
  title,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const selected = parseValue(value);
  const minDate = parseValue(min);
  const maxDate = parseValue(max);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) setViewDate(selected || new Date());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCoords = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8);
    setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
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

  const emit = (date) => {
    onChange?.({ target: { value: date ? toValue(date) : "" } });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDisabled = (date) => {
    if (minDate && date < minDate) return true;
    if (date > today) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handlePick = (date) => {
    if (isDisabled(date)) return;
    emit(date);
    setOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const leading = (firstOfMonth.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const displayLabel = selected
    ? `${selected.getDate()} ${MONTH_SHORT[selected.getMonth()]} ${selected.getFullYear()}`
    : placeholder;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 text-sm py-2 pl-8 pr-2 border border-border rounded-xs bg-input text-left transition-all",
          "focus:outline-none focus:border-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          selected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {displayLabel}
      </button>
      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

      {open && coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_WIDTH }}
            className="z-[100] rounded-sm border border-border bg-white shadow-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1 rounded-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-foreground">
                {MONTH_LABELS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1 rounded-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const disabledDay = isDisabled(date);
                const isSelected = isSameDay(date, selected);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => handlePick(date)}
                    className={cn(
                      "h-7 w-7 text-xs rounded-xs transition-colors flex items-center justify-center",
                      isSelected
                        ? "bg-primary text-white font-semibold"
                        : isToday
                          ? "border border-primary text-primary font-semibold"
                          : "text-foreground hover:bg-muted",
                      disabledDay && "opacity-30 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => handlePick(new Date())}
                disabled={isDisabled(new Date())}
                className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-30 disabled:no-underline disabled:cursor-not-allowed"
              >
                Hari ini
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    emit(null);
                    setOpen(false);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                  Hapus
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
