import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Mail,
  Send,
  Clock,
  Users,
  RefreshCw,
  MoreHorizontal,
  X,
  Zap,
  ArrowLeft,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Spinner,
  Button,
  Input,
  useToast,
} from "../components/ui";
import { apiFetch } from "../lib/api";

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
  {
    id: "no_split_bill",
    label: "Belum Pernah Split Bill",
    color: "bg-pink-500",
  },
];

export default function CampaignDetail() {
  usePageMeta("Detail Kampanye", "Edit dan kirim kampanye email.");
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    segment: "unverified",
    subject: "",
    content: "",
    ctaText: "",
    ctaUrl: "",
  });

  const [testEmail, setTestEmail] = useState("");

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
        setFormData({
          name: json.data.name || "",
          segment: json.data.segment || "unverified",
          subject: json.data.subject || "",
          content: json.data.content || "",
          ctaText: json.data.ctaText || "",
          ctaUrl: json.data.ctaUrl || "",
        });
      } else {
        toast({
          title: "Error",
          message: "Gagal memuat kampanye",
          type: "error",
        });
        navigate("/campaigns");
      }
    } catch (err) {
      toast({ title: "Error", message: "Kesalahan koneksi", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

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

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: "Input diperlukan",
        message: "Masukkan email pengetesan",
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
          message: "Email pengetesan dikirim!",
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
      toast({ title: "Error", message: "Kesalahan koneksi.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/campaigns/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Tersimpan",
          message: "Draft berhasil diperbarui.",
          type: "success",
        });
        setCampaign(json.data);
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal menyimpan draft.",
          type: "error",
        });
      }
    } catch (err) {
      toast({ title: "Error", message: "Kesalahan koneksi.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!confirm(`Kirim kampanye ini ke ${previewCount} pengguna?`)) return;
    setSubmitting(true);
    try {
      // First save the latest changes
      await apiFetch(`/api/campaigns/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      // Then send
      const res = await apiFetch(`/api/campaigns/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Terkirim",
          message: "Kampanye berhasil dijadwalkan.",
          type: "success",
        });
        navigate("/campaigns");
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal mengirim kampanye.",
          type: "error",
        });
      }
    } catch (err) {
      toast({ title: "Error", message: "Kesalahan koneksi.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data kampanye...</p>
      </div>
    );
  }

  const isDraft = campaign?.status === "draft";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/campaigns")}
          className="px-2"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isDraft ? "Edit Draft Kampanye" : "Detail Kampanye"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isDraft
              ? "Selesaikan pengaturan dan kirim kampanye."
              : "Kampanye ini sudah tidak dapat diubah."}
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Nama Kampanye (Internal)"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Promo Ramadhan 2024"
                  disabled={!isDraft}
                />

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Target Segmen
                  </label>
                  <select
                    name="segment"
                    value={formData.segment}
                    onChange={handleInputChange}
                    disabled={!isDraft}
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
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Subjek yang muncul di inbox user"
                  disabled={!isDraft}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Teks Tombol CTA"
                    name="ctaText"
                    value={formData.ctaText}
                    onChange={handleInputChange}
                    placeholder="Cek Sekarang"
                    disabled={!isDraft}
                  />
                  <Input
                    label="URL Tombol CTA"
                    name="ctaUrl"
                    type="url"
                    value={formData.ctaUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    disabled={!isDraft}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Isi Pesan (HTML)
                  </label>
                  <textarea
                    name="content"
                    rows={10}
                    value={formData.content}
                    onChange={handleInputChange}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary resize-none"
                    placeholder="<h1>Halo {{name}}</h1>..."
                  />
                </div>

                {isDraft && (
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
                        className="whitespace-nowrap h-[38px] bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-200"
                      >
                        Kirim Test
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="sticky top-4 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Email Client Preview
                    </label>
                  </div>
                  <Card className="overflow-hidden border-border shadow-soft flex flex-col min-h-[600px] rounded-2xl">
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

                    <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
                      <div
                        className="max-w-[560px] mx-auto bg-white rounded-sm overflow-hidden"
                        style={{ border: "1px solid #e2e8f0" }}
                      >
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
                        <div className="p-9">
                          <div
                            className="text-[#475569] text-[15px] leading-relaxed mb-8 break-words"
                            dangerouslySetInnerHTML={{
                              __html: (
                                formData.content ||
                                "<p class='text-slate-400 italic text-sm'>Tulis konten HTML...</p>"
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
                        <div
                          className="p-8 bg-[#f8fafc] text-center"
                          style={{ borderTop: "1px solid #f1f5f9" }}
                        >
                          <p className="text-[#94a3b8] text-[13px] m-0 font-medium">
                            © {new Date().getFullYear()} Split Bill. All rights
                            reserved.
                          </p>
                          <p className="text-[#94a3b8] text-[12px] mt-2 leading-relaxed">
                            Kamu menerima email ini karena kamu adalah pengguna
                            Split Bill.
                            <br />
                            Pesan ini dikirimkan melalui sistem kampanye resmi.
                          </p>
                        </div>
                      </div>

                      <div className="max-w-[600px] mx-auto mt-6 flex gap-2">
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

            {isDraft && (
              <div className="pt-4 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/campaigns")}
                  type="button"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={handleSaveDraft}
                >
                  Simpan Draft
                </Button>
                <Button
                  type="button"
                  disabled={submitting || previewCount === 0}
                  isLoading={submitting}
                  leftIcon={<Send size={18} />}
                  onClick={handleSendCampaign}
                >
                  Kirim Kampanye
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
