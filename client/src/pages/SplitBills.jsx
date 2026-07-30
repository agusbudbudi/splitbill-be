import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { Receipt, Calendar, Users, ChevronRight, ChevronLeft, X, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader,
  SearchInput, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  Avatar, Button, EmptyState, Pagination,
} from "../components/ui";
import { formatDate, formatLastStep } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "editable", label: "Draft" },
  { value: "locked", label: "Finalized" },
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
  }, [statusFilter, startDate, endDate]);

  const fetchSplitBills = useCallback(async (page, search, status, start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      const res = await apiFetch(`/api/split-bills?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
        setTotalAmount(data.data.aggregate?.totalAmount ?? 0);
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
    fetchSplitBills(currentPage, debouncedSearch, statusFilter, startDate, endDate);
  }, [currentPage, debouncedSearch, statusFilter, startDate, endDate, fetchSplitBills]);

  const colSpan = user.isAdmin ? 9 : 8;
  const hasActiveFilters = statusFilter !== "all" || startDate || endDate;

  const clearFilters = () => {
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Riwayat Split Bill</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lihat dan kelola semua rekaman split bill yang telah disimpan.
        </p>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari aktivitas, peserta, pemilik, atau ID..."
              className="w-56 shrink-0"
            />

            {/* Status filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shrink-0"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

            {/* Divider */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Date range filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Tanggal:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all w-36"
                title="Dari tanggal"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all w-36"
                title="Sampai tanggal"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-auto"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </CardHeader>



        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Aktivitas</Th>
              <Th>Tanggal</Th>
              <Th>Peserta</Th>
              <Th>Struk</Th>
              {user.isAdmin && <Th>Pemilik</Th>}
              <Th>Status</Th>
              <Th>Total Tagihan</Th>
              <Th>Last Step</Th>
              <Th className="text-right">Aksi</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={colSpan} rows={8} squareCols={[3]} />
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
                    icon={Receipt}
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
                    <div className="flex items-center gap-3">
                      <Avatar name={record.activityName} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/split-bills/${record.id}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate text-left"
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
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      {record.occurredAt ? formatDate(record.occurredAt) : "-"}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      {(record.participants || []).length} Orang
                    </div>
                  </Td>
                  <Td>
                    {(record.receiptImages || []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : brokenImages[record.receiptImages[0].id] ? (
                      <div className="h-7 w-7 rounded-xs border border-dashed border-border flex items-center justify-center bg-muted/40 text-muted-foreground">
                        <ImageOff className="h-3 w-3" />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setLightbox({ images: record.receiptImages, index: 0 })
                        }
                        className="group relative h-7 w-7 rounded-xs border border-border overflow-hidden bg-muted"
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
                          <span className="absolute bottom-0 right-0 px-1 rounded-tl bg-black/70 text-white text-[9px] font-bold leading-tight">
                            +{record.receiptImages.length - 1}
                          </span>
                        )}
                      </button>
                    )}
                  </Td>
                  {user.isAdmin && (
                    <Td>
                      <p className="text-sm font-medium text-foreground">{record.owner?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{record.owner?.email || ""}</p>
                    </Td>
                  )}
                  <Td>
                    {record.status === "editable" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                        DRAFT
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        FINALIZED
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(record.summary?.total || 0)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                      {formatLastStep(record.last_step, record.status)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/split-bills/${record.id}`)}
                    >
                      Detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Td>
                </Tr>
              ))}

              {/* Aggregate total row */}
              <Tr className="hover:bg-muted/20 bg-muted/10 border-t-2 border-border">
                <Td colSpan={user.isAdmin ? 6 : 5} className="py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total keseluruhan ({totalItems} split bill
                    {hasActiveFilters || debouncedSearch ? ", filter aktif" : ""})
                  </span>
                </Td>
                <Td className="py-3">
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </Td>
                <Td colSpan={2} />
              </Tr>
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
              className="max-h-[85vh] max-w-full object-contain rounded-lg animate-in fade-in zoom-in-95 duration-200"
            />
          )}

          {lightbox.images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
              {lightbox.index + 1} / {lightbox.images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
