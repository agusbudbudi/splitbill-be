import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { User, CheckCircle, XCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  SearchInput,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableSkeleton,
  Avatar,
  EmptyState,
  Pagination,
  CrownBadge,
} from "../components/ui";
import { formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";

export default function Users() {
  usePageMeta(
    "Daftar Pengguna",
    "Kelola data pengguna dan pantau aktivitas akun di platform Split Bill.",
  );
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isVerified, setIsVerified] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
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

  const fetchUsers = useCallback(async (page, search, verified, subStatus) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (verified !== "") params.set("isVerified", verified);
      if (subStatus !== "") params.set("subscriptionStatus", subStatus);
      const res = await apiFetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Gagal memuat data pengguna");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearch, isVerified, subscriptionStatus);
  }, [
    currentPage,
    debouncedSearch,
    isVerified,
    subscriptionStatus,
    fetchUsers,
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Daftar Akun Pengguna
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola data pengguna dan pantau aktivitas akun di platform Split Bill.
        </p>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 py-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama atau email..."
            className="max-w-xs w-full"
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="px-3 py-2 rounded-sm border border-border text-xs"
              value={isVerified}
              onChange={(e) => {
                setIsVerified(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Verifikasi</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <select
              className="px-3 py-2 rounded-sm border border-border text-xs"
              value={subscriptionStatus}
              onChange={(e) => {
                setSubscriptionStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Langganan</option>
              <option value="active">Active</option>
              <option value="none">Belum Langganan</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Pengguna</Th>
              <Th>Email</Th>
              <Th className="text-center">Verified</Th>
              <Th className="text-center">Total Aktivitas</Th>
              <Th>Last Login</Th>
              <Th>Tanggal Daftar</Th>
              <Th></Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={7} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={7} className="text-center py-12 text-destructive">
                  {error}
                </Td>
              </Tr>
            </Tbody>
          ) : users.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={7} className="p-0">
                  <EmptyState
                    icon={User}
                    title="Tidak ada pengguna ditemukan"
                    description={
                      debouncedSearch
                        ? "Coba ubah kata kunci pencarian."
                        : "Belum ada pengguna terdaftar."
                    }
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/users/${user._id}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate block text-left w-full"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {user.name}
                            {user.subscriptionStatus === "active" && (
                              <CrownBadge size="sm" />
                            )}
                            {user.provider === "google" && (
                              <span
                                title="Daftar via Google"
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-200 shrink-0"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="w-3 h-3"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.63-.63z" fill="#FBBC05" />
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                </svg>
                              </span>
                            )}
                          </span>
                        </button>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {user._id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{user.email}</Td>
                  <Td className="text-center">
                    {user.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-success inline-block" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive inline-block" />
                    )}
                  </Td>
                  <Td className="text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      {user.splitBillCount}
                    </span>
                  </Td>
                  <Td className="text-muted-foreground text-xs">
                    {formatDateTime(user.lastLogin)}
                  </Td>
                  <Td className="text-muted-foreground text-xs">
                    {formatDateTime(user.createdAt)}
                  </Td>
                  <Td>
                    <button
                      onClick={() => navigate(`/users/${user._id}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
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
            itemName="pengguna"
          />
        )}
      </Card>
    </div>
  );
}
