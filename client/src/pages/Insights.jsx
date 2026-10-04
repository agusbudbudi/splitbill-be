import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { useNavigate, Link } from "react-router-dom";
import {
  Users,
  ReceiptText,
  Wallet,
  Scan,
  RefreshCw,
  UserCheck,
  UserX,
  Zap,
  Target,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Shuffle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardHeader,
  CardBody,
  StatCard,
  Spinner,
  Badge,
  Tooltip as UiTooltip,
} from "../components/ui";

const AI_ADOPTION_DESCRIPTIONS = {
  scanAdopted:
    "Persentase pengguna yang punya minimal satu scan berhasil (dihitung dari log scan) dari total seluruh pengguna.",
  scanExhausted:
    "Jumlah pengguna yang sisa kuota scan gratisnya 0 saat ini (kuota awal 5 scan, bisa bertambah dari reward review/level).",
  totalScans:
    "Total scan berhasil oleh pengguna yang login (dihitung dari log scan).",
  avgScans:
    "Rata-rata jumlah scan yang dilakukan oleh satu orang pengguna (Total Scan / Total User yang sudah pakai scan).",
  conversion:
    "Jumlah power users (kuota habis) yang akhirnya membeli paket langganan (Pro/Business).",
  conversionRate:
    "Persentase power users yang berhasil dikonversi menjadi subscriber (Konversi Sub / Kuota Habis).",
};

const SUBSCRIPTION_DESCRIPTIONS = {
  activeSubscribers:
    "Jumlah pengguna yang saat ini memiliki status langganan aktif.",
  revenueMTD:
    "Total pendapatan dari pembayaran paket langganan yang berhasil (paid) pada bulan berjalan.",
  pendingOrders:
    "Jumlah pesanan (invoice) yang sudah dibuat oleh user namun belum diselesaikan pembayarannya.",
  expiredSubscribers:
    "Jumlah pengguna yang status langganannya sudah kedaluwarsa/expired.",
};

const KPI_DESCRIPTIONS = {
  totalUsers: "Total seluruh pengguna yang terdaftar di database.",
  verifiedUsers: "Jumlah pengguna yang sudah melakukan verifikasi email.",
  totalBills: "Total seluruh catatan split bill yang pernah dibuat oleh user.",
  totalValue: "Akumulasi nilai nominal rupiah dari seluruh split bill.",
  avgBill: "Rata-rata nilai nominal per satu catatan split bill.",
  avgRating: "Rata-rata rating bintang dari feedback pengguna.",
};
import { apiFetch } from "../lib/api";

const formatRp = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v ?? 0);

const formatRpShort = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}rb`;
  return `Rp${v}`;
};

// Percentage helper: always 2 decimal places (e.g. "38.33%")
const formatPct = (v) => `${(v ?? 0).toFixed(2)}%`;
const pctOf = (numerator, denominator) =>
  denominator > 0 ? (numerator / denominator) * 100 : 0;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function periodLabel(period) {
  if (!period) return "";
  // Daily: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [, m, d] = period.split("-");
    return `${parseInt(d, 10)} ${MONTH_LABELS[parseInt(m, 10) - 1]}`;
  }
  // Weekly: YYYY-Www
  if (period.includes("-W")) {
    const [, week] = period.split("-W");
    return `W${parseInt(week, 10)}`;
  }
  // Monthly: YYYY-MM
  const [, m] = period.split("-");
  return MONTH_LABELS[parseInt(m, 10) - 1];
}

// Formats a week's Sunday start date ("YYYY-MM-DD") as a date range, e.g. "27 - 2 Agu"
function weekRangeLabel(weekStart) {
  if (!weekStart) return "";
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d + 6));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = sameMonth
    ? `${start.getUTCDate()}`
    : `${start.getUTCDate()} ${MONTH_LABELS[start.getUTCMonth()]}`;
  const endLabel = `${end.getUTCDate()} ${MONTH_LABELS[end.getUTCMonth()]}`;
  return `${startLabel} - ${endLabel}`;
}

const GRANULARITY_LABELS = {
  monthly: "Bulan",
  weekly: "Minggu",
  daily: "Hari",
};

const GRANULARITY_DESCRIPTIONS = {
  monthly: "Registrasi baru per bulan (6 bulan terakhir)",
  weekly: "Registrasi baru per minggu (sebulan terakhir)",
  daily: "Registrasi baru per hari (30 hari terakhir)",
};

const SCAN_GRANULARITY_DESCRIPTIONS = {
  monthly: "Scan berhasil vs gagal per bulan (6 bulan terakhir)",
  weekly: "Scan berhasil vs gagal per minggu (sebulan terakhir)",
  daily: "Scan berhasil vs gagal per hari (30 hari terakhir)",
};

const PRIMARY = "#479fea";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const PURPLE = "#a78bfa";

// Max acceptable AI-scan failure rate (%) over the last 7 days
const FAILURE_RATE_THRESHOLD = 10;
// Min acceptable success rate (%) over the last 7 days — mirror of the failure threshold
const SUCCESS_RATE_THRESHOLD = 100 - FAILURE_RATE_THRESHOLD;

const FUNNEL_COLORS = [PRIMARY, SUCCESS, WARNING, PURPLE];

const FUNNEL_DESCRIPTIONS = {
  Registered:
    "Total seluruh pengguna yang telah membuat akun, dihitung dari semua dokumen di koleksi User tanpa filter apapun.",
  Verified:
    "Pengguna yang sudah mengkonfirmasi email mereka. Dihitung dari User dengan field isVerified = true.",
  Activated:
    "Pengguna yang sudah membuat minimal 1 split bill. Dihitung dari jumlah user unik yang tercatat di koleksi SplitBillRecord.",
  Engaged:
    "Pengguna yang sudah membuat minimal 2 split bill — indikator pengguna yang benar-benar aktif dan loyal menggunakan platform.",
};

// Custom tooltip for charts
function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-sm shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
}

// Tooltip for scan trend chart (stacked success/failed bars + failure rate line)
function ScanTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const success = payload.find((p) => p.dataKey === "success")?.value ?? 0;
  const failed = payload.find((p) => p.dataKey === "failed")?.value ?? 0;
  const failureRate = payload.find((p) => p.dataKey === "failureRate")?.value ?? 0;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-sm shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-white mb-1.5">{periodLabel(label)}</p>
      <p style={{ color: SUCCESS }}>Berhasil: {success}</p>
      <p style={{ color: DANGER }}>Gagal: {failed}</p>
      <p style={{ color: WARNING }}>Failure rate: {formatPct(failureRate)}</p>
    </div>
  );
}

// Tooltip for model usage trend chart (stacked bars per provider)
function ModelTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-sm shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-white mb-1.5">{periodLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {SCAN_PROVIDER_LABELS[p.dataKey] || p.dataKey}: {p.value}
        </p>
      ))}
      <p className="text-slate-400 mt-1 pt-1 border-t border-slate-700">Total: {total}</p>
    </div>
  );
}

// Funnel bar section
function FunnelBar({ stage, count, rate, color, maxCount, description }) {
  const width = maxCount > 0 ? Math.max(8, (count / maxCount) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">{stage}</span>
          <UiTooltip content={description} />
        </span>
        <span className="text-muted-foreground">
          {(count ?? 0).toLocaleString("id-ID")} pengguna ({formatPct(rate)})
        </span>
      </div>
      <div className="h-8 bg-muted rounded-xs overflow-hidden">
        <div
          className="h-full rounded-xs flex items-center px-3 transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        >
          <span className="text-white text-xs font-bold">{formatPct(rate)}</span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
      <span className="h-4 w-0.5 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

// Distribution card: headline metric + segmented bar + per-segment breakdown
function DistributionCard({
  title,
  headline,
  headlineLabel,
  total,
  totalUnit,
  segments,
  className,
}) {
  return (
    <div
      className={`bg-white rounded-sm shadow-soft border border-border p-4 space-y-3 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {headline}
            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
              {headlineLabel}
            </span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-bold text-foreground">
            {total.toLocaleString("id-ID")} {totalUnit}
          </p>
        </div>
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-xs bg-muted">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.dot} transition-all duration-700`}
            style={{ width: `${pctOf(seg.count, total)}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${seg.dot}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {seg.label}
                <span className={`ml-1.5 font-bold ${seg.text}`}>
                  {seg.count.toLocaleString("id-ID")}
                </span>
                <span className="ml-1 font-normal text-muted-foreground">
                  ({formatPct(pctOf(seg.count, total))})
                </span>
              </p>
              {seg.hint && (
                <p className="text-[11px] text-muted-foreground">{seg.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// KPI card with context line (delta / ratio) under the main value
function KpiCard({ title, value, icon: Icon, iconColor, iconBg, tooltip, sub, alert, badge, className }) {
  return (
    <div
      className={`bg-white rounded-sm shadow-soft border p-4 space-y-2 ${alert ? "border-destructive/40" : "border-border"} ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          {tooltip && <UiTooltip content={tooltip} />}
        </div>
        <div className={`rounded-xs p-1.5 flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-2xl font-black text-foreground truncate">{value}</p>
        {badge}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground leading-snug">{sub}</div>}
      {alert && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xs border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <div className="leading-snug">{alert}</div>
        </div>
      )}
    </div>
  );
}

// Signed delta chip (green up / red down / neutral flat)
function DeltaText({ delta, suffix }) {
  if (delta == null) return <span>Belum ada pembanding</span>;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span>
      <span
        className={`font-bold ${flat ? "text-muted-foreground" : up ? "text-success" : "text-destructive"}`}
      >
        {flat ? "•" : up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
      </span>{" "}
      {suffix}
    </span>
  );
}

const TABS = [
  { id: "overview", label: "Ringkasan" },
  { id: "features", label: "Fitur & Funnel" },
  { id: "revenue", label: "Pendapatan & Langganan" },
  { id: "aiScan", label: "AI Scan" },
];

const SCAN_KPI_DESCRIPTIONS = {
  totalAttempts: "Total seluruh percobaan scan struk (berhasil + gagal) yang tercatat di ScanLog.",
  successRate: "Persentase percobaan scan yang berhasil diproses dari seluruh percobaan.",
  fallbackRate:
    "Persentase scan berhasil yang jatuh ke Gemini karena OpenRouter dan Groq (diadu paralel sebagai provider utama) sama-sama gagal/timeout.",
  uniqueUsers: "Jumlah pengguna login unik yang pernah melakukan scan struk.",
  uniqueGuestScans: "Jumlah alamat IP unik dari tamu (belum login) yang melakukan scan struk.",
  overallFailureRate: "Persentase seluruh percobaan scan (sepanjang waktu) yang gagal diproses.",
  last7dFailureRate: "Persentase percobaan scan yang gagal dalam 7 hari terakhir — indikator kesehatan sistem saat ini.",
  last7dSuccessRate: "Persentase percobaan scan yang berhasil dalam 7 hari terakhir.",
  retryRate:
    "Dari percobaan scan yang gagal (30 hari terakhir), berapa persen yang diikuti percobaan scan lain oleh user/IP yang sama dalam <2 menit — sinyal user mencoba ulang setelah gagal.",
};

const SCAN_PROVIDER_COLORS = {
  openrouter: PRIMARY,
  groq: PURPLE,
  gemini: WARNING,
};

const SCAN_PROVIDER_LABELS = {
  openrouter: "OpenRouter",
  groq: "Groq",
  gemini: "Gemini",
};

const ERROR_CATEGORY_COLORS = {
  quotaGemini: WARNING,
  modelGroq: PURPLE,
  openrouterNotSet: DANGER,
  lainnya: "#94a3b8",
};

const ERROR_CATEGORY_LABELS = {
  quotaGemini: "Kuota Gemini",
  modelGroq: "Model Groq",
  openrouterNotSet: "OpenRouter Belum Diset",
  lainnya: "Lainnya",
};

export default function Insights() {
  usePageMeta(
    "Insight & Analitik",
    "Gambaran performa platform, pertumbuhan pengguna, dan marketing funnel Split Bill."
  );
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [granularity, setGranularity] = useState("monthly");
  const [scanGranularity, setScanGranularity] = useState("daily");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchInsights = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const res = await apiFetch(
          `/api/insights?granularity=${granularity}&scanGranularity=${scanGranularity}`,
        );
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || "Gagal memuat data insight");
        }
      } catch {
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [granularity, scanGranularity],
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data insight...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-destructive font-semibold">{error}</p>
        <button
          onClick={() => fetchInsights()}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const {
    kpis,
    funnel,
    userGrowth,
    activityTrend,
    featureAdoption,
    topUsers = [],
    providers = [],
    splitBillStatuses = [],
    paymentMethods = [],
    draftDropOff = [],
    peakDays = [],
    groupSizes = [],
    additionalSplitTypes = [],
    aiScan = {},
  } = data || {};
  const {
    kpis: scanKpis = {},
    providerStats: scanProviderStats = [],
    providerAttempts = { attemptedRequests: 0, providers: [] },
    trend: scanTrend = [],
    modelTrend = [],
    errorBreakdown: scanErrorBreakdown = [],
    errorCategoryTrend = [],
    peakDays: scanPeakDays = [],
    topScanUsers = [],
    newScannerTrend = [],
    incidentPeriod,
    retryRateTrend = [],
  } = aiScan;
  const funnelMax = funnel[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Insight &amp; Analitik
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gambaran performa platform, pertumbuhan pengguna, dan marketing
            funnel.
          </p>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`insight-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────── */}
      {/* TAB: RINGKASAN (OVERVIEW)                  */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* KPI Cards */}
          {(() => {
            const totalUsers = kpis.totalUsers ?? 0;
            const verified = kpis.verifiedUsers ?? 0;
            const NewToday = ({ n }) =>
              n > 0 ? (
                <span className="font-bold text-success">+{n.toLocaleString("id-ID")} hari ini</span>
              ) : (
                <span>Tidak ada baru hari ini</span>
              );
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  title="Total Pengguna"
                  value={totalUsers.toLocaleString("id-ID")}
                  icon={Users}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  tooltip={KPI_DESCRIPTIONS.totalUsers}
                  sub={
                    <>
                      <NewToday n={kpis.newUsersToday ?? 0} />
                      <span className="block">
                        {(kpis.activeUsers ?? 0).toLocaleString("id-ID")} aktif 30 hari terakhir (
                        {formatPct(pctOf(kpis.activeUsers, totalUsers))})
                      </span>
                    </>
                  }
                />
                <KpiCard
                  title="Terverifikasi"
                  value={formatPct(kpis.verifiedRate)}
                  icon={UserCheck}
                  iconColor="text-success"
                  iconBg="bg-success/10"
                  tooltip={KPI_DESCRIPTIONS.verifiedUsers}
                  sub={
                    <>
                      {verified.toLocaleString("id-ID")} dari {totalUsers.toLocaleString("id-ID")} pengguna
                      <span className="block">
                        {Math.max(0, totalUsers - verified).toLocaleString("id-ID")} belum verifikasi email
                      </span>
                    </>
                  }
                />
                <KpiCard
                  title="Total Split Bill"
                  value={(kpis.totalBills ?? 0).toLocaleString("id-ID")}
                  icon={ReceiptText}
                  iconColor="text-warning"
                  iconBg="bg-warning/10"
                  tooltip={KPI_DESCRIPTIONS.totalBills}
                  sub={
                    <>
                      <NewToday n={kpis.newBillsToday ?? 0} />
                      <span className="block">
                        Rata-rata {kpis.avgParticipants ?? 0} peserta per bill
                      </span>
                    </>
                  }
                />
                <KpiCard
                  title="Total Nilai Ditagih"
                  value={formatRpShort(kpis.totalValue)}
                  icon={Wallet}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  tooltip={KPI_DESCRIPTIONS.totalValue}
                  sub={
                    <>
                      Rata-rata {formatRpShort(kpis.avgBillSize)} per bill
                      <span className="block">{formatRp(kpis.totalValue)}</span>
                    </>
                  }
                />
              </div>
            );
          })()}

          {/* User Growth + Metode Pendaftaran side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader className="flex items-start justify-between gap-3">
                  <div>
                    <SectionTitle>Pertumbuhan Pengguna</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {GRANULARITY_DESCRIPTIONS[granularity]}
                    </p>
                  </div>
                  <div className="flex bg-muted rounded-xs p-0.5 flex-shrink-0">
                    {["monthly", "weekly", "daily"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-xs transition-colors ${
                          granularity === g
                            ? "bg-white text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {GRANULARITY_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        tickFormatter={periodLabel}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                      <Tooltip
                        content={
                          <ChartTooltip valueFormatter={(v) => `${v} pengguna`} />
                        }
                        labelFormatter={periodLabel}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Pengguna Baru"
                        stroke={PRIMARY}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: PRIMARY }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>

            {/* Metode Pendaftaran */}
            <Card>
              <CardHeader>
                <SectionTitle>Metode Pendaftaran</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribusi Google OAuth vs Email/Password
                </p>
              </CardHeader>
              <CardBody>
                {providers.length > 0 ? (() => {
                  const META = {
                    google: { label: "Google OAuth", hint: "Daftar lewat akun Google", color: "#4285F4" },
                    local: { label: "Email / Password", hint: "Daftar manual dengan email", color: WARNING },
                  };
                  const rows = [...providers]
                    .map((e) => ({
                      ...e,
                      ...(META[e.provider] ?? { label: e.provider, hint: null, color: "#94a3b8" }),
                    }))
                    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
                  const total = rows.reduce((a, b) => a + (b.count ?? 0), 0);
                  const top = rows[0];
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Metode terbanyak</p>
                          <p className="text-lg font-black text-foreground mt-0.5 truncate">
                            {top.label}
                          </p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {formatPct(pctOf(top.count, total))} pengguna
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-foreground">
                            {total.toLocaleString("id-ID")} pengguna
                          </p>
                        </div>
                      </div>

                      <div className="flex h-2 w-full overflow-hidden rounded-xs bg-muted">
                        {rows.map((r) => (
                          <div
                            key={r.provider}
                            className="transition-all duration-700"
                            style={{ width: `${pctOf(r.count, total)}%`, background: r.color }}
                          />
                        ))}
                      </div>

                      <ul className="space-y-3">
                        {rows.map((r) => (
                          <li key={r.provider} className="flex items-start gap-2">
                            <span
                              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
                              style={{ background: r.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-foreground">{r.label}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  <span className="font-bold text-foreground">
                                    {(r.count ?? 0).toLocaleString("id-ID")}
                                  </span>{" "}
                                  ({formatPct(pctOf(r.count, total))})
                                </span>
                              </div>
                              {r.hint && (
                                <p className="text-[11px] text-muted-foreground">{r.hint}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">Belum ada data</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Activity Trend */}
          <Card>
            <CardHeader>
              <SectionTitle>Tren Aktivitas Split Bill</SectionTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jumlah split bill dibuat per bulan (6 bulan terakhir)
              </p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityTrend} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickFormatter={periodLabel}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    width={28}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatRpShort}
                    width={60}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v, name) =>
                          name === "Total Nilai" ? formatRp(v) : `${v} aktivitas`
                        }
                      />
                    }
                    labelFormatter={periodLabel}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Aktivitas"
                    fill={WARNING}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalValue"
                    name="Total Nilai"
                    stroke={PURPLE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: PURPLE }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Peak Days and Top Users Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <SectionTitle>Hari Teraktif Split Bill</SectionTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jumlah split bill berdasarkan hari pembuatan dalam seminggu (30 hari terakhir)
                  </p>
                </CardHeader>
                <CardBody>
                  {peakDays.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-8">
                      Belum ada data
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={peakDays} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} tagihan`} />} />
                        <Bar dataKey="count" name="Jumlah" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="flex flex-col">
              <CardHeader className="flex items-center justify-between gap-2">
                <div>
                  <SectionTitle>Top Pengguna Aktif</SectionTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    10 pengguna dengan split bill terbanyak
                  </p>
                </div>
                <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardBody className="p-0 overflow-y-auto max-h-[220px]" style={{ scrollbarWidth: "thin" }}>
                {topUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Belum ada data
                  </p>
                ) : (
                  <ol className="divide-y divide-border">
                    {topUsers.map((u, i) => (
                      <li
                        key={u.userId}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            i === 0
                              ? "bg-warning text-white"
                              : i === 1
                                ? "bg-slate-400 text-white"
                                : i === 2
                                  ? "bg-amber-600 text-white"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/users/${u.userId}`)}
                            className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate block text-left w-full"
                          >
                            {u.name || "Unknown User"}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email || ""}
                          </p>
                        </div>
                        <Badge variant="info" className="flex-shrink-0 items-center gap-1 text-xs">
                          <ReceiptText className="h-3 w-3" />
                          {u.splitBillCount || 0}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────── */}
      {/* TAB: PENDAPATAN & LANGGANAN                */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <div className="space-y-4">
          {(() => {
            const trend = data.revenueTrend ?? [];
            const curr = trend[trend.length - 1];
            const prev = trend[trend.length - 2];
            const momDelta =
              prev && prev.total > 0
                ? ((curr.total - prev.total) / prev.total) * 100
                : null;
            const active = kpis.totalSubscribers ?? 0;
            const expired = kpis.expiredSubscribers ?? 0;
            const subTotal = active + expired;
            const pending = kpis.pendingOrders ?? 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  title="Revenue (MTD)"
                  value={formatRpShort(kpis.revenueMTD)}
                  icon={DollarSign}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  tooltip={SUBSCRIPTION_DESCRIPTIONS.revenueMTD}
                  sub={
                    <>
                      <DeltaText delta={momDelta} suffix="vs total bulan lalu" />
                      {prev && (
                        <span className="block">
                          Bulan lalu: {formatRpShort(prev.total)}
                        </span>
                      )}
                    </>
                  }
                />
                <KpiCard
                  title="Subscriber Aktif"
                  value={active.toLocaleString("id-ID")}
                  icon={UserCheck}
                  iconColor="text-success"
                  iconBg="bg-success/10"
                  tooltip={SUBSCRIPTION_DESCRIPTIONS.activeSubscribers}
                  sub={
                    subTotal > 0
                      ? `${formatPct(pctOf(active, subTotal))} dari ${subTotal.toLocaleString("id-ID")} total subscriber`
                      : "Belum ada subscriber"
                  }
                />
                <KpiCard
                  title="Subscriber Expired"
                  value={expired.toLocaleString("id-ID")}
                  icon={UserX}
                  iconColor="text-destructive"
                  iconBg="bg-destructive/10"
                  tooltip={SUBSCRIPTION_DESCRIPTIONS.expiredSubscribers}
                  sub={
                    subTotal > 0
                      ? `${formatPct(pctOf(expired, subTotal))} dari total subscriber · potensi diperpanjang`
                      : "Belum ada subscriber"
                  }
                />
                <KpiCard
                  title="Pending Orders"
                  value={pending.toLocaleString("id-ID")}
                  icon={Clock}
                  iconColor="text-warning"
                  iconBg="bg-warning/10"
                  tooltip={SUBSCRIPTION_DESCRIPTIONS.pendingOrders}
                  sub={
                    pending > 0 ? (
                      <Link to="/orders" className="text-primary font-semibold hover:underline">
                        Tinjau pesanan pending →
                      </Link>
                    ) : (
                      "Tidak ada pesanan menunggu pembayaran"
                    )
                  }
                />
              </div>
            );
          })()}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <SectionTitle>Tren Pendapatan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total pembayaran paket langganan (6 bulan terakhir)
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {(() => {
                  const trend = data.revenueTrend ?? [];
                  const total = trend.reduce((a, b) => a + (b.total ?? 0), 0);
                  const avg = trend.length ? total / trend.length : 0;
                  const best = trend.reduce(
                    (a, b) => (a == null || b.total > a.total ? b : a),
                    null
                  );
                  const stats = [
                    { label: "Total 6 bulan", value: formatRpShort(total) },
                    { label: "Rata-rata / bulan", value: formatRpShort(avg) },
                    {
                      label: "Bulan terbaik",
                      value: best && best.total > 0 ? periodLabel(best.period) : "-",
                      sub: best && best.total > 0 ? formatRpShort(best.total) : null,
                    },
                  ];
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {stats.map((st) => (
                        <div key={st.label} className="rounded-xs bg-muted px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">{st.label}</p>
                          <p className="text-sm font-bold text-foreground">
                            {st.value}
                            {st.sub && (
                              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                                {st.sub}
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11 }}
                      tickFormatter={periodLabel}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatRpShort}
                      width={60}
                    />
                    <Tooltip
                      content={<ChartTooltip valueFormatter={formatRp} />}
                      labelFormatter={periodLabel}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Revenue"
                      stroke={SUCCESS}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: SUCCESS }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <SectionTitle>Distribusi Paket</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pembagian subscriber berdasarkan paket yang dipilih
                </p>
              </CardHeader>
              <CardBody>
                {(() => {
                  const plans = [...(data.subscriptions.planDistribution ?? [])].sort(
                    (a, b) => (b.count ?? 0) - (a.count ?? 0)
                  );
                  const total = plans.reduce((a, b) => a + (b.count ?? 0), 0);
                  if (plans.length === 0 || total === 0) {
                    return (
                      <p className="text-xs text-muted-foreground italic text-center py-8">
                        Belum ada data subscriber
                      </p>
                    );
                  }
                  const top = plans[0];
                  const max = top.count || 1;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Paket terpopuler</p>
                          <p className="text-2xl font-black text-foreground mt-0.5 truncate">
                            {top.plan}
                            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                              {formatPct(pctOf(top.count, total))} dari semua
                            </span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-foreground">
                            {total.toLocaleString("id-ID")} subscriber
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {plans.length} paket
                          </p>
                        </div>
                      </div>

                      <div className="flex h-2 w-full overflow-hidden rounded-xs bg-muted">
                        {plans.map((pl, i) => (
                          <div
                            key={pl.plan}
                            className="transition-all duration-700"
                            style={{
                              width: `${pctOf(pl.count, total)}%`,
                              background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                            }}
                          />
                        ))}
                      </div>

                      <ul className="space-y-2.5">
                        {plans.map((pl, i) => (
                          <li key={pl.plan} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2 w-2 rounded-full flex-shrink-0"
                                  style={{ background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                                />
                                <span className="font-semibold text-foreground truncate">
                                  {pl.plan}
                                </span>
                              </span>
                              <span className="text-muted-foreground flex-shrink-0">
                                <span className="font-bold text-foreground">
                                  {(pl.count ?? 0).toLocaleString("id-ID")}
                                </span>{" "}
                                ({formatPct(pctOf(pl.count, total))})
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-xs overflow-hidden">
                              <div
                                className="h-full rounded-xs transition-all duration-700"
                                style={{
                                  width: `${Math.max(2, ((pl.count ?? 0) / max) * 100)}%`,
                                  background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────── */}
      {/* TAB: FITUR & FUNNEL                        */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "features" && (
        <div className="space-y-4">
          {/* Status Penyelesaian & Pembagian Biaya Tambahan */}
          {(() => {
            const statusTotal = splitBillStatuses.reduce((a, b) => a + b.count, 0);
            const finalized =
              splitBillStatuses.find((e) => e.status === "locked")?.count ?? 0;
            const draft = statusTotal - finalized;

            const addTotal = additionalSplitTypes.reduce((a, b) => a + b.count, 0);
            const ADD_HINTS = {
              "Sama Rata": "Dibagi rata ke semua peserta",
              Proporsional: "Dibagi sesuai porsi pesanan",
            };
            const addSegments = additionalSplitTypes.map((e) => ({
              label: e.type,
              hint: ADD_HINTS[e.type],
              count: e.count ?? 0,
              dot: e.type === "Sama Rata" ? "bg-primary" : "bg-warning",
              text: e.type === "Sama Rata" ? "text-primary" : "text-warning",
            }));
            const topAdd = [...addSegments].sort((a, b) => b.count - a.count)[0];

            if (statusTotal === 0 && addTotal === 0) return null;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {statusTotal > 0 && (
                  <DistributionCard
                    title="Status Penyelesaian Tagihan"
                    headline={formatPct(pctOf(finalized, statusTotal))}
                    headlineLabel="selesai"
                    total={statusTotal}
                    totalUnit="tagihan"
                    segments={[
                      {
                        label: "Finalized",
                        hint: "Locked, tidak bisa diedit",
                        count: finalized,
                        dot: "bg-success",
                        text: "text-success",
                      },
                      {
                        label: "Draft",
                        hint: "Editable, belum selesai",
                        count: draft,
                        dot: "bg-destructive",
                        text: "text-destructive",
                      },
                    ]}
                  />
                )}
                {addTotal > 0 && (
                  <DistributionCard
                    title="Pembagian Biaya Tambahan"
                    headline={formatPct(pctOf(topAdd.count, addTotal))}
                    headlineLabel={`${topAdd.label} (terbanyak)`}
                    total={addTotal}
                    totalUnit="biaya"
                    segments={addSegments}
                  />
                )}
              </div>
            );
          })()}

          {/* New Metrics Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Marketing Funnel */}
            <Card>
              <CardHeader>
                <SectionTitle>Marketing Funnel</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konversi pengguna dari registrasi hingga engaged
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {(() => {
                  const first = funnel[0]?.count ?? 0;
                  const last = funnel[funnel.length - 1]?.count ?? 0;
                  const steps = funnel.slice(1).map((f, i) => {
                    const prev = funnel[i];
                    return {
                      from: prev.stage,
                      to: f.stage,
                      conv: pctOf(f.count, prev.count),
                      lost: Math.max(0, (prev.count ?? 0) - (f.count ?? 0)),
                    };
                  });
                  const worst = steps.reduce(
                    (a, b) => (a == null || b.conv < a.conv ? b : a),
                    null
                  );
                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Konversi total (Registered → Engaged)
                          </p>
                          <p className="text-2xl font-black text-foreground mt-0.5">
                            {formatPct(pctOf(last, first))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total registrasi</p>
                          <p className="text-sm font-bold text-foreground">
                            {first.toLocaleString("id-ID")} pengguna
                          </p>
                        </div>
                      </div>

                      <div>
                        {funnel.map((f, i) => {
                          const step = i > 0 ? steps[i - 1] : null;
                          const isWorst = step && worst && step.to === worst.to;
                          return (
                            <div key={f.stage}>
                              {step && (
                                <div className="flex items-center justify-between gap-2 py-1.5 pl-3 text-[11px]">
                                  <span className="text-muted-foreground">
                                    ↓ <span className="font-semibold text-foreground">{formatPct(step.conv)}</span> lanjut
                                    <span className="mx-1">·</span>
                                    {step.lost.toLocaleString("id-ID")} berhenti
                                  </span>
                                  {isWorst && (
                                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                      Drop-off terbesar
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <FunnelBar
                                stage={f.stage}
                                count={f.count}
                                rate={f.rate}
                                color={FUNNEL_COLORS[i]}
                                maxCount={funnelMax}
                                description={FUNNEL_DESCRIPTIONS[f.stage]}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {worst && (
                        <p className="pt-3 border-t border-border text-xs text-muted-foreground">
                          Titik terlemah ada di{" "}
                          <span className="font-semibold text-foreground">
                            {worst.from} → {worst.to}
                          </span>
                          : hanya {formatPct(worst.conv)} yang lanjut, {worst.lost.toLocaleString("id-ID")} pengguna berhenti di tahap ini.
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardBody>
            </Card>

            {/* Step Funnel Chart */}
            <Card>
              <CardHeader>
                <SectionTitle>Funnel Pembuatan Bill</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seberapa jauh pengguna menyelesaikan proses split bill
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {draftDropOff.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data
                  </p>
                ) : (() => {
                  const stepMap = Object.fromEntries(
                    draftDropOff.map((d) => [d.step, d.count])
                  );
                  const s1 = stepMap["STEP_1"] ?? 0;
                  const s2 = stepMap["STEP_2"] ?? 0;
                  const s3 = stepMap["STEP_3"] ?? 0;
                  const fin = stepMap["FINALIZED"] ?? 0;

                  // Cumulative: bills that reached each step = that step + all following steps
                  const steps = [
                    { label: "Step 1", count: s1 + s2 + s3 + fin, color: DANGER, sublabel: "Mulai membuat bill" },
                    { label: "Step 2", count: s2 + s3 + fin, color: WARNING, sublabel: "Tambah pengeluaran" },
                    { label: "Step 3", count: s3 + fin, color: PURPLE, sublabel: "Konfirmasi & metode bayar" },
                    { label: "Finalized", count: fin, color: SUCCESS, sublabel: "Berhasil diselesaikan" },
                  ];
                  const total = steps[0].count;
                  const maxCount = total || 1;
                  const transitions = steps.slice(1).map((st, i) => {
                    const prev = steps[i];
                    return {
                      from: prev.label,
                      to: st.label,
                      conv: pctOf(st.count, prev.count),
                      lost: Math.max(0, prev.count - st.count),
                    };
                  });
                  const worst = transitions.reduce(
                    (a, b) => (a == null || b.conv < a.conv ? b : a),
                    null
                  );

                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Tingkat penyelesaian (Step 1 → Finalized)
                          </p>
                          <p className="text-2xl font-black text-success mt-0.5">
                            {formatPct(pctOf(fin, total))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total bill dimulai</p>
                          <p className="text-sm font-bold text-foreground">
                            {total.toLocaleString("id-ID")} bill
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {fin.toLocaleString("id-ID")} selesai · {(total - fin).toLocaleString("id-ID")} belum
                          </p>
                        </div>
                      </div>

                      <div>
                        {steps.map((step, i) => {
                          const tr = i > 0 ? transitions[i - 1] : null;
                          const isWorst = tr && worst && tr.to === worst.to;
                          const width = total > 0 ? Math.max(6, (step.count / maxCount) * 100) : 0;
                          return (
                            <div key={step.label}>
                              {tr && (
                                <div className="flex items-center justify-between gap-2 py-1.5 pl-3 text-[11px]">
                                  <span className="text-muted-foreground">
                                    ↓ <span className="font-semibold text-foreground">{formatPct(tr.conv)}</span> lanjut
                                    <span className="mx-1">·</span>
                                    {tr.lost.toLocaleString("id-ID")} berhenti
                                  </span>
                                  {isWorst && (
                                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                      Drop-off terbesar
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black flex-shrink-0"
                                      style={{ backgroundColor: step.color }}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="font-semibold text-foreground">{step.label}</span>
                                    <span className="text-muted-foreground hidden sm:inline truncate">{step.sublabel}</span>
                                  </span>
                                  <span className="text-muted-foreground flex-shrink-0">
                                    {formatPct(pctOf(step.count, total))} dari awal
                                  </span>
                                </div>
                                <div className="h-7 bg-muted rounded-xs overflow-hidden">
                                  <div
                                    className="h-full rounded-xs flex items-center px-3 transition-all duration-700"
                                    style={{ width: `${width}%`, background: step.color }}
                                  >
                                    <span className="text-white text-[10px] font-bold whitespace-nowrap">
                                      {step.count.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {worst && (
                        <p className="pt-3 border-t border-border text-xs text-muted-foreground">
                          Pengguna paling banyak berhenti di{" "}
                          <span className="font-semibold text-foreground">
                            {worst.from} → {worst.to}
                          </span>
                          : hanya {formatPct(worst.conv)} yang lanjut, {worst.lost.toLocaleString("id-ID")} bill tidak diteruskan.
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardBody>
            </Card>
          </div>

          {/* Payment methods & group size distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Popular Payment Methods */}
            <Card>
              <CardHeader>
                <SectionTitle>Metode Pembayaran Populer</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Provider paling sering dilampirkan pada tagihan
                </p>
              </CardHeader>
              <CardBody>
                {paymentMethods.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data metode pembayaran
                  </p>
                ) : (() => {
                  const ranked = [...paymentMethods].sort(
                    (a, b) => (b.count ?? 0) - (a.count ?? 0)
                  );
                  const total = ranked.reduce((a, b) => a + (b.count ?? 0), 0);
                  const top = ranked[0];
                  const max = top?.count ?? 1;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Paling populer</p>
                          <p className="text-2xl font-black text-foreground mt-0.5 truncate">
                            {top.provider}
                            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                              {formatPct(pctOf(top.count, total))} dari semua
                            </span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-foreground">
                            {total.toLocaleString("id-ID")} lampiran
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {ranked.length} provider
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {ranked.map((m, i) => (
                          <li key={m.provider} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="w-4 text-muted-foreground font-semibold">
                                  {i + 1}
                                </span>
                                <span className="font-semibold text-foreground truncate">
                                  {m.provider}
                                </span>
                              </span>
                              <span className="text-muted-foreground flex-shrink-0">
                                <span className="font-bold text-foreground">
                                  {(m.count ?? 0).toLocaleString("id-ID")}
                                </span>{" "}
                                ({formatPct(pctOf(m.count, total))})
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-xs overflow-hidden">
                              <div
                                className="h-full rounded-xs transition-all duration-700"
                                style={{
                                  width: `${Math.max(2, ((m.count ?? 0) / max) * 100)}%`,
                                  background: PURPLE,
                                  opacity: i === 0 ? 1 : 0.55,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>

            {/* Group Size Distribution */}
            <Card>
              <CardHeader>
                <SectionTitle>Distribusi Ukuran Grup</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jumlah orang yang terlibat dalam setiap split bill
                </p>
              </CardHeader>
              <CardBody>
                {groupSizes.length === 0 || groupSizes.every((g) => !g.count) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">Belum ada data</p>
                ) : (() => {
                  const total = groupSizes.reduce((a, b) => a + (b.count ?? 0), 0);
                  const top = groupSizes.reduce((a, b) =>
                    (b.count ?? 0) > (a.count ?? 0) ? b : a
                  );
                  const max = top.count || 1;
                  const smallCount = groupSizes
                    .filter((g) => g.label === "2 Orang" || g.label === "3-5 Orang")
                    .reduce((a, b) => a + (b.count ?? 0), 0);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Ukuran paling umum</p>
                          <p className="text-2xl font-black text-foreground mt-0.5 truncate">
                            {top.label}
                            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                              {formatPct(pctOf(top.count, total))} dari semua
                            </span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-foreground">
                            {total.toLocaleString("id-ID")} tagihan
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatPct(pctOf(smallCount, total))} grup ≤ 5 orang
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2.5">
                        {groupSizes.map((g) => {
                          const isTop = g.label === top.label;
                          return (
                            <li key={g.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="font-semibold text-foreground">
                                    {g.label}
                                  </span>
                                  {isTop && (
                                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                                      Terbanyak
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-muted-foreground flex-shrink-0">
                                  <span className="font-bold text-foreground">
                                    {(g.count ?? 0).toLocaleString("id-ID")}
                                  </span>{" "}
                                  ({formatPct(pctOf(g.count, total))})
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-xs overflow-hidden">
                                <div
                                  className="h-full rounded-xs bg-primary transition-all duration-700"
                                  style={{
                                    width: `${g.count ? Math.max(2, (g.count / max) * 100) : 0}%`,
                                    opacity: isTop ? 1 : 0.55,
                                  }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────── */}
      {/* TAB: AI SCAN                                */}
      {/* ─────────────────────────────────────────── */}
      {activeTab === "aiScan" && (
        <div className="space-y-4">
          {/* KPI Cards */}
          {(() => {
            const total = scanKpis.totalAttempts ?? 0;
            const ppDelta = (recent, overall) =>
              scanKpis.last7dTotal > 0 ? recent - overall : null;
            const failureOverThreshold =
              (scanKpis.last7dTotal ?? 0) > 0 &&
              (scanKpis.last7dFailureRate ?? 0) > FAILURE_RATE_THRESHOLD;
            const topError = scanErrorBreakdown[0];
            const successBelowThreshold =
              (scanKpis.last7dTotal ?? 0) > 0 &&
              (scanKpis.last7dSuccessRate ?? 0) < SUCCESS_RATE_THRESHOLD;
            const hasRecentScans = (scanKpis.last7dTotal ?? 0) > 0;
            const successDelta = ppDelta(scanKpis.last7dSuccessRate ?? 0, scanKpis.successRate ?? 0);
            const failDelta = ppDelta(scanKpis.last7dFailureRate ?? 0, scanKpis.overallFailureRate ?? 0);
            const Pp = ({ delta, goodWhenUp }) =>
              delta == null ? null : (
                <span
                  className={`font-bold ${
                    Math.abs(delta) < 0.05
                      ? "text-muted-foreground"
                      : (delta > 0) === goodWhenUp
                        ? "text-success"
                        : "text-destructive"
                  }`}
                >
                  {delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "• "}
                  {delta.toFixed(1)} pp
                </span>
              );
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <KpiCard
                  title="Total Percobaan Scan"
                  value={total.toLocaleString("id-ID")}
                  icon={Scan}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  tooltip={SCAN_KPI_DESCRIPTIONS.totalAttempts}
                  sub={
                    <span>
                      <span className="font-bold text-success">
                        {(scanKpis.successCount ?? 0).toLocaleString("id-ID")}
                      </span>{" "}
                      berhasil ·{" "}
                      <span className="font-bold text-destructive">
                        {(scanKpis.failedCount ?? 0).toLocaleString("id-ID")}
                      </span>{" "}
                      gagal
                      <span className="block">
                        7 hari terakhir: {(scanKpis.last7dTotal ?? 0).toLocaleString("id-ID")} percobaan
                      </span>
                    </span>
                  }
                />
                <KpiCard
                  title="Tingkat Keberhasilan"
                  badge={
                    hasRecentScans ? (
                      <Badge
                        variant={successBelowThreshold ? "warning" : "success"}
                        className="text-[10px]"
                      >
                        {successBelowThreshold ? "Warning · Perlu cek" : "Sehat"}
                      </Badge>
                    ) : null
                  }
                  alert={
                    successBelowThreshold ? (
                      <>
                        <p className="font-bold">
                          Di bawah batas {SUCCESS_RATE_THRESHOLD}% (7 hari). Perlu dicek.
                        </p>
                        <p className="mt-0.5">
                          Cek provider, API key, dan kuota.
                        </p>
                      </>
                    ) : null
                  }
                  value={formatPct(scanKpis.successRate)}
                  icon={CheckCircle2}
                  iconColor="text-success"
                  iconBg="bg-success/10"
                  tooltip={`${SCAN_KPI_DESCRIPTIONS.successRate} ${SCAN_KPI_DESCRIPTIONS.last7dSuccessRate}`}
                  sub={
                    <span>
                      7 hari: <span className={`font-bold ${!hasRecentScans ? "text-foreground" : successBelowThreshold ? "text-destructive" : "text-success"}`}>{formatPct(scanKpis.last7dSuccessRate)}</span>{" "}
                      ({scanKpis.last7dSuccess ?? 0}/{scanKpis.last7dTotal ?? 0}){" "}
                      <Pp delta={successDelta} goodWhenUp />
                      <span className="block">
                        Sehat: ≥ {SUCCESS_RATE_THRESHOLD}% · Warning: &lt; {SUCCESS_RATE_THRESHOLD}% (7 hari terakhir)
                      </span>
                      <span className="block">vs keseluruhan ({scanKpis.successCount ?? 0}/{total})</span>
                    </span>
                  }
                />
                <KpiCard
                  title="Failure Rate Keseluruhan"
                  alert={
                    failureOverThreshold ? (
                      <>
                        <p className="font-bold">
                          Melebihi batas {FAILURE_RATE_THRESHOLD}% (7 hari). Perlu dicek.
                        </p>
                        {topError && (
                          <p className="mt-0.5 break-words">
                            Terbanyak: {topError.message} ({topError.count}x)
                          </p>
                        )}
                      </>
                    ) : null
                  }
                  value={formatPct(scanKpis.overallFailureRate)}
                  icon={AlertTriangle}
                  iconColor="text-destructive"
                  iconBg="bg-destructive/10"
                  tooltip={`${SCAN_KPI_DESCRIPTIONS.overallFailureRate} ${SCAN_KPI_DESCRIPTIONS.last7dFailureRate}`}
                  sub={
                    <span>
                      7 hari: <span className={`font-bold ${failureOverThreshold ? "text-destructive" : "text-success"}`}>{formatPct(scanKpis.last7dFailureRate)}</span>{" "}
                      ({scanKpis.last7dFailed ?? 0}/{scanKpis.last7dTotal ?? 0}){" "}
                      <Pp delta={failDelta} goodWhenUp={false} />
                      <span className="block">
                        Target 7 hari: &lt; {FAILURE_RATE_THRESHOLD}%
                        {scanKpis.last7dTotal > 0 && !failureOverThreshold && " · sesuai target"}
                      </span>
                      <span className="block">vs keseluruhan ({scanKpis.failedCount ?? 0}/{total})</span>
                    </span>
                  }
                />
                <KpiCard
                  title="User Unik Scan"
                  value={(scanKpis.uniqueUsers ?? 0).toLocaleString("id-ID")}
                  icon={Users}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  tooltip={`${SCAN_KPI_DESCRIPTIONS.uniqueUsers} ${SCAN_KPI_DESCRIPTIONS.uniqueGuestScans}`}
                  sub={
                    <span>
                      + {(scanKpis.uniqueGuestScans ?? 0).toLocaleString("id-ID")} guest (berdasar IP)
                      <span className="block">
                        Rata-rata{" "}
                        {scanKpis.uniqueUsers > 0
                          ? (total / scanKpis.uniqueUsers).toFixed(1)
                          : "0"}{" "}
                        percobaan per user
                      </span>
                    </span>
                  }
                />
                <KpiCard
                  title="Retry Rate (<2 menit)"
                  value={formatPct(scanKpis.retryRate)}
                  icon={RefreshCw}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  tooltip={SCAN_KPI_DESCRIPTIONS.retryRate}
                  sub={
                    <span>
                      {scanKpis.retriedCount ?? 0} dari {scanKpis.retryEligibleCount ?? 0} scan diulang
                      <span className="block">Makin tinggi, makin sering hasil scan tidak memuaskan</span>
                    </span>
                  }
                />
                <KpiCard
                  title="Fallback Rate"
                  value={formatPct(scanKpis.fallbackRate)}
                  icon={Shuffle}
                  iconColor="text-warning"
                  iconBg="bg-warning/10"
                  tooltip={SCAN_KPI_DESCRIPTIONS.fallbackRate}
                  sub="Scan yang harus pindah ke provider cadangan"
                />
              </div>
            );
          })()}

          {/* Trend + Provider Health */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader className="flex items-start justify-between gap-3">
                  <div>
                    <SectionTitle>Tren Scan (Berhasil vs Gagal)</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SCAN_GRANULARITY_DESCRIPTIONS[scanGranularity]}
                    </p>
                  </div>
                  <div className="flex bg-muted rounded-xs p-0.5 flex-shrink-0">
                    {["monthly", "weekly", "daily"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setScanGranularity(g)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-xs transition-colors ${
                          scanGranularity === g
                            ? "bg-white text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {GRANULARITY_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart
                      data={scanTrend.map((d) => ({
                        ...d,
                        failureRate: pctOf(d.failed, d.success + d.failed),
                      }))}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        tickFormatter={periodLabel}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        width={28}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        width={36}
                      />
                      <Tooltip content={<ScanTrendTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        yAxisId="left"
                        dataKey="success"
                        name="Berhasil"
                        stackId="scan"
                        fill={SUCCESS}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="failed"
                        name="Gagal"
                        stackId="scan"
                        fill={DANGER}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="failureRate"
                        name="Failure Rate"
                        stroke={WARNING}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: WARNING }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>

            {/* Provider Health */}
            <Card>
              <CardHeader>
                <SectionTitle>Provider AI Paling Sering Digunakan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OpenRouter & Groq (race, utama) → Gemini (fallback)
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {(() => {
                  const hasAttempts = providerAttempts.attemptedRequests > 0;
                  // Per-attempt outcomes when available, otherwise the legacy
                  // per-request outcome (provider that ended the request).
                  const source = hasAttempts
                    ? providerAttempts.providers
                    : scanProviderStats.map((p) => ({
                        provider: p.provider,
                        success: p.success,
                        failed: p.failed,
                        attempts: p.total,
                      }));
                  const rows = [...source].sort((a, b) => b.success - a.success);
                  const totalServed = rows.reduce((a, b) => a + b.success, 0);
                  if (totalServed === 0 && rows.every((r) => r.attempts === 0)) {
                    return (
                      <p className="text-xs text-muted-foreground italic text-center py-8">
                        Belum ada data
                      </p>
                    );
                  }
                  const top = rows[0];
                  const max = top.success || 1;
                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Paling sering digunakan</p>
                          <p className="text-lg font-black text-foreground mt-0.5 truncate">
                            {SCAN_PROVIDER_LABELS[top.provider]}
                            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                              {formatPct(pctOf(top.success, totalServed))} dari scan berhasil
                            </span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            Scan berhasil
                            <UiTooltip
                              content={
                                hasAttempts
                                  ? "Berhasil/gagal dihitung per percobaan provider (30 hari terakhir). Provider yang kalah race tidak dihitung gagal."
                                  : "Berhasil/gagal di sini adalah hasil akhir permintaan; kegagalan provider yang kalah race belum tercatat. Data per percobaan muncul setelah scan baru tercatat."
                              }
                            />
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {totalServed.toLocaleString("id-ID")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {hasAttempts ? "30 hari terakhir" : "sepanjang waktu"}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {rows.map((p, i) => {
                          const rate = pctOf(p.success, p.attempts);
                          return (
                            <li key={p.provider} className="space-y-1">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="w-4 text-muted-foreground font-semibold">{i + 1}</span>
                                  <span
                                    className="h-2 w-2 rounded-full flex-shrink-0"
                                    style={{ background: SCAN_PROVIDER_COLORS[p.provider] }}
                                  />
                                  <span className="font-semibold text-foreground truncate">
                                    {SCAN_PROVIDER_LABELS[p.provider]}
                                  </span>
                                </span>
                                <span className="text-muted-foreground flex-shrink-0">
                                  <span className="font-bold text-foreground">
                                    {p.success.toLocaleString("id-ID")}
                                  </span>{" "}
                                  scan ({formatPct(pctOf(p.success, totalServed))})
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-xs overflow-hidden">
                                <div
                                  className="h-full rounded-xs transition-all duration-700"
                                  style={{
                                    width: `${p.success > 0 ? Math.max(2, (p.success / max) * 100) : 0}%`,
                                    background: SCAN_PROVIDER_COLORS[p.provider],
                                    opacity: i === 0 ? 1 : 0.6,
                                  }}
                                />
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-semibold text-success">
                                  {p.success.toLocaleString("id-ID")} berhasil
                                </span>{" "}
                                ·{" "}
                                <span className="font-semibold text-destructive">
                                  {p.failed.toLocaleString("id-ID")} gagal
                                </span>
                                {p.attempts > 0 && <> · success rate {formatPct(rate)}</>}
                              </p>
                            </li>
                          );
                        })}
                      </ul>

                    </>
                  );
                })()}
              </CardBody>
            </Card>
          </div>

          {/* Model Usage Trend */}
          <Card>
            <CardHeader className="flex items-start justify-between gap-3">
              <div>
                <SectionTitle>Tren Penggunaan Model</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jumlah scan per model AI —{" "}
                  {scanGranularity === "daily"
                    ? "30 hari terakhir"
                    : scanGranularity === "weekly"
                      ? "12 minggu terakhir"
                      : "6 bulan terakhir"}
                </p>
              </div>
              <div className="flex bg-muted rounded-xs p-0.5 flex-shrink-0">
                {["monthly", "weekly", "daily"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setScanGranularity(g)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-xs transition-colors ${
                      scanGranularity === g
                        ? "bg-white text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {GRANULARITY_LABELS[g]}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardBody>
              {modelTrend.every((d) => d.total === 0) ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">
                  Belum ada data
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={modelTrend} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11 }}
                      tickFormatter={periodLabel}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                    <Tooltip content={<ModelTrendTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => SCAN_PROVIDER_LABELS[value] || value}
                    />
                    <Bar
                      dataKey="openrouter"
                      name="openrouter"
                      stackId="model"
                      fill={SCAN_PROVIDER_COLORS.openrouter}
                    />
                    <Bar
                      dataKey="groq"
                      name="groq"
                      stackId="model"
                      fill={SCAN_PROVIDER_COLORS.groq}
                    />
                    <Bar
                      dataKey="gemini"
                      name="gemini"
                      stackId="model"
                      fill={SCAN_PROVIDER_COLORS.gemini}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* Error Category Per Day + Retry Rate Trend */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Error Category Per Day */}
            <Card>
              <CardHeader>
                <SectionTitle>Penyebab Kegagalan per Hari</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kategori error scan gagal, 30 hari terakhir
                </p>
              </CardHeader>
              <CardBody>
                {errorCategoryTrend.every(
                  (d) => d.quotaGemini + d.modelGroq + d.openrouterNotSet + d.lainnya === 0
                ) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Tidak ada kegagalan tercatat dalam 30 hari terakhir 🎉
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={errorCategoryTrend} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={periodLabel}
                        interval={Math.max(0, Math.floor(errorCategoryTrend.length / 10) - 1)}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                      <Tooltip
                        content={<ChartTooltip valueFormatter={(v) => `${v} kegagalan`} />}
                        labelFormatter={periodLabel}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value) => ERROR_CATEGORY_LABELS[value] || value}
                      />
                      {["openrouterNotSet", "modelGroq", "quotaGemini", "lainnya"].map((cat) => (
                        <Bar
                          key={cat}
                          dataKey={cat}
                          name={cat}
                          stackId="errors"
                          fill={ERROR_CATEGORY_COLORS[cat]}
                          radius={cat === "lainnya" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Retry Rate Trend */}
            <Card>
              <CardHeader>
                <SectionTitle>Retry per Hari</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scan ulang dari IP/user sama dalam &lt;2 menit setelah gagal, 30 hari terakhir
                </p>
              </CardHeader>
              <CardBody>
                {retryRateTrend.every((d) => d.totalFailed === 0) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Tidak ada kegagalan tercatat dalam 30 hari terakhir 🎉
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={retryRateTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={periodLabel}
                        interval={Math.max(0, Math.floor(retryRateTrend.length / 10) - 1)}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                      <Tooltip
                        content={<ChartTooltip valueFormatter={(v) => `${v} scan`} />}
                        labelFormatter={periodLabel}
                      />
                      <Line
                        type="monotone"
                        dataKey="retried"
                        name="Retry"
                        stroke={PURPLE}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: PURPLE }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* New Scanner Adoption Trend + Peak Days */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* AI Scan Adoption */}
            <Card>
              <CardHeader>
                <SectionTitle>Adopsi Fitur AI Scan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seberapa banyak user yang menggunakan scan struk
                </p>
              </CardHeader>
              <CardBody>
                {(() => {
                  const totalUsers = kpis.totalUsers ?? 0;
                  const adopted = featureAdoption.scanAdopted ?? 0;
                  const exhausted = featureAdoption.scanExhausted ?? 0;
                  const converted = featureAdoption.scanExhaustedAndSubscribed ?? 0;
                  const notYet = Math.max(0, totalUsers - adopted);
                  const exhaustedOfAdopted = Math.min(100, pctOf(exhausted, adopted));
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            Pengguna yang pernah scan
                            <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.scanAdopted} />
                          </p>
                          <p className="text-2xl font-black text-foreground mt-0.5">
                            {formatPct(featureAdoption.scanAdoptionRate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Pengguna</p>
                          <p className="text-sm font-bold text-foreground">
                            {adopted.toLocaleString("id-ID")} / {totalUsers.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="flex h-2 w-full overflow-hidden rounded-xs bg-muted">
                        <div
                          className="h-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, featureAdoption.scanAdoptionRate ?? 0)}%`,
                            background: PRIMARY,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: "Total scan berhasil",
                            value: (featureAdoption.totalScans ?? 0).toLocaleString("id-ID"),
                            tip: AI_ADOPTION_DESCRIPTIONS.totalScans,
                          },
                          {
                            label: "Rata-rata / user",
                            value: `${featureAdoption.avgScansPerUser ?? 0}x`,
                            tip: AI_ADOPTION_DESCRIPTIONS.avgScans,
                          },
                          {
                            label: "Belum pernah scan",
                            value: notYet.toLocaleString("id-ID"),
                          },
                        ].map((st) => (
                          <div key={st.label} className="rounded-xs bg-muted px-3 py-2">
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              {st.label}
                              {st.tip && <UiTooltip content={st.tip} />}
                            </p>
                            <p className="text-sm font-bold text-foreground">{st.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-border space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground min-w-0">
                            <Zap className="h-3.5 w-3.5 flex-shrink-0 text-warning" />
                            <span className="whitespace-nowrap">Kuota habis (power users)</span>
                            <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.scanExhausted} />
                          </span>
                          <span className="font-bold text-foreground whitespace-nowrap flex-shrink-0">
                            {exhausted.toLocaleString("id-ID")} pengguna
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-xs overflow-hidden">
                          <div
                            className="h-full rounded-xs transition-all duration-700"
                            style={{ width: `${exhaustedOfAdopted}%`, background: WARNING }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {formatPct(exhaustedOfAdopted)}
                          </span>{" "}
                          dari pengguna yang pernah scan
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {exhausted > 0 ? (
                            <>
                              <span className="font-bold text-foreground">
                                {converted.toLocaleString("id-ID")}
                              </span>{" "}
                              dari {exhausted.toLocaleString("id-ID")} sudah berlangganan (
                              {formatPct(featureAdoption.powerUserConversionRate)} konversi)
                            </>
                          ) : (
                            "Belum ada pengguna yang menghabiskan kuota"
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle>User Baru per Minggu (Adopsi Scan)</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jumlah pengguna yang melakukan percobaan scan struk pertama kalinya, per minggu (sebulan terakhir)
                </p>
              </CardHeader>
              <CardBody>
                {newScannerTrend.every((d) => d.count === 0) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data
                  </p>
                ) : (() => {
                  const weekLabelByPeriod = Object.fromEntries(
                    newScannerTrend.map((d) => [d.period, weekRangeLabel(d.weekStart)])
                  );
                  return (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={newScannerTrend} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(period) => weekLabelByPeriod[period] || periodLabel(period)}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                      <Tooltip
                        content={
                          <ChartTooltip
                            valueFormatter={(v) => `${v} adopter baru`}
                            labelFormatter={(period) => weekLabelByPeriod[period] || periodLabel(period)}
                          />
                        }
                      />
                      <Bar dataKey="count" name="Adopter Baru" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                      {incidentPeriod && newScannerTrend.some((d) => d.period === incidentPeriod) && (
                        <ReferenceLine
                          x={incidentPeriod}
                          stroke={DANGER}
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "Insiden Groq (18 Jul)",
                            position: "top",
                            fill: DANGER,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                  );
                })()}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle>Hari Teraktif Scan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jumlah percobaan scan per hari dalam seminggu (30 hari terakhir)
                </p>
              </CardHeader>
              <CardBody>
                {scanPeakDays.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={scanPeakDays} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} scan`} />} />
                      <Bar dataKey="count" name="Jumlah" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Top Scanning Users */}
          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <div>
                <SectionTitle>Top Pengguna Scan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  10 pengguna dengan jumlah scan struk terbanyak
                </p>
              </div>
              <Scan className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardBody className="p-0 overflow-y-auto max-h-[280px]" style={{ scrollbarWidth: "thin" }}>
              {topScanUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada data
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {topScanUsers.map((u, i) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                          i === 0
                            ? "bg-warning text-white"
                            : i === 1
                              ? "bg-slate-400 text-white"
                              : i === 2
                                ? "bg-amber-600 text-white"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/users/${u.userId}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors truncate block text-left w-full"
                        >
                          {u.name || "Unknown User"}
                        </button>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email || ""}
                        </p>
                      </div>
                      <Badge variant="info" className="flex-shrink-0 items-center gap-1 text-xs">
                        <Scan className="h-3 w-3" />
                        {u.count || 0}
                      </Badge>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {/* Error Breakdown */}
          <Card>
            <CardHeader>
              <SectionTitle>Penyebab Kegagalan Scan Terbanyak</SectionTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pesan error yang paling sering muncul dalam 7 hari terakhir (semua provider)
              </p>
            </CardHeader>
            <CardBody className="p-0 overflow-y-auto max-h-[260px]" style={{ scrollbarWidth: "thin" }}>
              {scanErrorBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada kegagalan dalam 7 hari terakhir 🎉
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {scanErrorBreakdown.map((e, i) => (
                    <li
                      key={`${e.message}-${i}`}
                      className="flex items-start gap-3 px-5 py-3"
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 bg-destructive/10 text-destructive">
                        {i + 1}
                      </span>
                      <p className="flex-1 min-w-0 text-xs text-foreground break-words">
                        {e.message}
                      </p>
                      <Badge variant="danger" className="flex-shrink-0 text-xs">
                        {e.count}x
                      </Badge>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
