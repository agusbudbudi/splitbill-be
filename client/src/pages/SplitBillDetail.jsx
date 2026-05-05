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
  User,
} from "lucide-react";
import { formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { Badge, Button, Spinner, useToast } from "../components/ui";
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

export default function SplitBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedParticipants, setExpandedParticipants] = useState({});
  const user = JSON.parse(localStorage.getItem("user") || "{}");
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

  useEffect(() => {
    fetchDetail();
  }, [id]);

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
    record.participants.find((p) => p.id === pid)?.name || "—";

  return (
    <div className="space-y-6">
      <PageHero
        onBack={() => navigate("/split-bills")}
        badges={
          user.isAdmin && record.owner ? (
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-medium">
              Pemilik: <span className="font-bold">{record.owner.name}</span>
            </span>
          ) : null
        }
        title={record.activityName}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(record.occurredAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {record.participants.length} Peserta
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
        statValue={formatCurrency(record.summary.total)}
      />

      {/* Main content — full width 3+2 col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Expenses + Settlements */}
        <div className="xl:col-span-3 space-y-6">
          {/* Expenses */}
          <section className="space-y-3">
            <SectionTitle accent="bg-primary">Rincian Pengeluaran</SectionTitle>
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
                          Biaya Tambahan · {item.splitType}
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
          </section>

          {/* Settlements */}
          <section className="space-y-3">
            <SectionTitle accent="bg-warning">
              Pelunasan (Settlement)
            </SectionTitle>
            {record.summary.settlements.length === 0 ? (
              <div className="px-4 py-5 rounded-lg border border-border text-center">
                <p className="text-sm text-muted-foreground italic">
                  Tidak ada pelunasan yang diperlukan.
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
              {record.summary.perParticipant.map((p, idx) => {
                const name = participantName(p.participantId);
                const balanceVariant =
                  p.balance > 0
                    ? "success"
                    : p.balance < 0
                      ? "danger"
                      : "neutral";
                const balanceLabel =
                  p.balance > 0
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
                      {p.balance < 0 ? (
                        record.summary.settlements
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
              })}
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="11"
                            height="11"
                            fill="currentColor"
                            viewBox="0 0 256 256"
                          >
                            <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
                          </svg>
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
    </div>
  );
}
