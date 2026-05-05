import { useState, useEffect, useCallback } from "react";
import { Receipt, Calendar, Users, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader,
  SearchInput,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  Avatar, Button, EmptyState, Pagination,
} from "../components/ui";
import { formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

export default function SplitBills() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce: reset page to 1 and apply search after 400ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSplitBills = useCallback(async (page, search) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/split-bills?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
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
    fetchSplitBills(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchSplitBills]);

  const colSpan = user.isAdmin ? 6 : 5;

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
        <CardHeader className="py-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari aktivitas, peserta, atau pemilik..."
            className="max-w-xs w-full"
          />
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Aktivitas</Th>
              <Th>Tanggal</Th>
              <Th>Peserta</Th>
              {user.isAdmin && <Th>Pemilik</Th>}
              <Th>Total Tagihan</Th>
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
          ) : records.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={Receipt}
                    title="Tidak ada data split bill"
                    description={debouncedSearch ? "Coba ubah kata kunci pencarian." : "Belum ada split bill tercatat."}
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
                          {record.activityName}
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
                      {formatDate(record.occurredAt)}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      {record.participants.length} Orang
                    </div>
                  </Td>
                  {user.isAdmin && (
                    <Td>
                      <p className="text-sm font-medium text-foreground">{record.owner?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{record.owner?.email || ""}</p>
                    </Td>
                  )}
                  <Td>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(record.summary.total)}
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
    </div>
  );
}
