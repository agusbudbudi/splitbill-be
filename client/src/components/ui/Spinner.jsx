import { cn } from "../../lib/utils";

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export default function Spinner({ size = "md", className }) {
  return (
    <div
      className={cn(
        "rounded-full animate-spin border-current border-t-transparent",
        sizes[size],
        className
      )}
    />
  );
}
