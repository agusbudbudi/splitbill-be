import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Receipt,
  Star,
  TrendingUp,
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
  Tooltip as UiTooltip,
} from "../components/ui";

const AI_ADOPTION_DESCRIPTIONS = {
  scanAdopted:
    "Persentase pengguna yang telah mencoba fitur AI Scan minimal satu kali dari total seluruh pengguna.",
  scanExhausted:
    "Jumlah pengguna yang telah menggunakan seluruh kuota scan gratis mereka (limit 3 scan).",
  totalScans:
    "Total akumulasi seluruh pemrosesan struk yang berhasil dilakukan oleh sistem AI.",
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
  weekly: "Registrasi baru per minggu (12 minggu terakhir)",
  daily: "Registrasi baru per hari (30 hari terakhir)",
};

const SCAN_GRANULARITY_DESCRIPTIONS = {
  monthly: "Scan berhasil vs gagal per bulan (6 bulan terakhir)",
  weekly: "Scan berhasil vs gagal per minggu (12 minggu terakhir)",
  daily: "Scan berhasil vs gagal per hari (30 hari terakhir)",
};

const PRIMARY = "#479fea";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const PURPLE = "#a78bfa";

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
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
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
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-white mb-1.5">{periodLabel(label)}</p>
      <p style={{ color: SUCCESS }}>Berhasil: {success}</p>
      <p style={{ color: DANGER }}>Gagal: {failed}</p>
      <p style={{ color: WARNING }}>Failure rate: {formatPct(failureRate)}</p>
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
      <div className="h-8 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center px-3 transition-all duration-700"
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
    trend: scanTrend = [],
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Total Pengguna"
              value={
                <div className="flex items-baseline gap-2">
                  <span>{(kpis.totalUsers ?? 0).toLocaleString("id-ID")}</span>
                  {kpis.newUsersToday > 0 && (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                      +{kpis.newUsersToday} New
                    </span>
                  )}
                </div>
              }
              icon={Users}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              tooltip={KPI_DESCRIPTIONS.totalUsers}
            />
            <StatCard
              title="Terverifikasi"
              value={`${(kpis.verifiedUsers ?? 0).toLocaleString("id-ID")} (${formatPct(kpis.verifiedRate)})`}
              icon={UserCheck}
              iconColor="text-success"
              iconBg="bg-success/10"
              tooltip={KPI_DESCRIPTIONS.verifiedUsers}
            />
            <StatCard
              title="Total Split Bill"
              value={
                <div className="flex items-baseline gap-2">
                  <span>{(kpis.totalBills ?? 0).toLocaleString("id-ID")}</span>
                  {kpis.newBillsToday > 0 && (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                      +{kpis.newBillsToday} New
                    </span>
                  )}
                </div>
              }
              icon={Receipt}
              iconColor="text-warning"
              iconBg="bg-warning/10"
              tooltip={KPI_DESCRIPTIONS.totalBills}
            />
            <StatCard
              title="Total Nilai Ditagih"
              value={formatRpShort(kpis.totalValue)}
              icon={Wallet}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
              tooltip={KPI_DESCRIPTIONS.totalValue}
            />
            <StatCard
              title="Avg Ukuran Tagihan"
              value={formatRpShort(kpis.avgBillSize)}
              icon={TrendingUp}
              iconColor="text-secondary-foreground"
              iconBg="bg-secondary"
              tooltip={KPI_DESCRIPTIONS.avgBill}
            />
            <StatCard
              title="Rating Rata-rata"
              value={`${kpis.avgRating} ⭐`}
              icon={Star}
              iconColor="text-warning"
              iconBg="bg-warning/10"
              tooltip={KPI_DESCRIPTIONS.avgRating}
            />
          </div>

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
                  <div className="flex bg-muted rounded-md p-0.5 flex-shrink-0">
                    {["monthly", "weekly", "daily"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${
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
              <CardBody className="flex flex-col items-center justify-center gap-4">
                {providers.length > 0 ? (
                  <>
                    <div className="w-full h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={providers}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={0}
                            dataKey="count"
                            nameKey="provider"
                          >
                            {providers.map((entry) => (
                              <Cell
                                key={entry.provider}
                                fill={entry.provider === "google" ? "#4285F4" : WARNING}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={
                              <ChartTooltip valueFormatter={(v) => `${v} pengguna`} />
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 w-full text-xs">
                      {providers.map((entry) => (
                        <div
                          key={entry.provider}
                          className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: entry.provider === "google" ? "#4285F4" : WARNING,
                              }}
                            />
                            <span className="font-medium text-foreground capitalize">
                              {entry.provider === "google" ? "Google OAuth" : "Email / Password"}
                            </span>
                          </div>
                          <span className="text-muted-foreground font-bold">
                            {entry.count} ({formatPct(pctOf(entry.count, kpis.totalUsers))})
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
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
                    Jumlah split bill berdasarkan hari pembuatan dalam seminggu
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
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Receipt className="h-3 w-3" />
                          {u.splitBillCount || 0}
                        </span>
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
          {/* Subscription KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Subscriber Aktif"
              value={(kpis.totalSubscribers ?? 0).toLocaleString("id-ID")}
              icon={UserCheck}
              iconColor="text-success"
              iconBg="bg-success/10"
              tooltip={SUBSCRIPTION_DESCRIPTIONS.activeSubscribers}
            />
            <StatCard
              title="Subscriber Expired"
              value={(kpis.expiredSubscribers ?? 0).toLocaleString("id-ID")}
              icon={UserX}
              iconColor="text-danger"
              iconBg="bg-danger/10"
              tooltip={SUBSCRIPTION_DESCRIPTIONS.expiredSubscribers}
            />
            <StatCard
              title="Revenue (MTD)"
              value={formatRpShort(kpis.revenueMTD)}
              icon={DollarSign}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              tooltip={SUBSCRIPTION_DESCRIPTIONS.revenueMTD}
            />
            <StatCard
              title="Pending Orders"
              value={(kpis.pendingOrders ?? 0).toLocaleString("id-ID")}
              icon={Clock}
              iconColor="text-warning"
              iconBg="bg-warning/10"
              tooltip={SUBSCRIPTION_DESCRIPTIONS.pendingOrders}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <SectionTitle>Tren Pendapatan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total pembayaran paket langganan (6 bulan terakhir)
                </p>
              </CardHeader>
              <CardBody>
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
              <CardBody className="flex flex-col md:flex-row items-center gap-6 justify-center">
                <div className="w-full h-[200px] max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.subscriptions.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="count"
                        nameKey="plan"
                      >
                        {data.subscriptions.planDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip valueFormatter={(v) => `${v} subscriber`} />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto min-w-[150px]">
                  {data.subscriptions.planDistribution.map((entry, index) => (
                    <div
                      key={entry.plan}
                      className="flex items-center justify-between gap-4 border-b border-border/50 pb-1.5 last:border-0 last:pb-0 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              FUNNEL_COLORS[index % FUNNEL_COLORS.length],
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {entry.plan}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-bold">
                        {entry.count}
                      </span>
                    </div>
                  ))}
                  {data.subscriptions.planDistribution.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center">
                      Belum ada data subscriber
                    </p>
                  )}
                </div>
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
          {/* Marketing Funnel */}
          <Card>
              <CardHeader>
                <SectionTitle>Marketing Funnel</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konversi pengguna dari registrasi hingga engaged
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {funnel.map((f, i) => (
                  <FunnelBar
                    key={f.stage}
                    stage={f.stage}
                    count={f.count}
                    rate={f.rate}
                    color={FUNNEL_COLORS[i]}
                    maxCount={funnelMax}
                    description={FUNNEL_DESCRIPTIONS[f.stage]}
                  />
                ))}
                <div className="pt-2 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Reg → Verified</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPct(funnel[1]?.rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Verified → Activated
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPct(pctOf(funnel[2]?.count, funnel[1]?.count))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Activated → Engaged
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPct(pctOf(funnel[3]?.count, funnel[2]?.count))}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

          {/* New Metrics Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Step Funnel Chart */}
            <Card>
              <CardHeader>
                <SectionTitle>Funnel Pembuatan Bill</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seberapa jauh pengguna menyelesaikan proses split bill
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                {draftDropOff.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data
                  </p>
                ) : (() => {
                  // Build a map of raw counts per step
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
                    { label: "Finalized", count: fin, color: SUCCESS, sublabel: "Berhasil diselesaikan ✓" },
                  ];
                  const maxCount = steps[0].count || 1;

                  return steps.map((step, i) => {
                    const width = maxCount > 0 ? Math.max(6, (step.count / maxCount) * 100) : 0;
                    const prevCount = i > 0 ? steps[i - 1].count : step.count;
                    const dropOffCount = prevCount - step.count;
                    const conversionRate = prevCount > 0 ? pctOf(step.count, prevCount) : 100;

                    return (
                      <div key={step.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black flex-shrink-0"
                              style={{ backgroundColor: step.color }}
                            >
                              {i + 1}
                            </span>
                            <span className="font-semibold text-foreground">{step.label}</span>
                            <span className="text-muted-foreground hidden sm:inline">{step.sublabel}</span>
                          </span>
                          <span className="text-muted-foreground flex items-center gap-2">
                            {i > 0 && dropOffCount > 0 && (
                              <span className="text-[10px] text-destructive/70">
                                -{dropOffCount} drop-off
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              {step.count.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: step.color + "20", color: step.color }}>
                              {formatPct(i === 0 ? 100 : conversionRate)}
                            </span>
                          </span>
                        </div>
                        <div className="h-7 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                            style={{ width: `${width}%`, background: step.color }}
                          >
                            <span className="text-white text-[10px] font-bold whitespace-nowrap">
                              {step.count.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Completion Rate summary */}
                {draftDropOff.length > 0 && (() => {
                  const stepMap = Object.fromEntries(draftDropOff.map((d) => [d.step, d.count]));
                  const total = (stepMap["STEP_1"] ?? 0) + (stepMap["STEP_2"] ?? 0) + (stepMap["STEP_3"] ?? 0) + (stepMap["FINALIZED"] ?? 0);
                  const fin = stepMap["FINALIZED"] ?? 0;
                  const rate = pctOf(fin, total);
                  return (
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tingkat Penyelesaian Keseluruhan</span>
                      <span className="font-bold text-success">{formatPct(rate)} ({fin.toLocaleString("id-ID")} selesai)</span>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>

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
                ) : (
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart
                      data={paymentMethods}
                      margin={{ left: 0, right: 4, top: 10, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="provider" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} allowDecimals={false} width={25} />
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} kali`} />} />
                      <Bar dataKey="count" name="Penggunaan" fill={PURPLE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* New row for group sizes, split types, and completion status */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Split Bill Completion Status */}
            <Card>
              <CardHeader>
                <SectionTitle>Status Penyelesaian</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tagihan selesai (locked) vs masih draf (editable)
                </p>
              </CardHeader>
              <CardBody className="flex flex-col items-center justify-center gap-4">
                {splitBillStatuses.length > 0 ? (
                  <>
                    <div className="w-full h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={splitBillStatuses}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={0}
                            dataKey="count"
                            nameKey="status"
                          >
                            {splitBillStatuses.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={entry.status === "locked" ? SUCCESS : DANGER}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={
                              <ChartTooltip valueFormatter={(v) => `${v} tagihan`} />
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 w-full text-xs">
                      {splitBillStatuses.map((entry) => {
                        const total = splitBillStatuses.reduce((a, b) => a + b.count, 0);
                        return (
                          <div
                            key={entry.status}
                            className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: entry.status === "locked" ? "#22c55e" : "#ef4444",
                                }}
                              />
                              <span className="font-medium text-foreground">
                                {entry.status === "locked" ? "Finalized" : "Draft"}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-bold">
                              {entry.count} ({formatPct(pctOf(entry.count, total))})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">Belum ada data</p>
                )}
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
              <CardBody className="flex flex-col items-center justify-center gap-4">
                {groupSizes.length > 0 ? (
                  <>
                    <div className="w-full h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={groupSizes}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={0}
                            dataKey="count"
                            nameKey="label"
                          >
                            {groupSizes.map((entry, idx) => {
                              const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a78bfa", "#94a3b8"];
                              return (
                                <Cell
                                  key={entry.label}
                                  fill={colors[idx % colors.length]}
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip
                            content={
                              <ChartTooltip valueFormatter={(v) => `${v} tagihan`} />
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 w-full text-xs">
                      {groupSizes.map((entry, idx) => {
                        const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a78bfa", "#94a3b8"];
                        const total = groupSizes.reduce((a, b) => a + b.count, 0);
                        return (
                          <div
                            key={entry.label}
                            className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: colors[idx % colors.length],
                                }}
                              />
                              <span className="font-medium text-foreground">
                                {entry.label}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-bold">
                              {entry.count} ({formatPct(pctOf(entry.count, total))})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">Belum ada data</p>
                )}
              </CardBody>
            </Card>

            {/* Split Type for Additional Expenses */}
            <Card>
              <CardHeader>
                <SectionTitle>Pembagian Biaya Tambahan</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Metode pembagian biaya tambahan (pajak, diskon, dll)
                </p>
              </CardHeader>
              <CardBody className="flex flex-col items-center justify-center gap-4">
                {additionalSplitTypes.length > 0 && additionalSplitTypes.some(t => t.count > 0) ? (
                  <>
                    <div className="w-full h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={additionalSplitTypes}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={0}
                            dataKey="count"
                            nameKey="type"
                          >
                            {additionalSplitTypes.map((entry) => (
                              <Cell
                                key={entry.type}
                                fill={entry.type === "Sama Rata" ? "#3b82f6" : "#f59e0b"}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={
                              <ChartTooltip valueFormatter={(v) => `${v} kali`} />
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 w-full text-xs">
                      {additionalSplitTypes.map((entry) => {
                        const total = additionalSplitTypes.reduce((a, b) => a + b.count, 0);
                        return (
                          <div
                            key={entry.type}
                            className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: entry.type === "Sama Rata" ? "#3b82f6" : "#f59e0b",
                                }}
                              />
                              <span className="font-medium text-foreground">
                                {entry.type}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-bold">
                              {entry.count} ({formatPct(pctOf(entry.count, total))})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data biaya tambahan
                  </p>
                )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Total Percobaan Scan"
              value={
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span>{(scanKpis.totalAttempts ?? 0).toLocaleString("id-ID")}</span>
                  <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                    {(scanKpis.successCount ?? 0).toLocaleString("id-ID")} berhasil
                  </span>
                  <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                    {(scanKpis.failedCount ?? 0).toLocaleString("id-ID")} gagal
                  </span>
                </div>
              }
              icon={Scan}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              tooltip={SCAN_KPI_DESCRIPTIONS.totalAttempts}
            />
            <StatCard
              title="Tingkat Keberhasilan"
              value={
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span>{formatPct(scanKpis.successRate)}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({scanKpis.successCount ?? 0}/{scanKpis.totalAttempts ?? 0})
                  </span>
                  <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                    7 hari: {formatPct(scanKpis.last7dSuccessRate)} ({scanKpis.last7dSuccess ?? 0}/{scanKpis.last7dTotal ?? 0})
                  </span>
                </div>
              }
              icon={CheckCircle2}
              iconColor="text-success"
              iconBg="bg-success/10"
              tooltip={`${SCAN_KPI_DESCRIPTIONS.successRate} ${SCAN_KPI_DESCRIPTIONS.last7dSuccessRate}`}
            />
            <StatCard
              title="Failure Rate Keseluruhan"
              value={
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span>{formatPct(scanKpis.overallFailureRate)}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({scanKpis.failedCount ?? 0}/{scanKpis.totalAttempts ?? 0})
                  </span>
                  <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                    7 hari: {formatPct(scanKpis.last7dFailureRate)} ({scanKpis.last7dFailed ?? 0}/{scanKpis.last7dTotal ?? 0})
                  </span>
                </div>
              }
              icon={AlertTriangle}
              iconColor="text-destructive"
              iconBg="bg-destructive/10"
              tooltip={`${SCAN_KPI_DESCRIPTIONS.overallFailureRate} ${SCAN_KPI_DESCRIPTIONS.last7dFailureRate}`}
            />
            <StatCard
              title="User Unik Scan"
              value={
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span>{(scanKpis.uniqueUsers ?? 0).toLocaleString("id-ID")}</span>
                  <span className="text-[10px] font-bold text-secondary-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                    {(scanKpis.uniqueGuestScans ?? 0).toLocaleString("id-ID")} guest (IP)
                  </span>
                </div>
              }
              icon={Users}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
              tooltip={`${SCAN_KPI_DESCRIPTIONS.uniqueUsers} ${SCAN_KPI_DESCRIPTIONS.uniqueGuestScans}`}
            />
            <StatCard
              title="Retry Rate (<2 menit)"
              value={
                <div className="flex items-baseline gap-2">
                  <span>{formatPct(scanKpis.retryRate)}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({scanKpis.retriedCount ?? 0}/{scanKpis.retryEligibleCount ?? 0})
                  </span>
                </div>
              }
              icon={RefreshCw}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
              tooltip={SCAN_KPI_DESCRIPTIONS.retryRate}
            />
            <StatCard
              title="Fallback Rate"
              value={formatPct(scanKpis.fallbackRate)}
              icon={Shuffle}
              iconColor="text-warning"
              iconBg="bg-warning/10"
              tooltip={SCAN_KPI_DESCRIPTIONS.fallbackRate}
            />
          </div>

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
                  <div className="flex bg-muted rounded-md p-0.5 flex-shrink-0">
                    {["monthly", "weekly", "daily"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setScanGranularity(g)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${
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
                <SectionTitle>Kesehatan Provider</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OpenRouter & Groq (race, utama) → Gemini (fallback)
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                {scanProviderStats.every((p) => p.total === 0) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    Belum ada data
                  </p>
                ) : (
                  scanProviderStats.map((p) => {
                    const rate = pctOf(p.success, p.total);
                    return (
                      <div key={p.provider} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {SCAN_PROVIDER_LABELS[p.provider]}
                          </span>
                          <span className="text-muted-foreground">
                            {p.success}/{p.total} berhasil ({formatPct(rate)})
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full transition-all duration-700"
                            style={{
                              width: `${p.total > 0 ? (p.success / p.total) * 100 : 0}%`,
                              background: SCAN_PROVIDER_COLORS[p.provider],
                            }}
                          />
                          <div
                            className="h-full bg-destructive/40 transition-all duration-700"
                            style={{
                              width: `${p.total > 0 ? (p.failed / p.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          </div>

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
              <CardBody className="space-y-5">
                {/* Adopted */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Scan className="h-3.5 w-3.5 text-primary" />
                      Sudah Pakai Scan
                      <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.scanAdopted} />
                    </span>
                    <span className="text-muted-foreground">
                      {featureAdoption.scanAdopted} / {kpis.totalUsers} (
                      {formatPct(featureAdoption.scanAdoptionRate)})
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${featureAdoption.scanAdoptionRate ?? 0}%`,
                        background: PRIMARY,
                      }}
                    />
                  </div>
                </div>

                {/* Exhausted */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-warning" />
                      Kuota Habis (Power Users)
                      <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.scanExhausted} />
                    </span>
                    <span className="text-muted-foreground">
                      {featureAdoption.scanExhausted} pengguna
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pctOf(featureAdoption.scanExhausted, kpis.totalUsers)}%`,
                        background: WARNING,
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle>User Baru per Minggu (Adopsi Scan)</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jumlah pengguna yang melakukan percobaan scan struk pertama kalinya, per minggu (12 minggu terakhir)
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
                      {incidentPeriod && (
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
                  Jumlah percobaan scan per hari dalam seminggu
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
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Scan className="h-3 w-3" />
                        {u.count || 0}
                      </span>
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
                Pesan error yang paling sering muncul (semua provider)
              </p>
            </CardHeader>
            <CardBody className="p-0 overflow-y-auto max-h-[260px]" style={{ scrollbarWidth: "thin" }}>
              {scanErrorBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada kegagalan tercatat 🎉
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
                      <span className="flex-shrink-0 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                        {e.count}x
                      </span>
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
