import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { ShoppingBag, Calendar, User, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader,
  SearchInput, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  Avatar, Button, EmptyState, Pagination, Badge,
  StatCard
} from "../components/ui";
import { formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const getStatusBadge = (status) => {
  switch (status) {
    case "paid":
      return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
    case "pending":
      return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case "expired":
      return <Badge variant="neutral" className="gap-1"><AlertCircle className="h-3 w-3" /> Expired</Badge>;
    case "failed":
      return <Badge variant="danger" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export default function Orders() {
  usePageMeta(
    "Daftar Orders",
    "Kelola pesanan paket langganan dan status pembayarannya."
  );
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate]);

  const fetchOrders = useCallback(async (page, search, status, start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);

      const res = await apiFetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
        setTotalRevenue(data.data.totalRevenue || 0);
      } else {
        setError(data.message || "Gagal memuat data orders");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(currentPage, debouncedSearch, statusFilter, startDate, endDate);
  }, [currentPage, debouncedSearch, statusFilter, startDate, endDate, fetchOrders]);

  const colSpan = user.isAdmin ? 6 : 5;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Daftar Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola pesanan paket langganan dan status pembayarannya.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Pendapatan (Terfilter)"
          value={formatCurrency(totalRevenue)}
          icon={ShoppingBag}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Total Transaksi"
          value={totalItems}
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
        />
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari Order ID, Nama, atau Email..."
            className="max-w-xs w-full"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Status Dropdown */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="failed">Failed</option>
            </Select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all w-full sm:w-auto"
                title="Tanggal Mulai"
              />
              <span className="text-muted-foreground text-xs font-bold shrink-0">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all w-full sm:w-auto"
                title="Tanggal Akhir"
              />
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 shrink-0"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Order ID</Th>
              <Th>Tanggal</Th>
              <Th>Tipe</Th>
              {user.isAdmin && <Th>Pengguna</Th>}
              <Th>Total</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={colSpan + 1} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan + 1} className="text-center py-12 text-destructive">{error}</Td>
              </Tr>
            </Tbody>
          ) : orders.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={colSpan + 1} className="p-0">
                  <EmptyState
                    icon={ShoppingBag}
                    title="Tidak ada data orders"
                    description={debouncedSearch || statusFilter || startDate || endDate ? "Coba ubah filter atau kata kunci pencarian." : "Belum ada order tercatat."}
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {orders.map((order) => (
                <Tr key={order.id} className="group">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={order.user?.name || order.orderId} src={order.user?.image || order.user?.avatar} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate text-left"
                        >
                          {order.orderId}
                        </button>
                        <p className="text-xs text-muted-foreground uppercase">
                          {order.snapshot?.name || "Subscription"}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      {formatDate(order.createdAt)}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {order.type}
                    </span>
                  </Td>
                  {user.isAdmin && (
                    <Td>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{order.user?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.user?.email || ""}</p>
                        </div>
                      </div>
                    </Td>
                  )}
                  <Td>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(order.total_payment || order.amount)}
                    </span>
                  </Td>
                  <Td>
                    {getStatusBadge(order.status)}
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/orders/${order.orderId}`)}
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
            itemName="order"
          />
        )}
      </Card>
    </div>
  );
}
