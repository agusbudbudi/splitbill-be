import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, Users, ReceiptText } from "lucide-react";
import {
  Card, CardHeader,
  SearchInput, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  EmptyState, Pagination, Badge, DateInput, ResetFiltersButton,
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

  const colSpan = user.isAdmin ? 7 : 6;
  const hasActiveFilters = statusFilter !== "all" || startDate || endDate;

  const clearFilters = () => {
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Riwayat Split Later</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lihat semua bucket split later yang sudah dibuat pengguna.
        </p>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari judul bucket, peserta, pemilik..."
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
              <Th>Bucket</Th>
              <Th>Tipe</Th>
              <Th>Peserta</Th>
              <Th>Struk</Th>
              {user.isAdmin && <Th>Pemilik</Th>}
              <Th>Status</Th>
              <Th>Dibuat</Th>
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
                          className="text-sm font-semibold text-primary hover:underline underline-offset-2 transition-colors truncate text-left"
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
                    <Badge variant="neutral" className="font-mono">
                      {BUCKET_TYPE_LABELS[bucket.bucketType] || bucket.bucketType}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      {(bucket.participants || []).length} Orang
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ReceiptText className="h-3.5 w-3.5 flex-shrink-0" />
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
                    <Badge
                      variant={bucket.status === "active" ? "warning" : "success"}
                      className="text-xs font-semibold"
                    >
                      {bucket.status === "active" ? "AKTIF" : "SELESAI"}
                    </Badge>
                  </Td>
                  <Td className="text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      {bucket.createdAt ? formatDate(bucket.createdAt) : "-"}
                    </div>
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
