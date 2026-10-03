import { cn } from "../../lib/utils";

const variants = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export default function Badge({ variant = "neutral", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center px-2.5 py-0.5 rounded-xs border text-xs font-semibold whitespace-nowrap",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
