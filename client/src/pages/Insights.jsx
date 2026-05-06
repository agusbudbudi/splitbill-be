import { useState, useEffect, useCallback } from "react";
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
  Info,
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
} from "recharts";
import {
  Card,
  CardHeader,
  CardBody,
  StatCard,
  Spinner,
} from "../components/ui";
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
  const [, m] = period.split("-");
  return MONTH_LABELS[parseInt(m, 10) - 1];
}

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
          <span className="relative group/tip">
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2 shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
              {description}
              <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800" />
            </span>
          </span>
        </span>
        <span className="text-muted-foreground">
          {count.toLocaleString("id-ID")} pengguna ({rate}%)
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
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/insights");
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
  }, []);

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
    topUsers,
  } = data;
  const funnelMax = funnel[0]?.count ?? 1;

  return (
    <div className="space-y-8">
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
          value={kpis.totalUsers.toLocaleString("id-ID")}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Terverifikasi"
          value={`${kpis.verifiedUsers.toLocaleString("id-ID")} (${kpis.verifiedRate}%)`}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Total Split Bill"
          value={kpis.totalBills.toLocaleString("id-ID")}
          icon={Receipt}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Total Nilai Ditagih"
          value={formatRpShort(kpis.totalValue)}
          icon={Wallet}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          title="Avg Ukuran Tagihan"
          value={formatRpShort(kpis.avgBillSize)}
          icon={TrendingUp}
          iconColor="text-secondary-foreground"
          iconBg="bg-secondary"
        />
        <StatCard
          title="Rating Rata-rata"
          value={`${kpis.avgRating} ⭐`}
          icon={Star}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      {/* Funnel + Rating side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
      </div>

      {/* User Growth */}
      <Card>
        <CardHeader>
          <SectionTitle>Pertumbuhan Pengguna</SectionTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registrasi baru per bulan (6 bulan terakhir)
          </p>
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

      {/* Feature Adoption + Top Users */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

            {/* Not adopted */}
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-lg font-black text-primary">
                    {featureAdoption.scanAdoptionRate}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    Adopsi
                  </p>
                </div>
                <div className="bg-warning/5 rounded-lg p-3">
                  <p className="text-lg font-black text-warning">
                    {featureAdoption.scanExhausted}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    Power Users
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-lg font-black text-foreground">
                    {kpis.totalUsers - featureAdoption.scanAdopted}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    Belum Pakai
                  </p>
                </div>
              </div>
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
                        {u.name}
                      </button>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Receipt className="h-3 w-3" />
                      {u.splitBillCount}
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
