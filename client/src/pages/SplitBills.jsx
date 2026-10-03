import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { ReceiptText, Users, ChevronRight, ChevronLeft, X, ImageOff, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader,
  SearchInput, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  EmptyState, Pagination, Badge, DateInput, ResetFiltersButton, StatCard,
} from "../components/ui";
import { formatDateShort, formatLastStep } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "editable", label: "Draft" },
  { value: "locked", label: "Finalized" },
];

const LAST_STEP_OPTIONS = [
  { value: "all", label: "Semua Last Step" },
  { value: "STEP_1", label: "Step 1" },
  { value: "STEP_2", label: "Step 2" },
  { value: "STEP_3", label: "Step 3" },
  { value: "FINALIZED", label: "Finalized" },
];

export default function SplitBills() {
  usePageMeta(
    "Riwayat Split Bill",
    "Lihat dan kelola semua rekaman split bill yang telah disimpan."
  );
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastStepFilter, setLastStepFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lightbox, setLightbox] = useState(null); // { images, index }
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        setLightbox((lb) => ({ ...lb, index: (lb.index + 1) % lb.images.length }));
      }
      if (e.key === "ArrowLeft") {
        setLightbox((lb) => ({
          ...lb,
          index: (lb.index - 1 + lb.images.length) % lb.images.length,
        }));
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, lastStepFilter, startDate, endDate]);

  const fetchSplitBills = useCallback(async (page, search, status, lastStep, start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (lastStep && lastStep !== "all") params.set("lastStep", lastStep);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      const res = await apiFetch(`/api/split-bills?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
        // totalAmount is only recomputed by the backend on page 1 (it's a sum
        // over the whole filtered set, unchanged across pages) — keep the
        // existing value on later pages instead of resetting it to 0.
        if (data.data.aggregate?.totalAmount !== null) {
          setTotalAmount(data.data.aggregate?.totalAmount ?? 0);
        }
      } else {
        setError(data.message || "Gagal memuat data split bill");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSplitBills(currentPage, debouncedSearch, statusFilter, lastStepFilter, startDate, endDate);
  }, [currentPage, debouncedSearch, statusFilter, lastStepFilter, startDate, endDate, fetchSplitBills]);

  const colSpan = user.isAdmin ? 7 : 6;
  const hasActiveFilters = statusFilter !== "all" || lastStepFilter !== "all" || startDate || endDate;

  const clearFilters = () => {
    setStatusFilter("all");
    setLastStepFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Riwayat Split Bill</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lihat dan kelola semua rekaman split bill yang telah disimpan.
          </p>
        </div>

        <StatCard
          compact
          title={`Total Keseluruhan (${totalItems} split bill)`}
          value={formatCurrency(totalAmount)}
          icon={Wallet}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari aktivitas, peserta, pemilik, atau ID..."
            className="max-w-xs w-full"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Status filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

            {/* Last Step filter */}
            <Select
              value={lastStepFilter}
              onChange={(e) => setLastStepFilter(e.target.value)}
            >
              {LAST_STEP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

            {/* Date range filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-36"
                title="Dari tanggal"
              />
              <span className="text-xs text-muted-foreground shrink-0">—</span>
              <DateInput
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-36"
                title="Sampai tanggal"
              />
            </div>

            {hasActiveFilters && (
              <ResetFiltersButton onClick={clearFilters} />
            )}
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Aktivitas</Th>
              <Th>Tanggal</Th>
              {user.isAdmin && <Th>Pemilik</Th>}
              <Th>Peserta</Th>
              <Th>Total Tagihan</Th>
              <Th>Status</Th>
              <Th>Last Step</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={colSpan} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan} className="text-center py-12 text-destructive">{error}</Td>
              </Tr>
            </Tbody>
          ) : records.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={ReceiptText}
                    title="Tidak ada data split bill"
                    description={
                      debouncedSearch || hasActiveFilters
                        ? "Coba ubah kata kunci atau hapus filter yang aktif."
                        : "Belum ada split bill tercatat."
                    }
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {records.map((record) => (
                <Tr key={record.id} className="group">
                  <Td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {(record.receiptImages || []).length === 0 ? (
                        <div className="h-8 w-8 flex-shrink-0 rounded-xs border border-dashed border-border flex items-center justify-center bg-muted/40 text-muted-foreground">
                          <ReceiptText className="h-3.5 w-3.5" />
                        </div>
                      ) : brokenImages[record.receiptImages[0].id] ? (
                        <div className="h-8 w-8 flex-shrink-0 rounded-xs border border-dashed border-border flex items-center justify-center bg-muted/40 text-muted-foreground">
                          <ImageOff className="h-3 w-3" />
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setLightbox({ images: record.receiptImages, index: 0 })
                          }
                          className="group relative h-8 w-8 flex-shrink-0 rounded-xs border border-border overflow-hidden bg-muted"
                          title="Lihat foto struk"
                        >
                          <img
                            src={record.receiptImages[0].url}
                            alt="Struk"
                            loading="lazy"
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [record.receiptImages[0].id]: true,
                              }))
                            }
                            className="h-full w-full object-cover"
                          />
                          {record.receiptImages.length > 1 && (
                            <span className="absolute bottom-0 right-0 px-1 rounded-tl-xs bg-black/70 text-white text-[9px] font-bold leading-tight">
                              +{record.receiptImages.length - 1}
                            </span>
                          )}
                        </button>
                      )}
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/split-bills/${record.id}`)}
                          className="text-sm font-semibold text-primary hover:underline underline-offset-2 transition-colors truncate text-left"
                        >
                          {record.activityName || "Aktivitas Tanpa Nama"}
                        </button>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{record.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">
                    <div className="text-xs">
                      {record.occurredAt ? formatDateShort(record.occurredAt) : "-"}
                    </div>
                  </Td>
                  {user.isAdmin && (
                    <Td>
                      <p className="text-sm font-medium text-foreground">{record.owner?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{record.owner?.email || ""}</p>
                    </Td>
                  )}
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      {(record.participants || []).length}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(record.summary?.total || 0)}
                    </span>
                  </Td>
                  <Td>
                    <Badge
                      variant={record.status === "editable" ? "warning" : "success"}
                      className="text-xs font-semibold"
                    >
                      {record.status === "editable" ? "DRAFT" : "FINALIZED"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant="neutral" className="font-mono font-normal">
                      {formatLastStep(record.last_step, record.status)}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>

        {!loading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemName="split bill"
          />
        )}
      </Card>

      {/* Fullscreen receipt photo viewer */}
      {lightbox && lightbox.images[lightbox.index] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>

          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lb) => ({
                    ...lb,
                    index: (lb.index - 1 + lb.images.length) % lb.images.length,
                  }));
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lb) => ({
                    ...lb,
                    index: (lb.index + 1) % lb.images.length,
                  }));
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Berikutnya"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {brokenImages[lightbox.images[lightbox.index].id] ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-2 text-white/70"
            >
              <ImageOff className="h-10 w-10" />
              <p className="text-sm">Foto struk gagal dimuat</p>
            </div>
          ) : (
            <img
              src={lightbox.images[lightbox.index].url}
              alt={`Struk ${lightbox.index + 1}`}
              onClick={(e) => e.stopPropagation()}
              onError={() =>
                setBrokenImages((prev) => ({
                  ...prev,
                  [lightbox.images[lightbox.index].id]: true,
                }))
              }
              className="max-h-[85vh] max-w-full object-contain rounded-sm animate-in fade-in zoom-in-95 duration-200"
            />
          )}

          {lightbox.images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xs bg-white/10 text-white text-xs font-semibold">
              {lightbox.index + 1} / {lightbox.images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
