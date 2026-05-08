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
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-soft border border-border p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4",
        className,
      )}
    >
      <div className={cn("p-2 sm:p-3 rounded-sm flex-shrink-0", iconBg)}>
        <Icon className={cn("h-3 w-3 sm:h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </div>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <div className="text-lg sm:text-2xl font-black text-foreground mt-0.5 truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
