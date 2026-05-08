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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}`);
      const data = await res.json();
      if (data.success) {
        setUserData(data.data.user);
        setSplitBills(data.data.splitBills);
      } else {
        setError(data.message || "Gagal mengambil data pengguna");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
        <Button variant="ghost" onClick={() => navigate("/")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const totalTagihan = splitBills.reduce(
    (sum, r) => sum + (r.summary?.total ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHero
        onBack={() => navigate("/")}
        title={userData.name}
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
        statValue={`${splitBills.length} aktivitas`}
      />

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Split bill history */}
        <div className="xl:col-span-3 space-y-6">
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
                <Table>
                  <Thead>
                    <Tr className="hover:bg-transparent">
                      <Th>Aktivitas</Th>
                      <Th>Tanggal</Th>
                      <Th className="text-center">Peserta</Th>
                      <Th className="text-right">Total Tagihan</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {splitBills.map((bill) => (
                      <Tr key={bill._id}>
                        <Td>
                          <div>
                            <button
                              onClick={() =>
                                navigate(`/split-bills/${bill._id}`)
                              }
                              className="text-sm font-semibold text-primary hover:underline text-left leading-snug"
                            >
                              {bill.activityName}
                            </button>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {bill._id.slice(-10)}
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
                        <Td className="text-right font-semibold text-sm text-foreground whitespace-nowrap">
                          {formatCurrency(bill.summary?.total)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>

            {splitBills.length > 0 && (
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Total Keseluruhan
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {formatCurrency(totalTagihan)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: User info + Subscription */}
        <div className="xl:col-span-2 space-y-6">
          {/* User info card */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-success" />
              Informasi Pengguna
            </h2>
            <div className="bg-white rounded-lg border border-border shadow-soft px-4">
              <InfoRow label="Nama">
                <span>{userData.name}</span>
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
              <InfoRow label="Tanggal Daftar">
                <span className="flex items-center gap-1.5 justify-end">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDateTime(userData.createdAt)}
                </span>
              </InfoRow>
              <InfoRow label="Last Login">
                <span className="flex items-center gap-1.5 justify-end">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDateTime(userData.lastLogin)}
                </span>
              </InfoRow>
            </div>
          </section>

          {/* Subscription / scan quota */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-warning" />
              Subscription & Kuota
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

              <p className="text-xs text-muted-foreground text-center">
                {userData.freeScanCount ?? 0} dari {TOTAL_FREE_SCAN_QUOTA} kuota scan tersisa
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
