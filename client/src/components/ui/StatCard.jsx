import { cn } from "../../lib/utils";
import Tooltip from "./Tooltip";

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  className,
  tooltip,
  compact = false,
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-sm shadow-soft border border-border flex",
        compact ? "items-start p-2.5 gap-2.5" : "items-center p-3.5 sm:p-5 gap-3 sm:gap-4",
        className,
      )}
    >
      <div className={cn("rounded-xs flex-shrink-0", compact ? "p-1.5" : "p-2 sm:p-3", iconBg)}>
        <Icon className={cn(compact ? "h-3 w-3" : "h-3 w-3 sm:h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </div>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <div
          className={cn(
            "font-black text-foreground mt-0.5 truncate",
            compact ? "text-base" : "text-lg sm:text-2xl"
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
