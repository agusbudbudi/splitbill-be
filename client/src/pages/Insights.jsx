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
  Zap,
  Target,
  CreditCard,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
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

const PRIMARY = "#479fea";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const PURPLE = "#a78bfa";

const FUNNEL_COLORS = [PRIMARY, SUCCESS, WARNING, PURPLE];
const STAR_COLORS = [DANGER, WARNING, WARNING, SUCCESS, SUCCESS];

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
function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
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
          {(count ?? 0).toLocaleString("id-ID")} pengguna ({rate}%)
        </span>
      </div>
      <div className="h-8 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center px-3 transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        >
          <span className="text-white text-xs font-bold">{rate}%</span>
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

  const fetchInsights = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/insights?granularity=${granularity}`);
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
    [granularity],
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
    reviews,
    topUsers = [],
  } = data || {};
  const funnelMax = funnel[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Insight & Analitik
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gambaran performa platform, pertumbuhan pengguna, dan marketing
            funnel.
          </p>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

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
          value={`${(kpis.verifiedUsers ?? 0).toLocaleString("id-ID")} (${kpis.verifiedRate}%)`}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
          tooltip={KPI_DESCRIPTIONS.verifiedUsers}
        />
        <StatCard
          title="Total Split Bill"
          value={(kpis.totalBills ?? 0).toLocaleString("id-ID")}
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

      {/* Subscription KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Subscriber Aktif"
          value={(kpis.totalSubscribers ?? 0).toLocaleString("id-ID")}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
          tooltip={SUBSCRIPTION_DESCRIPTIONS.activeSubscribers}
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

      {/* Funnel + AI Scan Adoption side by side */}
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
                  {funnel[1]?.rate ?? 0}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Verified → Activated
                </p>
                <p className="text-sm font-bold text-foreground">
                  {funnel[1]?.count > 0
                    ? Math.round((funnel[2]?.count / funnel[1]?.count) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Activated → Engaged
                </p>
                <p className="text-sm font-bold text-foreground">
                  {funnel[2]?.count > 0
                    ? Math.round((funnel[3]?.count / funnel[2]?.count) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

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
                  {featureAdoption.scanAdoptionRate}%)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${featureAdoption.scanAdoptionRate}%`,
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
                    width: `${kpis.totalUsers > 0 ? Math.round((featureAdoption.scanExhausted / kpis.totalUsers) * 100) : 0}%`,
                    background: WARNING,
                  }}
                />
              </div>
            </div>

            {/* Not adopted & Total Scans */}
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-primary/5 rounded-lg p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scan className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-black text-primary leading-none">
                        {(featureAdoption?.totalScans ?? 0).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                      <UiTooltip
                        content={AI_ADOPTION_DESCRIPTIONS.totalScans}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                      Total Scan Berhasil
                    </p>
                  </div>
                </div>
                <div className="bg-purple-500/5 rounded-lg p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-black text-purple-500 leading-none">
                        {featureAdoption.avgScansPerUser ?? 0}
                      </p>
                      <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.avgScans} />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                      Avg Scan / User
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-sm font-bold text-foreground">
                      {featureAdoption.scanExhaustedAndSubscribed ?? 0}
                    </p>
                    <UiTooltip content={AI_ADOPTION_DESCRIPTIONS.conversion} />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Konversi Sub
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-sm font-bold text-foreground">
                      {featureAdoption.powerUserConversionRate ?? 0}%
                    </p>
                    <UiTooltip
                      content={AI_ADOPTION_DESCRIPTIONS.conversionRate}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Rate Konversi
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* User Growth */}
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

      {/* Subscription Analytics */}
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
          <CardBody className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.subscriptions.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
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
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          FUNNEL_COLORS[index % FUNNEL_COLORS.length],
                      }}
                    />
                    <span className="text-xs font-medium text-foreground">
                      {entry.plan}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-bold">
                    {entry.count}
                  </span>
                </div>
              ))}
              {data.subscriptions.planDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Belum ada data subscriber
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Rating Distribution + Top Users */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <SectionTitle>Distribusi Rating</SectionTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpis.totalReviews} review · {kpis.avgRating} rata-rata bintang
            </p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={reviews.ratingDistribution} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="rating"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${"★".repeat(v)}`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  content={
                    <ChartTooltip valueFormatter={(v) => `${v} review`} />
                  }
                />
                <Bar dataKey="count" name="Review" radius={[4, 4, 0, 0]}>
                  {reviews.ratingDistribution.map((_, i) => (
                    <Cell key={i} fill={STAR_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Contact permission (leads)
              </span>
              <span className="font-bold text-foreground">
                {reviews.contactPermissionCount} orang (
                {reviews.contactPermissionRate}%)
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <div>
              <SectionTitle>Top Pengguna Aktif</SectionTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                10 pengguna dengan split bill terbanyak
              </p>
            </div>
            <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardBody className="p-0">
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
  );
}
