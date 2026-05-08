import { Crown } from "lucide-react";

const SIZE_MAP = {
  sm: { padding: "3px", iconClass: "h-2.5 w-2.5" },
  md: { padding: "4px", iconClass: "h-3.5 w-3.5" },
  lg: { padding: "5px", iconClass: "h-4 w-4" },
};

/**
 * CrownBadge — circular golden crown icon for active subscribers.
 *
 * Props:
 *  - size: "sm" | "md" | "lg"  (default: "sm")
 *  - className: extra class names to append to the wrapper span
 *  - title: tooltip text (default: "Subscriber Aktif")
 */
export default function CrownBadge({ size = "sm", className = "", title = "Subscriber Aktif" }) {
  const { padding, iconClass } = SIZE_MAP[size] ?? SIZE_MAP.sm;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #ffe066, #f5a623)",
        padding,
      }}
      title={title}
      aria-label={title}
    >
      <Crown className={`${iconClass} text-white`} />
    </span>
  );
}
