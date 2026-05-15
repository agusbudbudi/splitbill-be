import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

const ToastContext = createContext(null);

let toastId = 0;

const config = {
  success: {
    icon: CheckCircle,
    className: "border-l-[3px] border-success",
    iconClass: "text-success",
  },
  error: {
    icon: AlertCircle,
    className: "border-l-[3px] border-destructive",
    iconClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-l-[3px] border-warning",
    iconClass: "text-warning",
  },
  info: {
    icon: Info,
    className: "border-l-[3px] border-primary",
    iconClass: "text-primary",
  },
};

function ToastItem({ toast, onDismiss }) {
  const {
    icon: Icon,
    className,
    iconClass,
  } = config[toast.type] || config.info;
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 bg-white rounded-sm shadow-soft border border-border",
        "animate-in slide-in-from-top-4 fade-in duration-300",
        "min-w-[320px] max-w-md",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", iconClass)} />
      <p className="flex-1 text-sm text-foreground leading-snug">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, type = "info", duration = 4000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  // Hack to support both const { toast } = useToast() and const toast = useToast()
  toast.toast = toast;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none items-center">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
