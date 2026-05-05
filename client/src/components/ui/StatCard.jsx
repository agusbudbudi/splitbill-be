import { cn } from "../../lib/utils";

export default function StatCard({ title, value, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", className }) {
  return (
    <div className={cn("bg-white rounded-lg shadow-soft border border-border p-5 flex items-center gap-4", className)}>
      <div className={cn("p-3 rounded-lg flex-shrink-0", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
