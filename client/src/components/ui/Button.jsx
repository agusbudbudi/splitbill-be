import { cn } from "../../lib/utils";
import Spinner from "./Spinner";

const variants = {
  primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
  ghost: "bg-transparent hover:bg-muted text-foreground border border-border",
  danger: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
  outline: "bg-transparent border border-border text-foreground hover:bg-muted",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-sm transition-all duration-150",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? (
        <Spinner
          size="sm"
          className={
            variant === "primary" || variant === "danger"
              ? "text-white"
              : "text-current"
          }
        />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
