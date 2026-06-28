import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Scan,
  Receipt,
  CheckCircle,
  XCircle,
  Users,
  Package,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { formatDate, formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";
import {
  Badge,
  Button,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
  CrownBadge,
  Avatar,
  useToast,
  Pagination,
} from "../components/ui";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const TOTAL_FREE_SCAN_QUOTA = 5;

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0 pt-0.5">
        {label}
      </span>
      <div className="text-sm font-medium text-foreground text-right">
        {children}
      </div>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [splitBills, setSplitBills] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalTagihan, setTotalTagihan] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchUser = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}?splitBillsPage=${page}&splitBillsLimit=5`);
      const data = await res.json();
      if (data.success) {
        setUserData(data.data.user);
        setSplitBills(data.data.splitBills);
        setTotalTagihan(data.data.totalTagihan ?? 0);
        setOrders(data.data.orders || []);

        const pag = data.data.splitBillsPagination;
        if (pag) {
          setCurrentPage(pag.currentPage);
          setTotalPages(pag.totalPages);
          setTotalItems(pag.totalItems);
        }
      } else {
        setError(data.error || data.message || "Gagal mengambil data pengguna");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser(currentPage);
  }, [currentPage, fetchUser]);

  const handleAdminAction = async (action) => {
    if (!window.confirm(`Apakah Anda yakin ingin melakukan aksi ini?`)) return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ message: data.message, type: "success" });
        fetchUser(currentPage);
      } else {
        toast({ message: data.message || "Gagal melakukan aksi", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan sistem", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <User className="h-10 w-10" />
        </div>
        <p className="text-destructive font-semibold">
          {error || "Data tidak ditemukan"}
        </p>
        <Button variant="ghost" onClick={() => navigate("/users")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        onBack={() => navigate(-1)}
        backLabel="Back"
        title={
          <span className="inline-flex items-center gap-3">
            <Avatar name={userData.name} src={userData.image} size="md" className="ring-2 ring-white/20" />
            <span className="inline-flex items-center gap-2">
              {userData.name}
              {userData.subscriptionStatus === "active" && (
                <CrownBadge size="lg" />
              )}
              {userData.provider === "google" && (
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
          </span>
        }
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {userData.email}
            </span>
            <span className="flex items-center gap-1.5">
              {userData.isVerified ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {userData.isVerified ? "Terverifikasi" : "Belum Verifikasi"}
            </span>
          </>
        }
        statLabel="Total Split Bill"
        statValue={`${totalItems} aktivitas`}
      />

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Split bill history & Order history */}
        <div className="xl:col-span-3 space-y-6">
          {/* Split Bill History */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-primary" />
              Riwayat Split Bill
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden">
              {splitBills.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Belum ada split bill"
                  description="Pengguna ini belum membuat aktivitas split bill."
                />
              ) : (
                <>
                  <Table>
                    <Thead>
                      <Tr className="hover:bg-transparent">
                        <Th>Aktivitas</Th>
                        <Th>Tanggal</Th>
                        <Th className="text-center">Peserta</Th>
                        <Th>Status</Th>
                        <Th>Last Step</Th>
                        <Th className="text-right">Total Tagihan</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {splitBills.map((bill) => (
                        <Tr key={bill.id}>
                          <Td>
                            <div>
                              <a
                                href={`/split-bills/${bill.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-primary hover:underline text-left leading-snug"
                              >
                                {bill.activityName || "Aktivitas Tanpa Nama"}
                              </a>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                #{bill.id.slice(-6)}
                              </p>
                            </div>
                          </Td>
                          <Td className="text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(bill.occurredAt)}
                          </Td>
                          <Td className="text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {bill.participants?.length ?? 0}
                            </span>
                          </Td>
                          <Td>
                            {bill.status === "editable" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                Draft
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Finalize
                              </span>
                            )}
                          </Td>
                          <Td>
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                              {(() => {
                                const step = bill.last_step || (bill.status === "locked" ? "FINALIZED" : "");
                                if (!step) return "—";
                                if (step === "FINALIZED") return "Finalized";
                                return step.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                              })()}
                            </span>
                          </Td>
                          <Td className="text-right font-semibold text-sm text-foreground whitespace-nowrap">
                            {formatCurrency(bill.summary?.total)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemName="aktivitas"
                  />
                </>
              )}
            </div>

            {splitBills.length > 0 && (
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Total Keseluruhan Tagihan
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {formatCurrency(totalTagihan)}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Order History */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-warning" />
              Riwayat Pembelian & Transaksi
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden">
              {orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Belum ada transaksi"
                  description="Pengguna ini belum memiliki riwayat pembelian paket langganan."
                />
              ) : (
                <Table>
                  <Thead>
                    <Tr className="hover:bg-transparent">
                      <Th>Order ID</Th>
                      <Th>Tanggal</Th>
                      <Th>Tipe</Th>
                      <Th>Total</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Aksi</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {orders.map((order) => (
                      <Tr key={order.id}>
                        <Td>
                          <div>
                            <button
                              onClick={() => navigate(`/orders/${order.orderId}`)}
                              className="text-sm font-semibold text-primary hover:underline text-left leading-snug"
                            >
                              {order.orderId}
                            </button>
                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                              {order.snapshot?.name || "Subscription"}
                            </p>
                          </div>
                        </Td>
                        <Td className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-muted-foreground capitalize">
                            {order.type}
                          </span>
                        </Td>
                        <Td className="font-semibold text-sm text-foreground whitespace-nowrap">
                          {formatCurrency(order.total_payment || order.amount)}
                        </Td>
                        <Td>
                          {order.status === "paid" ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.status === "pending" ? (
                            <Badge variant="warning">Pending</Badge>
                          ) : order.status === "expired" ? (
                            <Badge variant="neutral">Expired</Badge>
                          ) : (
                            <Badge variant="danger">Failed</Badge>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/orders/${order.orderId}`)}
                          >
                            Detail
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </section>
        </div>

        {/* Right: User info + Subscription + Scan Quota + Admin Actions */}
        <div className="xl:col-span-2 space-y-6">
          {/* User info card */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-success" />
              Informasi Pengguna
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft px-4">
              <InfoRow label="Nama">
                <span className="inline-flex items-center gap-1.5">
                  {userData.name}
                  {userData.subscriptionStatus === "active" && (
                    <CrownBadge size="sm" />
                  )}
                </span>
              </InfoRow>
              <InfoRow label="Email">
                <span className="break-all">{userData.email}</span>
              </InfoRow>
              <InfoRow label="Status">
                {userData.isVerified ? (
                  <Badge variant="success">Terverifikasi</Badge>
                ) : (
                  <Badge variant="danger">Belum Verifikasi</Badge>
                )}
              </InfoRow>
              <InfoRow label="Role">
                {userData.isAdmin ? (
                  <Badge variant="info">Admin</Badge>
                ) : (
                  <Badge variant="neutral">User</Badge>
                )}
              </InfoRow>
              <InfoRow label="Reward Review">
                {userData.hasClaimedReviewReward ? (
                  <Badge variant="success">Sudah Klaim</Badge>
                ) : (
                  <Badge variant="neutral">Belum Klaim</Badge>
                )}
              </InfoRow>
              <InfoRow label="Tanggal Daftar">
                <span className="flex items-center gap-1.5 justify-end">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDateTime(userData.createdAt)}
                </span>
              </InfoRow>
              <InfoRow label="Last Login">
                <span className="flex items-center gap-1.5 justify-end">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDateTime(userData.lastLoginAt)}
                </span>
              </InfoRow>
            </div>
          </section>

          {/* Subscription info */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-warning" />
              Informasi Langganan
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden">
              {/* Status header banner */}
              {userData.subscriptionStatus === "active" ? (
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #f5a623 0%, #ffe066 60%, #f5a623 100%)",
                  }}
                >
                  <CrownBadge size="md" />
                  <span className="text-sm font-bold text-white">Subscriber Aktif</span>
                </div>
              ) : userData.subscriptionStatus === "expired" ? (
                <div className="px-4 py-3 flex items-center gap-2 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-bold text-destructive">Langganan Kadaluarsa</span>
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center gap-2 bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-bold text-muted-foreground">Belum Berlangganan</span>
                </div>
              )}

              {/* Subscription details */}
              <div className="px-4">
                <InfoRow label="Status">
                  {userData.subscriptionStatus === "active" ? (
                    <Badge variant="success">Active</Badge>
                  ) : userData.subscriptionStatus === "expired" ? (
                    <Badge variant="danger">Expired</Badge>
                  ) : (
                    <Badge variant="neutral">Free</Badge>
                  )}
                </InfoRow>
                {userData.subscriptionStatus !== "free" && (
                  <>
                    <InfoRow label="Paket">
                      <span className="font-semibold text-foreground">
                        {userData.subscriptionPlan || "—"}
                      </span>
                    </InfoRow>
                    <InfoRow label="Berlaku Sampai">
                      {userData.subscriptionExpiry ? (
                        <span className="flex items-center gap-1.5 justify-end">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDateTime(userData.subscriptionExpiry)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </InfoRow>
                    {userData.subscriptionStatus === "active" && userData.subscriptionExpiry && (() => {
                      const daysLeft = Math.ceil(
                        (new Date(userData.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <InfoRow label="Sisa Masa">
                          <span
                            className={`font-bold ${daysLeft <= 7 ? "text-destructive" : daysLeft <= 14 ? "text-warning" : "text-success"
                              }`}
                          >
                            {daysLeft} hari
                          </span>
                        </InfoRow>
                      );
                    })()}
                    <InfoRow label="Order ID">
                      {userData.orderId ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/orders/${userData.orderId.orderId || userData.orderId
                              }`,
                            )
                          }
                          className="text-xs font-mono text-primary hover:underline underline-offset-2 flex items-center gap-1"
                        >
                          <ShoppingBag className="h-3 w-3" />
                          {userData.orderId.orderId ||
                            String(userData.orderId).slice(-10)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </InfoRow>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Scan quota */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-primary" />
              Kuota Scan AI
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Scan className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Scan Struk Gratis
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sisa kuota scan AI
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">
                    {userData.freeScanCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    tersisa
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${((userData.freeScanCount ?? 0) / TOTAL_FREE_SCAN_QUOTA) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>0 Kuota</span>
                  <span>{TOTAL_FREE_SCAN_QUOTA} Kuota</span>
                </div>
              </div>
            </div>
          </section>

          {/* Admin Actions */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-destructive" />
              Aksi Admin
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft p-4 space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold gap-2 border-border text-foreground hover:bg-muted"
                onClick={() => handleAdminAction("reset-password")}
                disabled={actionLoading}
              >
                <Clock className="h-3.5 w-3.5" />
                Reset Password Pengguna
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold gap-2 border-border text-foreground hover:bg-muted"
                onClick={() => handleAdminAction("toggle-verify")}
                disabled={actionLoading}
              >
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                {userData.isVerified ? "Batalkan Verifikasi Email" : "Verifikasi Email Pengguna"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold gap-2 border-border text-primary hover:bg-primary/10"
                onClick={() => handleAdminAction("reset-scan-quota")}
                disabled={actionLoading}
              >
                <Scan className="h-3.5 w-3.5 text-primary" />
                Reset Kuota Scan AI ke 5
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
