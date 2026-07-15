import { useState, useEffect, useCallback, useMemo } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Star, MessageSquare, Phone, Globe, X, TrendingUp, UserCheck,
  AlertTriangle, ClipboardList, Tag, Pencil,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  Card, CardHeader, CardBody,
  StatCard, SearchInput, Select, Badge, Button,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  EmptyState, Pagination, Modal, ModalBody, ModalFooter, useToast,
} from "../components/ui";
import { formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";

const PRIMARY = "#479fea";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const PURPLE = "#a78bfa";

const CATEGORY_COLORS = [PRIMARY, DANGER, WARNING, SUCCESS, PURPLE, "#0ea5e9", "#ec4899", "#64748b"];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function periodLabel(period) {
  if (!period) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [, m, d] = period.split("-");
    return `${parseInt(d, 10)} ${MONTH_LABELS[parseInt(m, 10) - 1]}`;
  }
  const [, m] = period.split("-");
  return MONTH_LABELS[parseInt(m, 10) - 1];
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{periodLabel(label) || label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-bold text-foreground">{children}</h2>;
}

// Horizontal bar scaled to a 0-5 rating, used for segment comparisons
function SegmentRatingBar({ label, avgRating, count, color }) {
  const width = Math.max(4, (avgRating / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {avgRating.toFixed(1)} ⭐ · {count.toLocaleString("id-ID")} review
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

// Horizontal bar scaled to a 0-100 percentage, used for completion-rate comparisons
function PercentBar({ label, value, sublabel, color }) {
  const width = Math.max(4, value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{sublabel}</span>
      </div>
      <div className="h-7 bg-muted rounded-lg overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        >
          <span className="text-white text-[10px] font-bold whitespace-nowrap">{value}%</span>
        </div>
      </div>
    </div>
  );
}

function KeywordCloud({ items, tone }) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground italic text-center py-8">Belum cukup data</p>;
  }
  const max = items[0].count;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((kw) => {
        const scale = 0.7 + (kw.count / max) * 0.55;
        return (
          <span
            key={kw.word}
            title={`${kw.count} ulasan menyebut kata ini`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
              tone === "negative" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            }`}
            style={{ fontSize: `${scale * 0.8}rem` }}
          >
            {kw.word}
            <span className="opacity-60 text-[10px]">{kw.count}</span>
          </span>
        );
      })}
    </div>
  );
}

// Reusable star rating display
function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "text-warning" : "text-border"}
        />
      ))}
    </div>
  );
}

// Compact interactive star rating for filter
function StarFilter({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(value === star ? "" : star)}
          className="transition-transform hover:scale-110"
          title={`${star} bintang`}
        >
          <Star
            size={16}
            fill={(hovered || value) >= star ? "currentColor" : "none"}
            className={(hovered || value) >= star ? "text-warning" : "text-border hover:text-warning/60"}
          />
        </button>
      ))}
      {value !== "" && (
        <span className="ml-1 text-xs text-warning font-semibold">{value}★</span>
      )}
    </div>
  );
}

const LANDING_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "true", label: "Di Landing" },
  { value: "false", label: "Tidak Aktif" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "new", label: "Baru" },
  { value: "reviewed", label: "Ditinjau" },
  { value: "resolved", label: "Selesai" },
];

const STATUS_LABELS = { new: "Baru", reviewed: "Ditinjau", resolved: "Selesai" };
const STATUS_VARIANTS = { new: "info", reviewed: "warning", resolved: "success" };

const TABS = [
  { id: "insight", label: "Insight" },
  { id: "list", label: "Daftar Ulasan" },
];

export default function Reviews() {
  usePageMeta(
    "Ulasan & Feedback",
    "Pantau feedback pengguna, tren kepuasan, dan tindak lanjuti keluhan."
  );
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("insight");

  // ── Table state ──
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState(""); // "" | 1-5
  const [landingFilter, setLandingFilter] = useState(""); // "" | "true" | "false"
  const [statusFilter, setStatusFilter] = useState(""); // "" | new | reviewed | resolved
  const [queueOnly, setQueueOnly] = useState(false); // "Perlu Ditindaklanjuti" quick filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [contactableCount, setContactableCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);

  // ── Insight tab state ──
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState("");

  // ── Follow-up modal state ──
  const [noteModal, setNoteModal] = useState({ open: false, review: null, status: "new", note: "", saving: false });

  // Debounce search & reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter, landingFilter, statusFilter, queueOnly]);

  const fetchReviews = useCallback(async (page, search, rating, landing, status, queue) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (queue) {
        params.set("ratingMax", 3);
        params.set("status", "new");
      } else {
        if (rating !== "") params.set("rating", rating);
        if (landing !== "") params.set("showOnLanding", landing);
        if (status !== "") params.set("status", status);
      }
      const res = await apiFetch(`/api/reviews?${params}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Gagal memuat data review");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/reviews/stats");
      const data = await res.json();
      if (data.success) {
        setAvgRating(data.data.avgRating);
        setContactableCount(data.data.contactableCount);
      }
    } catch {
      // stats are non-critical
    }
  }, []);

  const fetchQueueCount = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: 1, limit: 1, ratingMax: 3, status: "new",
      });
      const res = await apiFetch(`/api/reviews?${params}`);
      const data = await res.json();
      if (data.success) setQueueCount(data.data.pagination.totalItems);
    } catch {
      // non-critical
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await apiFetch("/api/reviews/insights");
      const data = await res.json();
      if (data.success) {
        setInsights(data.data);
      } else {
        setInsightsError(data.message || "Gagal memuat insight");
      }
    } catch {
      setInsightsError("Terjadi kesalahan saat memuat insight");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(currentPage, debouncedSearch, ratingFilter, landingFilter, statusFilter, queueOnly);
  }, [currentPage, debouncedSearch, ratingFilter, landingFilter, statusFilter, queueOnly, fetchReviews]);

  useEffect(() => {
    fetchStats();
    fetchQueueCount();
    fetchInsights();
  }, [fetchStats, fetchQueueCount, fetchInsights]);

  // Toggle landing page — uses toast instead of browser confirm()
  const handleToggleLanding = async (reviewId, currentStatus) => {
    const action = currentStatus ? "dihapus dari" : "ditampilkan di";
    try {
      const res = await apiFetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, showOnLanding: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ message: `Review ${action} landing page`, type: "success" });
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewId ? { ...r, showOnLanding: !currentStatus } : r
          )
        );
      } else {
        toast({ message: data.message || "Gagal memperbarui status", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan koneksi", type: "error" });
    }
  };

  const openNoteModal = (review) => {
    setNoteModal({ open: true, review, status: review.status || "new", note: review.adminNote || "", saving: false });
  };
  const closeNoteModal = () => setNoteModal((m) => ({ ...m, open: false }));

  const handleSaveFollowUp = async () => {
    if (!noteModal.review) return;
    setNoteModal((m) => ({ ...m, saving: true }));
    try {
      const res = await apiFetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteModal.review._id, status: noteModal.status, adminNote: noteModal.note }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ message: "Status tindak lanjut disimpan", type: "success" });
        setReviews((prev) =>
          prev.map((r) =>
            r._id === noteModal.review._id ? { ...r, status: noteModal.status, adminNote: noteModal.note } : r
          )
        );
        fetchQueueCount();
        closeNoteModal();
      } else {
        toast({ message: data.message || "Gagal menyimpan", type: "error" });
        setNoteModal((m) => ({ ...m, saving: false }));
      }
    } catch {
      toast({ message: "Terjadi kesalahan koneksi", type: "error" });
      setNoteModal((m) => ({ ...m, saving: false }));
    }
  };

  const hasActiveFilters = ratingFilter !== "" || landingFilter !== "" || statusFilter !== "" || debouncedSearch;
  const clearFilters = () => {
    setRatingFilter("");
    setLandingFilter("");
    setStatusFilter("");
    setQueueOnly(false);
    setSearchQuery("");
  };

  // Overall NPS-style satisfaction score across the last 12 weeks of reviews
  const overallSatisfaction = useMemo(() => {
    if (!insights?.trend?.length) return null;
    const totals = insights.trend.reduce(
      (acc, t) => ({
        promoters: acc.promoters + t.promoters,
        detractors: acc.detractors + t.detractors,
        count: acc.count + t.count,
      }),
      { promoters: 0, detractors: 0, count: 0 }
    );
    if (totals.count === 0) return null;
    return Math.round(((totals.promoters - totals.detractors) / totals.count) * 100);
  }, [insights]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Ulasan &amp; Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pantau feedback pengguna, tren kepuasan, dan tindak lanjuti keluhan.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
            {tab.id === "list" && queueCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold">
                {queueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────── */}
      {/* TAB: INSIGHT                                */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "insight" && (
        <div className="space-y-4">
          {insightsError && (
            <p className="text-sm text-destructive">{insightsError}</p>
          )}

          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Review"
              value={totalItems}
              icon={MessageSquare}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            />
            <StatCard
              title="Rating Rata-rata"
              value={avgRating.toFixed(1)}
              icon={Star}
              iconColor="text-warning"
              iconBg="bg-warning/10"
            />
            <StatCard
              title="Bersedia Dihubungi"
              value={contactableCount}
              icon={Phone}
              iconColor="text-success"
              iconBg="bg-success/10"
            />
            <StatCard
              title="Skor Kepuasan (12 Minggu)"
              value={overallSatisfaction === null ? "-" : `${overallSatisfaction > 0 ? "+" : ""}${overallSatisfaction}`}
              icon={TrendingUp}
              iconColor={overallSatisfaction >= 0 ? "text-success" : "text-destructive"}
              iconBg={overallSatisfaction >= 0 ? "bg-success/10" : "bg-destructive/10"}
              tooltip="Persentase promoter (rating 4-5) dikurangi detractor (rating 1-2), dihitung dari ulasan 12 minggu terakhir."
            />
          </div>

          {insightsLoading ? (
            <Card><CardBody className="py-16 text-center text-sm text-muted-foreground">Memuat insight...</CardBody></Card>
          ) : insights && (
            <>
              {/* Trend + NPS split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <SectionTitle>Tren Rating &amp; Volume Review</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">12 minggu terakhir</p>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={insights.trend} margin={{ left: 0, right: 8, top: 10, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 10 }} width={28} />
                        <Tooltip
                          content={
                            <ChartTooltip
                              valueFormatter={(v, name) => (name === "Rating Rata-rata" ? `${v} ⭐` : `${v} review`)}
                            />
                          }
                        />
                        <Bar yAxisId="left" dataKey="count" name="Jumlah Review" fill={PRIMARY} radius={[4, 4, 0, 0]} barSize={18} />
                        <Line yAxisId="right" type="monotone" dataKey="avgRating" name="Rating Rata-rata" stroke={WARNING} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <SectionTitle>Promoter / Passive / Detractor</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Promoter (4-5★) · Passive (3★) · Detractor (1-2★) per minggu
                    </p>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={insights.trend} margin={{ left: 0, right: 8, top: 10, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} review`} />} />
                        <Bar dataKey="detractors" name="Detractor" stackId="nps" fill={DANGER} />
                        <Bar dataKey="passives" name="Passive" stackId="nps" fill={WARNING} />
                        <Bar dataKey="promoters" name="Promoter" stackId="nps" fill={SUCCESS} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              </div>

              {/* Segmentation */}
              <Card>
                <CardHeader>
                  <SectionTitle>Rating Berdasarkan Segmen Pengguna</SectionTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bandingkan kepuasan antar kelompok pengguna untuk cari pola
                  </p>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guest vs Terdaftar</p>
                    {insights.segmentation.byUserType.map((s, i) => (
                      <SegmentRatingBar key={s.type} label={s.type} avgRating={s.avgRating} count={s.count} color={i === 0 ? PRIMARY : SUCCESS} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Berdasarkan Aktivitas Split Bill</p>
                    {insights.segmentation.byUsage.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Belum cukup data</p>
                    ) : (
                      insights.segmentation.byUsage.map((s, i) => (
                        <SegmentRatingBar key={s.bucket} label={s.bucket} avgRating={s.avgRating} count={s.count} color={[PRIMARY, SUCCESS, WARNING, "#a78bfa"][i % 4]} />
                      ))
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pernah Abandon Draft?</p>
                    {insights.segmentation.byAbandonment.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Belum cukup data</p>
                    ) : (
                      insights.segmentation.byAbandonment.map((s, i) => (
                        <SegmentRatingBar key={s.label} label={s.label} avgRating={s.avgRating} count={s.count} color={i === 0 ? DANGER : SUCCESS} />
                      ))
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Drop-off funnel insight */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <SectionTitle>Tren Penyelesaian Split Bill</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      % draft yang berhasil di-finalize per bulan (6 bulan terakhir)
                    </p>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={insights.dropOff.cohort} margin={{ left: 0, right: 8, top: 10, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={32} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
                        <Line type="monotone" dataKey="completionRate" name="Tingkat Penyelesaian" stroke={SUCCESS} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <SectionTitle>Drop-off: Guest vs Terdaftar</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Siapa yang lebih sering meninggalkan draft split bill
                    </p>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {insights.dropOff.byUserType.map((d) => {
                      const total = d.STEP_1 + d.STEP_2 + d.STEP_3 + d.FINALIZED;
                      return (
                        <PercentBar
                          key={d.type}
                          label={d.type}
                          value={d.completionRate}
                          sublabel={`${d.FINALIZED.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} selesai`}
                          color={d.type === "Guest" ? WARNING : SUCCESS}
                        />
                      );
                    })}
                  </CardBody>
                </Card>
              </div>

              {/* Alasan drop-off per step (exit-survey) */}
              {insights.dropOff.reasons?.length > 0 && (
                <div>
                  <div className="mb-3">
                    <SectionTitle>Alasan Drop-off per Step</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Alasan yang dipilih pengguna saat keluar dari proses split bill — dasar prioritas perbaikan fitur
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {insights.dropOff.reasons.map((stepData) => (
                      <Card key={stepData.step}>
                        <CardHeader>
                          <SectionTitle>Step {stepData.step}</SectionTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{stepData.totalResponses} respon</p>
                        </CardHeader>
                        <CardBody>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={stepData.reasons}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={1}
                                dataKey="count"
                                nameKey="reason"
                              >
                                {stepData.reasons.map((_, i) => (
                                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} respon`} />} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5 mt-2">
                            {stepData.reasons.map((r, i) => (
                              <div key={r.reason} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                                  />
                                  <span className="text-foreground truncate" title={r.reason}>{r.reason}</span>
                                </span>
                                <span className="text-muted-foreground font-semibold shrink-0">
                                  {r.count} ({Math.round((r.count / stepData.totalResponses) * 100)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyword insight */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <SectionTitle>
                      <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Kata Kunci Keluhan</span>
                    </SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Kata yang sering muncul di ulasan rating ≤2 bintang</p>
                  </CardHeader>
                  <CardBody>
                    <KeywordCloud items={insights.keywords.negative} tone="negative" />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <SectionTitle>
                      <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Kata Kunci Pujian</span>
                    </SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Kata yang sering muncul di ulasan rating ≥4 bintang</p>
                  </CardHeader>
                  <CardBody>
                    <KeywordCloud items={insights.keywords.positive} tone="positive" />
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────── */}
      {/* TAB: DAFTAR ULASAN                          */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Action queue banner */}
          <button
            onClick={() => setQueueOnly((v) => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
              queueOnly
                ? "border-destructive bg-destructive/10"
                : "border-border bg-destructive/5 hover:bg-destructive/10"
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Perlu Ditindaklanjuti
            </span>
            <span className="text-xs text-muted-foreground">
              Rating ≤3 bintang · belum ditindak
            </span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-destructive text-white">
              {queueCount}
            </span>
          </button>

          {/* Table card */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-none min-w-0">
                {/* Search */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari nama atau isi review..."
                  className="w-52 shrink-0"
                />

                {/* Divider */}
                <div className="h-5 w-px bg-border shrink-0" />

                {/* Rating filter — interactive stars */}
                <div className={`flex items-center gap-2 shrink-0 ${queueOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rating:</span>
                  <StarFilter value={ratingFilter} onChange={setRatingFilter} />
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-border shrink-0" />

                {/* Landing Page filter */}
                <div className={`flex items-center gap-2 shrink-0 ${queueOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={landingFilter}
                    onChange={(e) => setLandingFilter(e.target.value)}
                  >
                    {LANDING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Status filter */}
                <div className={`flex items-center gap-2 shrink-0 ${queueOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Reset filter */}
                {(hasActiveFilters || queueOnly) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </CardHeader>

            <Table>
              <Thead>
                <Tr className="hover:bg-transparent">
                  <Th>Nama</Th>
                  <Th className="w-1/3">Review</Th>
                  <Th>Rating</Th>
                  <Th>Tanggal &amp; Waktu</Th>
                  <Th>Kontak</Th>
                  <Th>Status</Th>
                  <Th className="text-center">Landing Page</Th>
                </Tr>
              </Thead>

              {loading ? (
                <TableSkeleton cols={7} rows={8} />
              ) : error ? (
                <Tbody>
                  <Tr className="hover:bg-transparent">
                    <Td colSpan={7} className="text-center py-12 text-destructive">{error}</Td>
                  </Tr>
                </Tbody>
              ) : reviews.length === 0 ? (
                <Tbody>
                  <Tr className="hover:bg-transparent">
                    <Td colSpan={7} className="p-0">
                      <EmptyState
                        icon={MessageSquare}
                        title="Tidak ada review ditemukan"
                        description={hasActiveFilters || queueOnly ? "Coba ubah filter atau kata kunci pencarian." : "Belum ada review masuk."}
                      />
                    </Td>
                  </Tr>
                </Tbody>
              ) : (
                <Tbody>
                  {reviews.map((review) => (
                    <Tr key={review._id}>
                      <Td className="font-semibold whitespace-nowrap">{review.name}</Td>
                      <Td className="text-muted-foreground break-words">{review.review}</Td>
                      <Td>
                        <StarRating rating={review.rating} />
                      </Td>
                      <Td className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDateTime(review.createdAt)}
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <Badge variant={review.contactPermission ? "success" : "neutral"}>
                            {review.contactPermission ? "Bersedia" : "Tidak"}
                          </Badge>
                          {review.contactPermission && (
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                              {review.email && <div>{review.email}</div>}
                              {review.phone && <div>{review.phone}</div>}
                            </div>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => openNoteModal(review)}
                          className="flex flex-col items-start gap-1 group"
                          title="Klik untuk ubah status tindak lanjut"
                        >
                          <Badge variant={STATUS_VARIANTS[review.status || "new"]} className="group-hover:opacity-80 gap-1">
                            {STATUS_LABELS[review.status || "new"]}
                            <Pencil className="h-2.5 w-2.5" />
                          </Badge>
                          {review.adminNote && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[140px]">{review.adminNote}</span>
                          )}
                        </button>
                      </Td>
                      <Td className="text-center">
                        <button
                          onClick={() => handleToggleLanding(review._id, review.showOnLanding)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            review.showOnLanding
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={review.showOnLanding ? "Hapus dari landing page" : "Tampilkan di landing page"}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {review.showOnLanding ? "Aktif" : "Nonaktif"}
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
                itemName="review"
              />
            )}
          </Card>
        </div>
      )}

      {/* Follow-up status modal */}
      <Modal isOpen={noteModal.open} onClose={closeNoteModal} title="Tindak Lanjut Review" size="md">
        <ModalBody className="space-y-4">
          {noteModal.review && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{noteModal.review.name}</span>
                <StarRating rating={noteModal.review.rating} />
              </div>
              <p className="text-muted-foreground text-xs">{noteModal.review.review}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Status</label>
            <Select
              value={noteModal.status}
              onChange={(e) => setNoteModal((m) => ({ ...m, status: e.target.value }))}
              className="w-full"
            >
              {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Catatan Admin (opsional)</label>
            <textarea
              value={noteModal.note}
              onChange={(e) => setNoteModal((m) => ({ ...m, note: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder="Contoh: sudah dihubungi via WhatsApp, menunggu balasan..."
              className="block w-full py-2 px-3 text-sm rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={closeNoteModal} disabled={noteModal.saving}>Batal</Button>
          <Button onClick={handleSaveFollowUp} disabled={noteModal.saving}>
            {noteModal.saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
