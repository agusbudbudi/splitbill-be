import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemName = "items",
}) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 mt-4"
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        borderTop: "1px solid var(--border)",
        borderRadius: "0 0 1.2rem 1.2rem",
      }}
    >
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-30"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-30"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Showing page{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {currentPage}
            </span>{" "}
            of{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {totalPages}
            </span>{" "}
            ({totalItems} total {itemName})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
