import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import {
  User,
  CheckCircle,
  XCircle,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  X,
  Send,
  Activity,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  SearchInput,
  Select,
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
  Modal,
  ModalBody,
  ModalFooter,
  Tooltip,
  useToast,
} from "../components/ui";
import { formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";

/** Renders a sort icon for a column header based on current sort state */
function SortIcon({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1 inline-block" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-primary ml-1 inline-block" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary ml-1 inline-block" />;
}

/** Styled clickable table header with sort support */
function SortableTh({ column, label, sortBy, sortOrder, onSort, className = "" }) {
  return (
    <Th className={className}>
      <button
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-0.5 hover:text-primary transition-colors group"
      >
        <span className={`group-hover:text-primary transition-colors ${sortBy === column ? "text-primary font-bold" : ""}`}>
          {label}
        </span>
        <SortIcon column={column} sortBy={sortBy} sortOrder={sortOrder} />
      </button>
    </Th>
  );
}

/** "Belum login" fallback for null Last Login */
function LastLoginCell({ value }) {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 italic">
        <Clock className="h-3.5 w-3.5" />
        Belum login
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{formatDateTime(value)}</span>;
}

/** Total Aktivitas cell with unit + tooltip */
function AktivitasCell({ count }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
      <Activity className="h-3.5 w-3.5 text-primary/70" />
      {count}
      <span className="text-xs font-normal text-muted-foreground">split bill</span>
      <Tooltip content="Jumlah total Split Bill yang pernah dibuat oleh pengguna ini di semua waktu.">
        <span />
      </Tooltip>
    </span>
  );
}

export default function Users() {
  usePageMeta(
    "Daftar Pengguna",
    "Kelola data pengguna dan pantau aktivitas akun di platform Split Bill.",
  );
  const navigate = useNavigate();
  const toast = useToast();

  // ── Filter & Search State ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isVerified, setIsVerified] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Sort State ─────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // ── Pagination & Data State ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Debounce: reset page to 1 and apply search after 400ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(
    async (page, search, verified, subStatus, prov, from, to, sby, sorder) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: 10, sortBy: sby, sortOrder: sorder });
        if (search) params.set("search", search);
        if (verified !== "") params.set("isVerified", verified);
        if (subStatus !== "") params.set("subscriptionStatus", subStatus);
        if (prov !== "") params.set("provider", prov);
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);
        const res = await apiFetch(`/api/users?${params}`);
        const data = await res.json();
        if (data.success) {
          setUsers(data.data.users);
          setCurrentPage(data.data.pagination.currentPage);
          setTotalPages(data.data.pagination.totalPages);
          setTotalItems(data.data.pagination.totalItems);
          // Clear selection on new fetch to avoid stale refs
          setSelectedIds(new Set());
        } else {
          setError(data.message || "Gagal memuat data pengguna");
        }
      } catch {
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUsers(
      currentPage,
      debouncedSearch,
      isVerified,
      subscriptionStatus,
      provider,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    );
  }, [
    currentPage,
    debouncedSearch,
    isVerified,
    subscriptionStatus,
    provider,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    fetchUsers,
  ]);

  // ── Sort handler ───────────────────────────────────────────────────────
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // ── Selection handlers ─────────────────────────────────────────────────
  const isAllSelected = users.length > 0 && users.every((u) => selectedIds.has(u._id));
  const isIndeterminate = users.some((u) => selectedIds.has(u._id)) && !isAllSelected;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.delete(u._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.add(u._id));
        return next;
      });
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedUsers = users.filter((u) => selectedIds.has(u._id));
  const selectedEmails = selectedUsers.map((u) => u.email);

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkCampaignRedirect = async () => {
    if (selectedEmails.length === 0) return;
    setCreatingCampaign(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          initializeDraft: true,
          segment: "specific_emails",
          specificEmails: selectedEmails,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ message: "Draft kampanye berhasil dibuat.", type: "success" });
        navigate(`/campaigns/${json.data._id}`);
      } else {
        toast({ message: json.error || "Gagal membuat draft kampanye.", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan jaringan.", type: "error" });
    } finally {
      setCreatingCampaign(false);
    }
  };

  // ── Active filter count badge ──────────────────────────────────────────
  const activeFilterCount = [isVerified, subscriptionStatus, provider, dateFrom, dateTo].filter(Boolean).length;

  const resetFilters = () => {
    setIsVerified("");
    setSubscriptionStatus("");
    setProvider("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Daftar Akun Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola data pengguna dan pantau aktivitas akun di platform Split Bill.
        </p>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        {/* ── Toolbar ── */}
        <CardHeader className="flex flex-col gap-3 py-4">
          {/* Row 1: search + filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama atau email..."
              className="max-w-xs w-full"
            />
            <div className="flex flex-wrap items-center gap-2">
              {/* Verifikasi */}
              <Select
                value={isVerified}
                onChange={(e) => { setIsVerified(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Semua Verifikasi</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </Select>

              {/* Langganan */}
              <Select
                value={subscriptionStatus}
                onChange={(e) => { setSubscriptionStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Semua Langganan</option>
                <option value="active">Active</option>
                <option value="none">Belum Langganan</option>
                <option value="expired">Expired</option>
              </Select>

              {/* Provider */}
              <Select
                value={provider}
                onChange={(e) => { setProvider(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Semua Provider</option>
                <option value="google">Google</option>
                <option value="credentials">Email/Password</option>
              </Select>

              {/* Reset filter badge */}
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-sm text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* Row 2: date range filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Tanggal Daftar:</span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Dari</label>
              <input
                type="date"
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">s/d</label>
              <input
                type="date"
                className="text-sm py-2 px-3 border border-border rounded-sm bg-input text-foreground focus:outline-none focus:border-primary transition-all"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors underline"
              >
                Hapus
              </button>
            )}
          </div>
        </CardHeader>

        {/* ── Bulk action bar (#17) ── */}
        {selectedIds.size > 0 && (
          <div className="px-5 py-2.5 bg-primary/5 border-y border-primary/20 flex items-center gap-3 animate-in slide-in-from-top-1 duration-200">
            <span className="text-sm font-semibold text-primary">
              {selectedIds.size} pengguna dipilih
            </span>
            <button
              onClick={handleBulkCampaignRedirect}
              disabled={creatingCampaign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creatingCampaign ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Membuat Draft...
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Kirim Email (Campaign)
                </>
              )}
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors ml-auto"
            >
              <X className="h-3.5 w-3.5" />
              Batalkan
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              {/* Checkbox column (#17) */}
              <Th className="w-10 text-center">
                <input
                  type="checkbox"
                  className="rounded border-border accent-primary cursor-pointer"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleAll}
                  disabled={loading || users.length === 0}
                  title="Pilih semua di halaman ini"
                />
              </Th>
              <SortableTh column="name" label="Pengguna" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <Th>Email</Th>
              <Th className="text-center">Verified</Th>
              {/* Total Aktivitas (#18) */}
              <SortableTh
                column="splitBillCount"
                label="Total Aktivitas"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="text-center"
              />
              {/* Last Login sortable (#16) */}
              <SortableTh column="lastLoginAt" label="Last Login" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              {/* Tanggal Daftar sortable (#16) */}
              <SortableTh column="createdAt" label="Tanggal Daftar" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <Th />
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={8} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={8} className="text-center py-12 text-destructive">
                  {error}
                </Td>
              </Tr>
            </Tbody>
          ) : users.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={8} className="p-0">
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
              {users.map((user) => {
                const isSelected = selectedIds.has(user._id);
                return (
                  <Tr
                    key={user._id}
                    className={isSelected ? "bg-primary/5 hover:bg-primary/10" : ""}
                  >
                    {/* Checkbox (#17) */}
                    <Td className="text-center w-10">
                      <input
                        type="checkbox"
                        className="rounded border-border accent-primary cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleOne(user._id)}
                      />
                    </Td>

                    {/* Pengguna */}
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} src={user.image} size="sm" />
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
                                  <svg viewBox="0 0 24 24" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg">
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

                    {/* Email */}
                    <Td className="text-muted-foreground">{user.email}</Td>

                    {/* Verified */}
                    <Td className="text-center">
                      {user.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-success inline-block" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive inline-block" />
                      )}
                    </Td>

                    {/* Total Aktivitas (#18) */}
                    <Td className="text-center">
                      <AktivitasCell count={user.splitBillCount} />
                    </Td>

                    {/* Last Login — null-safe (#15) */}
                    <Td>
                      <LastLoginCell value={user.lastLoginAt} />
                    </Td>

                    {/* Tanggal Daftar */}
                    <Td className="text-muted-foreground text-xs">
                      {formatDateTime(user.createdAt)}
                    </Td>

                    {/* Action */}
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
                );
              })}
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
