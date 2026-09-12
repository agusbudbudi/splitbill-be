import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, Users, Receipt, ChevronRight, X } from "lucide-react";
import {
  Card, CardHeader,
  SearchInput, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  Button, EmptyState, Pagination,
} from "../components/ui";
import { formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "done", label: "Selesai" },
];

const BUCKET_TYPE_LABELS = {
  trip: "Trip",
  hangout: "Hangout",
  event: "Event",
  office: "Kantor",
  household: "Rumah Tangga",
  other: "Lainnya",
};

export default function SplitLater() {
  usePageMeta(
    "Riwayat Split Later",
    "Lihat semua bucket split later yang sudah dibuat pengguna."
  );
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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

  const fetchBuckets = useCallback(async (page, search, status, start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      const res = await apiFetch(`/api/split-later/buckets?${params}`);
      const data = await res.json();
      if (data.success) {
        setBuckets(data.buckets);
        setCurrentPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
      } else {
        setError(data.message || "Gagal memuat data split later");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuckets(currentPage, debouncedSearch, statusFilter, startDate, endDate);
  }, [currentPage, debouncedSearch, statusFilter, startDate, endDate, fetchBuckets]);

  const colSpan = user.isAdmin ? 8 : 7;
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
        <h1 className="text-xl font-bold text-foreground">Riwayat Split Later</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lihat semua bucket split later yang sudah dibuat pengguna.
        </p>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari judul bucket, peserta, pemilik..."
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
              <Th>Bucket</Th>
              <Th>Tipe</Th>
              <Th>Peserta</Th>
              <Th>Struk</Th>
              {user.isAdmin && <Th>Pemilik</Th>}
              <Th>Status</Th>
              <Th>Dibuat</Th>
              <Th className="text-right">Aksi</Th>
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
          ) : buckets.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={Clock}
                    title="Tidak ada data split later"
                    description={
                      debouncedSearch || hasActiveFilters
                        ? "Coba ubah kata kunci atau hapus filter yang aktif."
                        : "Belum ada bucket split later yang dibuat."
                    }
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {buckets.map((bucket) => (
                <Tr key={bucket.id} className="group">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-base flex-shrink-0">
                        {bucket.emoji || "🗂️"}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/split-later/${bucket.id}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate text-left"
                        >
                          {bucket.title || "Bucket Tanpa Nama"}
                        </button>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{bucket.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                      {BUCKET_TYPE_LABELS[bucket.bucketType] || bucket.bucketType}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      {(bucket.participants || []).length} Orang
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
                      {(bucket.receipts || []).length}
                    </div>
                  </Td>
                  {user.isAdmin && (
                    <Td>
                      <p className="text-sm font-medium text-foreground">{bucket.owner?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{bucket.owner?.email || ""}</p>
                    </Td>
                  )}
                  <Td>
                    {bucket.status === "active" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                        AKTIF
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        SELESAI
                      </span>
                    )}
                  </Td>
                  <Td className="text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      {bucket.createdAt ? formatDate(bucket.createdAt) : "-"}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/split-later/${bucket.id}`)}
                    >
                      Detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
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
            itemName="bucket"
          />
        )}
      </Card>
    </div>
  );
}
