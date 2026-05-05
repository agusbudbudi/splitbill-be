import { cn } from "../../lib/utils";

const variants = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

export default function Badge({ variant = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
