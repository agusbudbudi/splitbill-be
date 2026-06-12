import { useState } from "react";
import { cn } from "../../lib/utils";

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

export default function Avatar({ name = "?", src, size = "md", className }) {
  const [hasError, setHasError] = useState(false);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn("rounded-full object-cover flex-shrink-0", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0",
        "bg-primary/10 text-primary",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
