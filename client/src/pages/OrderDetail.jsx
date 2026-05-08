import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  User,
  ShoppingBag,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Info,
  DollarSign,
  QrCode,
  ExternalLink,
} from "lucide-react";
import QRCode from "react-qr-code";
import { formatDate, cn, formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";
import {
  Badge,
  Button,
  Spinner,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Avatar,
} from "../components/ui";
import PageHero from "../components/PageHero";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

function SectionTitle({ children, accent = "bg-primary" }) {
  return (
    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
      <span className={`h-4 w-0.5 rounded-full ${accent}`} />
      {children}
    </h2>
  );
}

const getStatusBadge = (status, highContrast = false) => {
  const commonClass = highContrast
    ? "bg-white text-slate-900 border-none shadow-sm px-3 py-1 text-[11px] font-black"
    : "gap-1";

  switch (status) {
    case "paid":
      return (
        <Badge
          variant={highContrast ? "neutral" : "success"}
          className={commonClass}
        >
          {!highContrast && <CheckCircle className="h-3 w-3" />} PAID
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant={highContrast ? "neutral" : "warning"}
          className={cn(commonClass, highContrast && "text-warning")}
        >
          {!highContrast && <Clock className="h-3 w-3" />} PENDING
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant={highContrast ? "neutral" : "neutral"}
          className={commonClass}
        >
          {!highContrast && <AlertCircle className="h-3 w-3" />} EXPIRED
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant={highContrast ? "neutral" : "danger"}
          className={cn(commonClass, highContrast && "text-destructive")}
        >
          {!highContrast && <XCircle className="h-3 w-3" />} FAILED
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className={commonClass}>
          {status.toUpperCase()}
        </Badge>
      );
  }
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const toast = useToast();

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.message || "Gagal mengambil detail order");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat detail order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <p className="text-destructive font-semibold">
          {error || "Data tidak ditemukan"}
        </p>
        <Button variant="ghost" onClick={() => navigate("/orders")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        onBack={() => navigate("/orders")}
        badges={
          <div className="flex gap-2">
             {getStatusBadge(order.status, true)}
          </div>
        }
        title={order.orderId}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(order.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <Package className="h-3.5 w-3.5" />
              {order.type}
            </span>
            {order.user && (
              <button
                onClick={() => navigate(`/users/${order.user.id}`)}
                className="flex items-center gap-1.5 underline underline-offset-2 decoration-white/50 hover:decoration-white transition-all"
              >
                <User className="h-3.5 w-3.5" />
                {order.user.name}
              </button>
            )}
          </>
        }
        statLabel="Total Bayar"
        statValue={formatCurrency(order.amount)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Order Snapshot & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Package Details */}
          <section className="space-y-3">
            <SectionTitle accent="bg-primary">Detail Paket</SectionTitle>
            <Card>
              <CardBody className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    <Package size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {order.snapshot?.name || "Subscription Package"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Durasi:{" "}
                      <span className="font-semibold text-foreground">
                        {order.snapshot?.durationMonths} Bulan
                      </span>
                    </p>

                    {order.snapshot?.benefits && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Keuntungan Paket:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {order.snapshot.benefits.map((benefit, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Payment Details */}
          <section className="space-y-3">
            <SectionTitle accent="bg-success">
              Informasi Pembayaran
            </SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <CreditCard size={14} /> Metode & Status
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Metode
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {order.paymentMethod || "QRIS (Pakasir)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    {order.paidAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Waktu Bayar
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(order.paidAt)}
                        </span>
                      </div>
                    )}
                    {order.isSandbox && (
                      <div className="pt-2">
                        <Badge
                          variant="warning"
                          className="w-full justify-center"
                        >
                          Sandbox Mode
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <DollarSign size={14} /> Rincian Harga
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Harga Paket
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(order.snapshot?.price || order.amount)}
                      </span>
                    </div>
                    {order.snapshot?.finalPrice &&
                      order.snapshot.finalPrice !== order.snapshot.price && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Diskon
                          </span>
                          <span className="text-sm font-medium text-success">
                            -
                            {formatCurrency(
                              order.snapshot.price - order.snapshot.finalPrice,
                            )}
                          </span>
                        </div>
                      )}
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">
                        Total Tagihan
                      </span>
                      <span className="text-lg font-black text-primary">
                        {formatCurrency(order.amount)}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </section>
        </div>

        {/* Right Col: User Info & QRIS */}
        <div className="space-y-6">
          {/* User Info */}
          <section className="space-y-3">
            <SectionTitle accent="bg-purple-500">Pelanggan</SectionTitle>
            <Card>
              <CardBody className="p-4">
                {order.user ? (
                  <div className="flex items-center gap-4">
                    <Avatar name={order.user.name} size="lg" />
                    <div className="min-w-0">
                      <a
                        href={`/users/${order.user.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {order.user.name}
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </a>
                      <p className="text-sm text-muted-foreground truncate">{order.user.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Data user tidak tersedia
                  </p>
                )}
              </CardBody>
            </Card>
          </section>

          {/* QRIS / Checkout Info */}
          {order.status === "pending" && order.qrisData && (
            <section className="space-y-3">
              <SectionTitle accent="bg-warning">QRIS Pembayaran</SectionTitle>
              <Card className="border-warning/30 bg-warning/5">
                <CardBody className="p-5 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-warning font-bold text-sm">
                    <QrCode size={18} /> QRIS Generated
                  </div>

                  {order.qrisData?.payment_number ? (
                    <div className="bg-white p-3 rounded-sm inline-block mx-auto">
                      <QRCode
                        value={order.qrisData.payment_number}
                        size={192}
                        className="w-48 h-48"
                      />
                    </div>
                  ) : (
                    <div className="py-8 bg-muted/50 rounded-lg flex flex-col items-center gap-2">
                      <Info className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Tautan QRIS tidak tersedia
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Kadaluarsa</p>
                    <div className="flex items-center justify-center gap-1.5 text-foreground font-black">
                      <Clock size={14} className="text-warning" />
                      {formatDateTime(order.expiresAt)}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </section>
          )}

          {/* Additional Info */}
          <section className="space-y-3">
            <SectionTitle accent="bg-slate-400">Log Sistem</SectionTitle>
            <Card>
              <CardBody className="p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dibuat Pada</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Terakhir Update</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(order.updatedAt || order.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ID Database</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {order.id}
                  </span>
                </div>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
