import { cn } from "../../lib/utils";

export function Table({ className, children }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("min-w-full", className)}>{children}</table>
    </div>
  );
}

export function Thead({ className, children }) {
  return (
    <thead className={cn("border-b border-border bg-[#f8faff]", className)}>
      {children}
    </thead>
  );
}

export function Tbody({ className, children }) {
  return (
    <tbody className={cn("divide-y divide-border bg-white", className)}>
      {children}
    </tbody>
  );
}

export function Tr({ className, children, ...props }) {
  return (
    <tr
      className={cn("transition-colors hover:bg-muted/40", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Th({ className, children, ...props }) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }) {
  return (
    <td
      className={cn("px-5 py-3.5 text-sm text-foreground", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableSkeleton({ cols = 4, rows = 5 }) {
  return (
    <tbody className="divide-y divide-border bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div
                className="h-4 bg-muted rounded-lg animate-pulse"
                style={{ width: `${50 + ((i * cols + j) * 17) % 40}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
