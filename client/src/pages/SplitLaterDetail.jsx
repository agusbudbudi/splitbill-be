import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Receipt,
  User,
  Copy,
  X,
  ZoomIn,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { Button, Spinner, useToast } from "../components/ui";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const BUCKET_TYPE_LABELS = {
  trip: "Trip",
  hangout: "Hangout",
  event: "Event",
  office: "Kantor",
  household: "Rumah Tangga",
  other: "Lainnya",
};

const RECEIPT_STATUS_LABELS = {
  pending: "PENDING",
  completed: "SELESAI",
};

function SectionTitle({ children, accent = "bg-primary" }) {
  return (
    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
      <span className={`h-4 w-0.5 rounded-full ${accent}`} />
      {children}
    </h2>
  );
}

export default function SplitLaterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bucket, setBucket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});
  const { user } = useAuth();
  const toast = useToast();

  const receipts = bucket?.receipts || [];

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % receipts.length);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + receipts.length) % receipts.length);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, receipts.length]);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast({ message: "Berhasil disalin!", type: "success" });
    } catch {
      toast({ message: "Gagal menyalin.", type: "error" });
    }
  };

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/split-later/buckets/${id}`);
      const data = await res.json();
      if (data.success) {
        setBucket(data.bucket);
      } else {
        setError(data.message || "Gagal mengambil detail split later");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [id, fetchDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">
          Memuat detail split later...
        </p>
      </div>
    );
  }

  if (error || !bucket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <Receipt className="h-10 w-10" />
        </div>
        <p className="text-destructive font-semibold">
          {error || "Data tidak ditemukan"}
        </p>
        <Button variant="ghost" onClick={() => navigate("/split-later")}>
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
        badges={
          <div className="flex items-center gap-2">
            {bucket.status === "active" ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold border border-amber-600">
                AKTIF
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold border border-emerald-600">
                SELESAI
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold border border-white/10">
              {BUCKET_TYPE_LABELS[bucket.bucketType] || bucket.bucketType}
            </span>
          </div>
        }
        title={`${bucket.emoji || "🗂️"} ${bucket.title || "Bucket Tanpa Nama"}`}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {bucket.startDate ? formatDate(bucket.startDate) : "Tanggal belum diatur"}
              {bucket.endDate ? ` — ${formatDate(bucket.endDate)}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {(bucket.participants || []).length} Peserta
            </span>
            {bucket.owner && (
              user.isAdmin ? (
                <a
                  href={`/users/${bucket.ownerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 underline underline-offset-2 decoration-white/50 hover:decoration-white transition-all"
                >
                  <User className="h-3.5 w-3.5" />
                  {bucket.owner.name}
                </a>
              ) : (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {bucket.owner.name}
                </span>
              )
            )}
          </>
        }
        statLabel="Jumlah Struk"
        statValue={`${receipts.length}`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Receipts */}
        <div className="xl:col-span-3 space-y-6">
          <section className="space-y-3">
            <SectionTitle accent="bg-primary">Daftar Struk</SectionTitle>
            {receipts.length === 0 ? (
              <div className="bg-white px-4 py-5 rounded-lg border border-border shadow-soft text-center">
                <p className="text-sm text-muted-foreground italic">
                  Belum ada struk yang diunggah ke bucket ini.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden divide-y divide-border">
                {receipts.map((r, idx) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-primary/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {brokenImages[r.id] ? (
                        <div className="h-10 w-10 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/40 text-muted-foreground flex-shrink-0">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setLightboxIndex(idx)}
                          className="group relative h-10 w-10 rounded-xs border border-border overflow-hidden bg-muted flex-shrink-0"
                        >
                          <img
                            src={r.imageUrl}
                            alt={r.merchant || "Struk"}
                            loading="lazy"
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [r.id]: true }))
                            }
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.merchant || "Merchant tidak diketahui"}
                        </p>
                        {r.notes && (
                          <p className="text-xs text-muted-foreground truncate italic">
                            {r.notes}
                          </p>
                        )}
                        {r.splitBillId && (
                          user.isAdmin ? (
                            <button
                              onClick={() => navigate(`/split-bills/${r.splitBillId}`)}
                              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Lihat Split Bill
                            </button>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Sudah diproses ke split bill
                            </p>
                          )
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        {r.totalAmount != null ? formatCurrency(r.totalAmount) : "-"}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${r.status === "completed"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                          }`}
                      >
                        {RECEIPT_STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Participants + tracking */}
        <div className="xl:col-span-2 space-y-6">
          <section className="space-y-3">
            <SectionTitle accent="bg-success">Peserta</SectionTitle>
            <div className="bg-white rounded-lg border border-border shadow-soft p-4">
              {(bucket.participants || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada peserta ditambahkan.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bucket.participants.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full border border-border bg-muted/20 text-xs font-semibold text-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-6">
            <SectionTitle accent="bg-slate-400">Informasi Tracking</SectionTitle>
            <div className="bg-white rounded-lg border border-border shadow-soft p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Bucket ID
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-foreground break-all" title={bucket.id}>
                    {bucket.id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bucket.id)}
                    className="p-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Salin ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Dibuat
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {bucket.createdAt ? formatDateTime(bucket.createdAt) : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Diperbarui
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {bucket.updatedAt ? formatDateTime(bucket.updatedAt) : "-"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Fullscreen receipt photo viewer */}
      {lightboxIndex !== null && receipts[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>

          {receipts.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i - 1 + receipts.length) % receipts.length);
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % receipts.length);
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Berikutnya"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {brokenImages[receipts[lightboxIndex].id] ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-2 text-white/70"
            >
              <ImageOff className="h-10 w-10" />
              <p className="text-sm">Foto struk gagal dimuat</p>
            </div>
          ) : (
            <img
              src={receipts[lightboxIndex].imageUrl}
              alt={receipts[lightboxIndex].merchant || "Struk"}
              onClick={(e) => e.stopPropagation()}
              onError={() =>
                setBrokenImages((prev) => ({
                  ...prev,
                  [receipts[lightboxIndex].id]: true,
                }))
              }
              className="max-h-[85vh] max-w-full object-contain rounded-lg animate-in fade-in zoom-in-95 duration-200"
            />
          )}

          {receipts.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
              {lightboxIndex + 1} / {receipts.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
