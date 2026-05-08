import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Mail,
  Plus,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  MoreHorizontal,
  X,
  Target,
  Zap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  StatCard,
  Spinner,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  EmptyState,
  useToast,
} from "../components/ui";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/utils";

const SEGMENT_OPTIONS = [
  { id: "all", label: "Semua User", color: "bg-blue-500" },
  { id: "unverified", label: "Belum Verifikasi", color: "bg-amber-500" },
  { id: "free", label: "Pengguna Gratis", color: "bg-slate-500" },
  {
    id: "free_scan_exhausted",
    label: "Kuota Gratis Habis",
    color: "bg-orange-500",
  },
  { id: "inactive_30d", label: "Tidak Aktif > 30 Hari", color: "bg-red-500" },
  { id: "premium", label: "Pengguna Premium", color: "bg-emerald-500" },
  { id: "no_split_bill", label: "Belum Pernah Split Bill", color: "bg-pink-500" },
];

export default function Campaigns() {
  usePageMeta(
    "Email Campaigns",
    "Kelola dan kirim pesan pemasaran tersegmentasi ke pengguna.",
  );

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    segment: "unverified",
    subject: "",
    content: "",
    ctaText: "",
    ctaUrl: "",
  });

  const [testEmail, setTestEmail] = useState("");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/campaigns");
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.data);
      } else {
        setError(json.error || "Gagal memuat data kampanye");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!formData.segment) return;
      setPreviewLoading(true);
      try {
        const res = await apiFetch(
          `/api/campaigns/preview?segment=${formData.segment}`,
        );
        const json = await res.json();
        if (json.success) {
          setPreviewCount(json.count);
        }
      } catch (err) {
        console.error("Preview failed", err);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [formData.segment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const { toast } = useToast();

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: "Input diperlukan",
        message: "Masukkan email pengetesan terlebih dahulu.",
        type: "error",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ ...formData, isTest: true, testEmail }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Berhasil",
          message: "Email pengetesan berhasil dikirim!",
          type: "success",
        });
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal mengirim email test.",
          type: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        message: "Terjadi kesalahan saat mengirim test.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirm(`Kirim kampanye ini ke ${previewCount} pengguna?`)) return;

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        setFormData({
          name: "",
          segment: "unverified",
          subject: "",
          content: "",
          ctaText: "",
          ctaUrl: "",
        });
        fetchCampaigns();
        toast({
          title: "Kampanye Terkirim",
          message: "Kampanye berhasil dijadwalkan/dikirim ke target segmen.",
          type: "success",
        });
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal mengirim kampanye.",
          type: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        message: "Terjadi kesalahan koneksi.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data kampanye...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola pengiriman email blast ke pengguna secara tersegmen.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            leftIcon={<Plus size={18} />}
          >
            Buat Kampanye
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Mail className="text-primary" size={20} />
              Kampanye Baru
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              <X size={14} /> Tutup
            </Button>
          </CardHeader>
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="Nama Kampanye (Internal)"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Promo Ramadhan 2024"
                  />

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">
                      Target Segmen
                    </label>
                    <select
                      name="segment"
                      required
                      value={formData.segment}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                    >
                      {SEGMENT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-800 bg-green-50 p-2.5 rounded-[8px] border border-green-300">
                      <Users size={14} className="text-green-600" />
                      {previewLoading ? (
                        <span className="animate-pulse">
                          Menghitung target...
                        </span>
                      ) : (
                        <span>
                          Estimasi target:{" "}
                          <strong className="text-green-900">
                            {previewCount.toLocaleString("id-ID")}
                          </strong>{" "}
                          pengguna
                        </span>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Subjek Email"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Subjek yang muncul di inbox user"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Teks Tombol CTA"
                      name="ctaText"
                      value={formData.ctaText}
                      onChange={handleInputChange}
                      placeholder="Cek Sekarang"
                    />
                    <Input
                      label="URL Tombol CTA"
                      name="ctaUrl"
                      type="url"
                      value={formData.ctaUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">
                      Isi Pesan (HTML)
                    </label>
                    <textarea
                      name="content"
                      required
                      rows={10}
                      value={formData.content}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary resize-none"
                      placeholder="<h1>Halo {{name}}</h1>..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Gunakan tag &lt;p&gt;, &lt;h1&gt;, &lt;strong&gt; dll.
                      Email otomatis menggunakan template brand.
                    </p>
                  </div>

                  <div className="p-4 border border-yellow-200 rounded-sm bg-yellow-50 space-y-3 w-full">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-800 flex items-center gap-2">
                      <Zap
                        size={12}
                        className="fill-yellow-500 text-yellow-500"
                      />
                      Test Email Delivery
                    </p>
                    <div className="flex gap-2 w-full">
                      <div className="flex-1">
                        <Input
                          className="w-full bg-white border-yellow-100"
                          placeholder="Email pengetesan"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSendTest}
                        disabled={submitting}
                        isLoading={submitting}
                        className=" whitespace-nowrap h-[38px] bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-200"
                      >
                        Kirim Test
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="sticky top-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Email Client Preview
                      </label>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-border" />
                        <div className="w-2 h-2 rounded-full bg-border" />
                        <div className="w-2 h-2 rounded-full bg-border" />
                      </div>
                    </div>

                    <Card className="overflow-hidden border-border shadow-soft flex flex-col min-h-[600px] rounded-2xl">
                      {/* Email Header / Browser Bar */}
                      <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border">
                        <h3 className="text-lg font-bold text-foreground truncate mb-1">
                          {formData.subject || "(Tanpa Subjek)"}
                        </h3>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/10">
                            SB
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">
                                Split Bill{" "}
                                <span className="font-normal text-muted-foreground ml-1">
                                  &lt;noreply@splitbill.my.id&gt;
                                </span>
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                10:45 AM (Baru saja)
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Kepada:{" "}
                              <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                                user@example.com
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Toolbar simulation */}
                      <div className="px-6 py-2 border-b border-border flex items-center gap-4 text-muted-foreground bg-white">
                        <Mail size={14} />
                        <RefreshCw size={14} />
                        <MoreHorizontal size={14} />
                        <div className="h-4 w-[1px] bg-border" />
                        <Clock size={14} />
                      </div>

                      <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-10">
                        {/* Real Template Simulation */}
                        <div
                          className="max-w-[560px] mx-auto bg-white rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                          style={{ border: "1px solid #e2e8f0" }}
                        >
                          {/* Template Header */}
                          <div
                            style={{
                              backgroundColor: "#479fea",
                              padding: "24px 36px",
                            }}
                          >
                            <img
                              src="https://splitbill.my.id/img/logo.png"
                              alt="Split Bill"
                              className="h-8 w-auto block"
                            />
                          </div>

                          {/* Template Content */}
                          <div className="p-9">
                            <div
                              className="text-[#475569] text-[15px] leading-relaxed mb-8 break-words"
                              dangerouslySetInnerHTML={{
                                __html: (
                                  formData.content ||
                                  "<p class='text-slate-400 italic text-sm'>Tulis konten HTML untuk melihat tampilan email di sini...</p>"
                                ).replace(/\{\{name\}\}/g, "User"),
                              }}
                            />

                            {formData.ctaText && formData.ctaUrl && (
                              <div className="mt-8 text-center">
                                <a
                                  href={formData.ctaUrl}
                                  onClick={(e) => e.preventDefault()}
                                  style={{
                                    display: "block",
                                    backgroundColor: "#479fea",
                                    color: "#ffffff",
                                    padding: "16px 24px",
                                    borderRadius: "12px",
                                    textDecoration: "none",
                                    fontWeight: "600",
                                    fontSize: "16px",
                                    textAlign: "center",
                                  }}
                                >
                                  {formData.ctaText}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Template Footer */}
                          <div
                            className="p-8 bg-[#f8fafc] text-center"
                            style={{ borderTop: "1px solid #f1f5f9" }}
                          >
                            <p className="text-[#94a3b8] text-[13px] m-0 font-medium">
                              © {new Date().getFullYear()} Split Bill. All
                              rights reserved.
                            </p>
                            <p className="text-[#94a3b8] text-[12px] mt-2 leading-relaxed">
                              Kamu menerima email ini karena kamu adalah
                              pengguna Split Bill.
                              <br />
                              Pesan ini dikirimkan melalui sistem kampanye
                              resmi.
                            </p>
                          </div>
                        </div>

                        <div className="max-w-[600px] mx-auto mt-6 flex gap-3">
                          <div className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground font-medium bg-white">
                            Balas
                          </div>
                          <div className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground font-medium bg-white">
                            Teruskan
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || previewCount === 0}
                  isLoading={submitting}
                  leftIcon={<Send size={18} />}
                >
                  Kirim Kampanye
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Riwayat Kampanye
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Log pengiriman campaign sebelumnya
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCampaigns}
            className="text-muted-foreground hover:text-primary"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-2 text-xs">Refresh</span>
          </Button>
        </CardHeader>
        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Kampanye</Th>
              <Th>Segmen</Th>
              <Th className="text-center">Status</Th>
              <Th className="text-center">Total Target</Th>
              <Th>Tanggal Kirim</Th>
              <Th className="text-right"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {campaigns.length === 0 ? (
              <Tr className="hover:bg-transparent">
                <Td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Mail}
                    title="Belum ada kampanye"
                    description="Kampanye yang Anda kirim akan muncul riwayatnya di sini."
                  />
                </Td>
              </Tr>
            ) : (
              campaigns.map((c) => (
                <Tr key={c._id}>
                  <Td>
                    <div className="font-bold text-sm text-foreground">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                      {c.subject}
                    </div>
                  </Td>
                  <Td>
                    <Badge
                      variant="outline"
                      className="capitalize text-[10px] font-medium"
                    >
                      {SEGMENT_OPTIONS.find((o) => o.id === c.segment)?.label ||
                        c.segment}
                    </Badge>
                  </Td>
                  <Td className="text-center">
                    <Badge
                      className="text-[10px] uppercase font-bold px-2 py-0.5"
                      variant={
                        c.status === "sent"
                          ? "success"
                          : c.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {c.status}
                    </Badge>
                  </Td>
                  <Td className="text-center">
                    <span className="text-sm font-bold text-foreground">
                      {(c.recipientCount || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      user
                    </span>
                  </Td>
                  <Td className="text-muted-foreground text-xs font-medium">
                    {c.sentAt ? formatDateTime(c.sentAt) : "-"}
                  </Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal size={16} />
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
