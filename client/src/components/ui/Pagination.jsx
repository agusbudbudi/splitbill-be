import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemName = "item",
}) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const btnBase = cn(
    "p-2 rounded-lg border border-border transition-all text-sm font-medium",
    "hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
  );

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
      {/* mobile */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className={btnBase}
        >
          Sebelumnya
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          className={btnBase}
        >
          Berikutnya
        </button>
      </div>

      {/* desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Halaman{" "}
          <span className="font-semibold text-foreground">{currentPage}</span>{" "}
          dari{" "}
          <span className="font-semibold text-foreground">{totalPages}</span>
          <span className="text-muted-foreground">
            {" "}
            &middot; {totalItems} {itemName}
          </span>
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className={btnBase}
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            className={btnBase}
            title="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
