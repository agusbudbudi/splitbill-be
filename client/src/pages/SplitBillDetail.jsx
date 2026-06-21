import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Receipt,
  CreditCard,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
  Copy,
  HelpCircle,
} from "lucide-react";
import { formatDate, formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { Badge, Button, Spinner, useToast, Avatar } from "../components/ui";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

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

// Map of last_step values to human-readable labels for admin reference
const LAST_STEP_LABELS = {
  add_participants: "Tambah Peserta",
  add_expenses: "Tambah Pengeluaran",
  add_payment_methods: "Tambah Metode Bayar",
  calculate: "Kalkulasi Tagihan",
  review: "Review Ringkasan",
  share: "Bagikan Split Bill",
  finalize: "Finalisasi",
};

const LAST_STEP_DESCRIPTIONS = {
  add_participants: "User sedang di step input daftar peserta split bill.",
  add_expenses: "User sedang di step input pengeluaran / item tagihan.",
  add_payment_methods: "User sedang di step mengatur metode pembayaran.",
  calculate: "Split bill sudah dihitung dan menunggu konfirmasi.",
  review: "User sedang mereview ringkasan sebelum dibagikan.",
  share: "Split bill sudah dibagikan ke peserta.",
  finalize: "Split bill telah difinalisasi oleh pemilik.",
};

export default function SplitBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedParticipants, setExpandedParticipants] = useState({});
  const [adjacent, setAdjacent] = useState({ prev: null, next: null });
  const [showStepTooltip, setShowStepTooltip] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

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
      toast({ message: "Nomor berhasil disalin!", type: "success" });
    } catch {
      toast({ message: "Gagal menyalin nomor.", type: "error" });
    }
  };

  const toggleParticipant = (idx) =>
    setExpandedParticipants((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/split-bills/${id}`);
      const data = await res.json();
      if (data.success) {
        setRecord(data.record);
      } else {
        setError(data.message || "Gagal mengambil detail split bill");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAdjacent = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/split-bills/${id}/adjacent`);
      const data = await res.json();
      if (data.success) {
        setAdjacent({ prev: data.prev, next: data.next });
      }
    } catch {
      // silently ignore — navigation is non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
    fetchAdjacent();
  }, [id, fetchDetail, fetchAdjacent]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">
          Memuat detail split bill...
        </p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <Receipt className="h-10 w-10" />
        </div>
        <p className="text-destructive font-semibold">
          {error || "Data tidak ditemukan"}
        </p>
        <Button variant="ghost" onClick={() => navigate("/split-bills")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const participantName = (pid) =>
    record.participants.find((p) => p.id === pid)?.name || "-";

  return (
    <div className="space-y-6">
      {/* Prev / Next navigation bar */}
      {(adjacent.prev || adjacent.next) && (
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            onClick={() => navigate(`/split-bills/${adjacent.prev.id}`)}
            disabled={!adjacent.prev}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="max-w-[160px] truncate">
              {adjacent.prev?.activityName || "Sebelumnya"}
            </span>
          </button>
          <button
            onClick={() => navigate(`/split-bills/${adjacent.next.id}`)}
            disabled={!adjacent.next}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
          >
            <span className="max-w-[160px] truncate">
              {adjacent.next?.activityName || "Berikutnya"}
            </span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      <PageHero
        onBack={() => navigate(-1)}
        backLabel="Back"
        badges={
          <div className="flex items-center gap-2">
            {record.status === "editable" ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold border border-amber-600">
                DRAFT
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold border border-emerald-600">
                FINALIZE
              </span>
            )}
            <a
              href={`${import.meta.env.VITE_PUBLIC_APP_URL || "https://splitbill.my.id"}/history/split-bill/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/10"
            >
              <ExternalLink className="h-3 w-3" />
              Lihat Halaman Publik
            </a>
          </div>
        }
        title={record.activityName || "Aktivitas Tanpa Nama"}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {record.occurredAt ? formatDate(record.occurredAt) : "Belum diatur"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {(record.participants || []).length} Peserta
            </span>
            {record.owner && (
              user.isAdmin ? (
                <button
                  onClick={() => navigate(`/users/${record.ownerId}`)}
                  className="flex items-center gap-1.5 underline underline-offset-2 decoration-white/50 hover:decoration-white transition-all"
                >
                  <User className="h-3.5 w-3.5" />
                  {record.owner.name}
                </button>
              ) : (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {record.owner.name}
                </span>
              )
            )}
          </>
        }
        statLabel="Total Tagihan"
        statValue={record.summary ? formatCurrency(record.summary.total) : "DRAFT (Belum Dihitung)"}
      />

      {/* Main content — full width 3+2 col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Expenses + Settlements */}
        <div className="xl:col-span-3 space-y-6">
          {/* Registered Friends / Participants */}
          <section className="space-y-3">
            <SectionTitle accent="bg-primary">Peserta Terdaftar</SectionTitle>
            <div className="bg-white rounded-lg border border-border shadow-soft p-4">
              <div className="flex flex-wrap gap-2">
                {(record.participants || []).map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <Avatar
                        name={p.name}
                        src={p.image || p.avatar}
                        size="sm"
                        className="h-6 w-6 text-[10px]"
                      />
                      <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                        {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Expenses */}
          <section className="space-y-3">
            <SectionTitle accent="bg-primary">Rincian Pengeluaran</SectionTitle>
            {record.expenses.length === 0 && record.additionalExpenses.length === 0 ? (
              <div className="bg-white px-4 py-5 rounded-lg border border-border shadow-soft text-center">
                <p className="text-sm text-muted-foreground italic">
                  Belum ada rincian pengeluaran dicatat.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden">
                <div className="divide-y divide-border">
                  {record.expenses.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-primary/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted flex-shrink-0">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dibayar:{" "}
                            <span className="font-medium text-foreground">
                              {participantName(item.paidBy)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(item.amount)}
                        </p>
                        <div className="flex flex-wrap justify-end gap-1 mt-1">
                          {item.participants.map((pId) => (
                            <span
                              key={pId}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground"
                            >
                              {participantName(pId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {record.additionalExpenses.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-border/60 flex-shrink-0">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Biaya Tambahan · {item.splitType || "equally"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-bold flex-shrink-0 ${item.amount < 0 ? "text-success" : "text-foreground"}`}
                      >
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Settlements */}
          <section className="space-y-3">
            <SectionTitle accent="bg-warning">
              Pelunasan (Settlement)
            </SectionTitle>
            {!record.summary || !record.summary.settlements || record.summary.settlements.length === 0 ? (
              <div className="bg-white px-4 py-5 rounded-lg border border-border shadow-soft text-center">
                <p className="text-sm text-muted-foreground italic">
                  {!record.summary ? "Pelunasan belum dihitung (Draft)." : "Tidak ada pelunasan yang diperlukan."}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {record.summary.settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border"
                    style={{ background: "rgba(245,158,11,0.04)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Dari
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {participantName(s.from)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="p-1 rounded-full bg-warning/20 text-warning">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(s.amount)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Kepada
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {participantName(s.to)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Participants + Payment methods */}
        <div className="xl:col-span-2 space-y-6">
          {/* Per-participant summary */}
          <section className="space-y-3">
            <SectionTitle accent="bg-success">Ringkasan Peserta</SectionTitle>
            <div className="space-y-1.5">
              {!record.summary || !record.summary.perParticipant || record.summary.perParticipant.length === 0 ? (
                <div className="bg-white px-4 py-5 rounded-lg border border-border shadow-soft text-center">
                  <p className="text-sm text-muted-foreground italic">
                    Ringkasan per peserta belum tersedia (Draft).
                  </p>
                </div>
              ) : (
                [...record.summary.perParticipant]
                  .map((p, idx) => ({ ...p, originalIndex: idx }))
                  .sort((a, b) => {
                    const aNotInvolved = a.paid === 0 && a.owed === 0;
                    const bNotInvolved = b.paid === 0 && b.owed === 0;
                    if (aNotInvolved && !bNotInvolved) return 1;
                    if (!aNotInvolved && bNotInvolved) return -1;
                    return 0;
                  })
                  .map((p) => {
                    const idx = p.originalIndex;
                    const name = participantName(p.participantId);
                    const notInvolved = p.paid === 0 && p.owed === 0;
                    const balanceVariant = notInvolved
                      ? "neutral"
                      : p.balance > 0
                        ? "success"
                        : p.balance < 0
                          ? "danger"
                          : "neutral";
                    const balanceLabel = notInvolved
                      ? "TIDAK TERLIBAT"
                      : p.balance > 0
                        ? "PIUTANG"
                        : p.balance < 0
                          ? "HUTANG"
                          : "LUNAS";
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-lg border border-border shadow-soft overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {name}
                            </p>
                            {!notInvolved && (
                              <button
                                onClick={() => toggleParticipant(idx)}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
                              >
                                {expandedParticipants[idx] ? (
                                  <ChevronUp size={13} />
                                ) : (
                                  <ChevronDown size={13} />
                                )}
                              </button>
                            )}
                          </div>
                          <Badge variant={balanceVariant}>{balanceLabel}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-px bg-border">
                          <div className="bg-white px-4 py-2.5">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                              Membayar
                            </p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                              {formatCurrency(p.paid)}
                            </p>
                          </div>
                          <div className="bg-white px-4 py-2.5">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                              Tagihan
                            </p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                              {formatCurrency(p.owed)}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-2.5 border-t border-border bg-muted/30 space-y-1">
                          {notInvolved ? (
                            <p className="text-xs text-center text-muted-foreground italic py-0.5">
                              Tidak terlibat dalam split Bill
                            </p>
                          ) : p.balance < 0 ? (
                            (record.summary.settlements || [])
                              .filter((s) => s.from === p.participantId)
                              .map((s, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center text-xs"
                                >
                                  <span className="text-muted-foreground">
                                    →{" "}
                                    <span className="font-semibold text-foreground">
                                      {participantName(s.to)}
                                    </span>
                                  </span>
                                  <span className="font-bold text-destructive">
                                    {formatCurrency(s.amount)}
                                  </span>
                                </div>
                              ))
                          ) : p.balance > 0 ? (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">
                                Terima total
                              </span>
                              <span className="font-bold text-success">
                                {formatCurrency(p.balance)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-center text-muted-foreground italic py-0.5">
                              Lunas
                            </p>
                          )}
                        </div>

                        {expandedParticipants[idx] && p.owedItems?.length > 0 && (
                          <div className="px-4 py-3 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">
                              Item Detail
                            </p>
                            <div className="space-y-1.5">
                              {p.owedItems.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-start gap-3"
                                >
                                  <span className="text-xs text-muted-foreground italic leading-tight">
                                    {item.description}
                                  </span>
                                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </section>

          {/* Payment methods */}
          <section className="space-y-3">
            <SectionTitle accent="bg-secondary-foreground">
              Metode Pembayaran
            </SectionTitle>
            {record.paymentMethodSnapshots.length === 0 ? (
              <div className="bg-white px-4 py-5 rounded-lg border border-border shadow-soft text-center">
                <p className="text-sm text-muted-foreground italic">
                  Tidak ada metode pembayaran dilampirkan.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-border shadow-soft overflow-hidden divide-y divide-border">
                {record.paymentMethodSnapshots.map((method, idx) => (
                  <div key={idx} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {method.category.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {method.provider}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {method.ownerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-sm font-bold text-primary">
                          {method.accountNumber || method.phoneNumber}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              method.accountNumber || method.phoneNumber,
                            )
                          }
                          className="p-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Salin"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Tracking Info Section */}
      <section className="space-y-3 border-t border-border pt-6">
        <SectionTitle accent="bg-slate-400">Informasi Tracking</SectionTitle>
        <div className="bg-white rounded-lg border border-border shadow-soft p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Split Bill ID
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-foreground break-all" title={record.id}>
                  {record.id}
                </span>
                <button
                  onClick={() => copyToClipboard(record.id)}
                  className="p-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Salin ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Last Step
                </p>
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowStepTooltip(true)}
                    onMouseLeave={() => setShowStepTooltip(false)}
                    onFocus={() => setShowStepTooltip(true)}
                    onBlur={() => setShowStepTooltip(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Informasi Last Step"
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                  {showStepTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-border bg-white shadow-lg p-3 text-left">
                      <p className="text-xs font-bold text-foreground mb-1.5">Panduan Last Step</p>
                      <ul className="space-y-1">
                        {Object.entries(LAST_STEP_LABELS).map(([key, label]) => (
                          <li key={key} className="text-[10px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{label}</span>
                            {" — "}{LAST_STEP_DESCRIPTIONS[key]}
                          </li>
                        ))}
                      </ul>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                  {LAST_STEP_LABELS[record.last_step] || record.last_step || "N/A"}
                </span>
                {record.last_step && LAST_STEP_DESCRIPTIONS[record.last_step] && (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {LAST_STEP_DESCRIPTIONS[record.last_step]}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Created At
              </p>
              <p className="text-xs font-medium text-foreground">
                {record.createdAt ? formatDateTime(record.createdAt) : "-"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Updated At
              </p>
              <p className="text-xs font-medium text-foreground">
                {record.updatedAt ? formatDateTime(record.updatedAt) : "-"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
