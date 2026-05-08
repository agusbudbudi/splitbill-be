import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { ShoppingBag, Calendar, User, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader,
  SearchInput,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  Avatar, Button, EmptyState, Pagination, Badge
} from "../components/ui";
import { formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";

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
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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

  const fetchOrders = useCallback(async (page, search) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
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
    fetchOrders(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchOrders]);

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

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari Order ID, Nama, atau Email..."
            className="max-w-xs w-full"
          />
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
                    description={debouncedSearch ? "Coba ubah kata kunci pencarian." : "Belum ada order tercatat."}
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
                      <Avatar name={order.orderId} size="sm" />
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
                      {formatCurrency(order.amount)}
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
