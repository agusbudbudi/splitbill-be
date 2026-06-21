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
  Copy,
  CheckCircle2,
  AlertTriangle,
  Percent,
  BarChart2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Spinner,
  Button,
  Input,
  useToast,
  Modal,
  ModalFooter,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  SearchInput,
  Select,
} from "../components/ui";
import { apiFetch } from "../lib/api";
import DynamicSegmentBuilder from "../components/DynamicSegmentBuilder";

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
  { id: "dynamic", label: "Segmen Dinamis", color: "bg-purple-500" },
  { id: "specific_emails", label: "Email Spesifik", color: "bg-indigo-500" },
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
    dynamicSegment: { included: [], excluded: [] },
    specificEmailsRaw: "", // textarea string, comma-separated
  });

  // Parse valid emails from the textarea for display and API
  const parsedSpecificEmails = formData.specificEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const [testEmail, setTestEmail] = useState("");
  const [activeTab, setActiveTab] = useState("config"); // "config" | "recipients"
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsSearch, setRecipientsSearch] = useState("");

  const filteredRecipients = recipients.filter(
    (r) =>
      (r.name || "").toLowerCase().includes(recipientsSearch.toLowerCase()) ||
      (r.email || "").toLowerCase().includes(recipientsSearch.toLowerCase())
  );

  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await apiFetch(`/api/campaigns/${id}?recipients=true`);
      const json = await res.json();
      if (json.success) {
        setRecipients(json.data || []);
      } else {
        toast({ title: "Gagal", message: "Gagal memuat daftar penerima", type: "error" });
      }
    } catch (err) {
      toast({ title: "Error", message: "Kesalahan koneksi saat memuat penerima", type: "error" });
    } finally {
      setLoadingRecipients(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (activeTab === "recipients") {
      fetchRecipients();
    }
  }, [activeTab, fetchRecipients]);

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
          dynamicSegment: json.data.dynamicSegment || { included: [], excluded: [] },
          specificEmailsRaw: (json.data.specificEmails || []).join(", "),
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
    // If campaign is not a draft, use the snapshot count from database
    if (campaign && campaign.status !== "draft") {
      setPreviewCount(campaign.recipientCount || 0);
      return;
    }

    // For specific_emails segment, count is computed client-side; no API call needed
    if (formData.segment === "specific_emails") {
      setPreviewCount(parsedSpecificEmails.length);
      return;
    }

    const fetchPreview = async () => {
      if (!formData.segment) return;
      setPreviewLoading(true);
      try {
        let url = `/api/campaigns/preview?segment=${formData.segment}`;
        if (formData.segment === "dynamic") {
          url += `&dynamicSegment=${encodeURIComponent(JSON.stringify(formData.dynamicSegment))}`;
        }
        const res = await apiFetch(url);
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
  }, [formData.segment, formData.dynamicSegment, formData.specificEmailsRaw, campaign?.status, campaign?.recipientCount]);

  const handleDuplicate = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/campaigns/${id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Berhasil",
          message: "Kampanye berhasil diduplikasi",
          type: "success",
        });
        navigate(`/campaigns/${json.data._id}`);
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal menduplikasi kampanye",
          type: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        message: "Kesalahan jaringan saat menduplikasi",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        body: JSON.stringify({
          ...formData,
          specificEmails: parsedSpecificEmails,
          isTest: true,
          testEmail,
        }),
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
        body: JSON.stringify({
          ...formData,
          specificEmails: parsedSpecificEmails,
        }),
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

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleSendCampaign = async () => {
    setIsConfirmOpen(true);
  };

  const confirmSendCampaign = async () => {
    setIsConfirmOpen(false);
    setSubmitting(true);
    try {
      // First save the latest changes
      await apiFetch(`/api/campaigns/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          specificEmails: parsedSpecificEmails,
        }),
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
      <div className="flex items-center justify-between gap-4">
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
        <Button
          variant="outline"
          leftIcon={<Copy size={16} />}
          disabled={submitting}
          isLoading={submitting}
          onClick={handleDuplicate}
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          Duplicate Kampanye
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border flex items-center gap-6 px-6 pt-3 bg-muted/25">
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "config"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            Konfigurasi Kampanye
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recipients")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "recipients"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            Daftar Penerima
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {previewCount}
            </span>
          </button>
        </div>

        <CardBody className="p-6">
          {activeTab === "config" && (
            <form className="space-y-6">
              {/* Failure Alert Banner (Temuan #48) */}
              {campaign?.status === "failed" && campaign.failureReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-800">Kampanye Gagal Dikirim</h4>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Detail kesalahan: <strong>{campaign.failureReason}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Stats Preview (Temuan #45) */}
              {(campaign?.status === "sent" || campaign?.status === "failed") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-white border border-border rounded-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Berhasil Terkirim</p>
                      <h4 className="text-lg font-bold text-foreground mt-0.5">
                        {campaign.stats?.sentCount || campaign.recipientCount || 0}
                        <span className="text-xs font-normal text-muted-foreground ml-1">email</span>
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-border rounded-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Percent size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimasi Open Rate</p>
                      <h4 className="text-lg font-bold text-foreground mt-0.5">
                        35%
                        <span className="text-xs font-normal text-muted-foreground ml-1">estimasi</span>
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-border rounded-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <BarChart2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimasi Click Rate</p>
                      <h4 className="text-lg font-bold text-foreground mt-0.5">
                        12%
                        <span className="text-xs font-normal text-muted-foreground ml-1">estimasi</span>
                      </h4>
                    </div>
                  </div>
                </div>
              )}

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

                  <Select
                    label="Target Segmen"
                    name="segment"
                    value={formData.segment}
                    onChange={handleInputChange}
                    disabled={!isDraft}
                  >
                    {SEGMENT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>

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

                  {formData.segment === "dynamic" && (
                    <div className="mt-4 border-t border-border pt-4">
                      <DynamicSegmentBuilder
                        value={formData.dynamicSegment}
                        onChange={(val) => setFormData(prev => ({ ...prev, dynamicSegment: val }))}
                      />
                    </div>
                  )}

                  {formData.segment === "specific_emails" && (
                    <div className="mt-4 border-t border-border pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-foreground">
                          Daftar Email Target
                        </label>
                        {parsedSpecificEmails.length > 0 && (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            ✓ {parsedSpecificEmails.length} email valid
                          </span>
                        )}
                      </div>
                      <textarea
                        name="specificEmailsRaw"
                        rows={5}
                        value={formData.specificEmailsRaw}
                        onChange={handleInputChange}
                        disabled={!isDraft}
                        className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                        placeholder="user1@example.com, user2@example.com, user3@example.com"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Pisahkan setiap email dengan koma (,). Email tidak perlu terdaftar sebagai pengguna.
                      </p>
                      {!isDraft && campaign?.specificEmails?.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Total: <strong>{campaign.specificEmails.length}</strong> email
                        </p>
                      )}
                    </div>
                  )}

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
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-foreground">
                        Isi Pesan (HTML)
                      </label>
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              content: prev.content + "{{name}}",
                            }));
                          }}
                          className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded border border-primary/20 font-medium transition-colors flex items-center gap-1"
                        >
                          + Insert {"{{name}}"}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Gunakan variabel <code className="bg-muted px-1 py-0.5 rounded text-primary font-mono text-[10px]">{"{{name}}"}</code> untuk menyisipkan nama pengguna.
                    </p>
                    <textarea
                      name="content"
                      rows={10}
                      value={formData.content}
                      onChange={handleInputChange}
                      disabled={!isDraft}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary resize-none mt-1"
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

              </div>{/* end grid */}

              {isDraft && (
                <div className="pt-4 flex justify-end gap-3 border-t border-border">
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
          )}

          {activeTab === "recipients" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Daftar Pengguna Target
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Menampilkan {filteredRecipients.length} dari total {recipients.length} target penerima
                  </p>
                </div>
                <SearchInput
                  value={recipientsSearch}
                  onChange={setRecipientsSearch}
                  placeholder="Cari nama atau email..."
                  className="max-w-xs w-full"
                />
              </div>

              {loadingRecipients ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Spinner size="lg" className="text-primary" />
                  <p className="text-xs text-muted-foreground">Memuat data penerima...</p>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/10">
                  <Users size={32} className="text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Tidak ada penerima ditemukan</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coba ganti kata kunci pencarian atau simpan terlebih dahulu konfigurasi segmen baru Anda.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <Thead>
                      <Tr className="hover:bg-transparent">
                        <Th className="w-16 text-center">No</Th>
                        <Th>Nama Pengguna</Th>
                        <Th>Email</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredRecipients.map((user, idx) => (
                        <Tr key={user.email + "-" + idx}>
                          <Td className="text-center font-mono text-xs">{idx + 1}</Td>
                          <Td className="font-semibold text-foreground text-sm">{user.name || "-"}</Td>
                          <Td className="text-muted-foreground text-sm font-mono">{user.email}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Send confirm modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Kirim Kampanye Email"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin mengirim kampanye email ini ke sekitar{" "}
            <strong>{previewCount.toLocaleString("id-ID")}</strong> target pengguna?
            Proses ini akan berjalan di latar belakang dan tidak bisa dibatalkan.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsConfirmOpen(false)}
          >
            Batal
          </Button>
          <Button variant="primary" size="md" onClick={confirmSendCampaign}>
            Kirim Sekarang
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
