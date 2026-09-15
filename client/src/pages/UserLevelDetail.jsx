import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import { Save, ArrowLeft, Upload, Plus, Trash2, Award } from "lucide-react";
import { apiFetch } from "../lib/api";
import { compressImage } from "../lib/imageUtils";
import { Card, CardBody, CardFooter, Button, useToast } from "../components/ui";

const METRIC_OPTIONS = [
  { value: "splitCount", label: "Jumlah split (finalize)" },
  { value: "totalAmount", label: "Total nominal (finalize)" },
  { value: "friendCount", label: "Jumlah teman terlibat" },
];

const OPERATOR_OPTIONS = ["=", ">", "<", ">=", "<="];

const EMPTY_RULE = { metric: "splitCount", operator: "<", value: 0 };

const EMPTY_FORM = {
  name: "",
  icon: "",
  description: "",
  benefits: [""],
  order: 0,
  isActive: true,
  rules: [{ ...EMPTY_RULE }],
};

export default function UserLevelDetail() {
  const { id: mongoId } = useParams();
  const isEdit = Boolean(mongoId);
  const navigate = useNavigate();
  const toast = useToast();

  usePageMeta(
    isEdit ? "Edit User Level" : "Tambah User Level",
    isEdit
      ? "Edit konfigurasi user level yang sudah ada."
      : "Buat user level baru untuk sistem gamifikasi split bill."
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const fetchLevel = async () => {
      try {
        const res = await apiFetch(`/api/levels/${mongoId}`);
        const data = await res.json();
        if (data.success) {
          const level = data.data;
          setForm({
            name: level.name || "",
            icon: level.icon || "",
            description: level.description || "",
            benefits:
              level.benefits && level.benefits.length > 0 ? level.benefits : [""],
            order: level.order ?? 0,
            isActive: level.isActive !== undefined ? level.isActive : true,
            rules:
              level.rules && level.rules.length > 0
                ? level.rules
                : [{ ...EMPTY_RULE }],
          });
        } else {
          toast({ message: "User level tidak ditemukan", type: "error" });
          navigate("/user-levels");
        }
      } catch {
        toast({ message: "Gagal memuat data", type: "error" });
        navigate("/user-levels");
      } finally {
        setLoading(false);
      }
    };
    fetchLevel();
  }, [mongoId, isEdit, navigate, toast]);

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIconChange = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 256, 0.85);
      handleField("icon", compressed);
    } catch {
      toast({ message: "Gagal memproses gambar. Silakan coba lagi.", type: "error" });
    }
  };

  const handleBenefitChange = (index, value) => {
    setForm((prev) => {
      const benefits = [...prev.benefits];
      benefits[index] = value;
      return { ...prev, benefits };
    });
  };

  const handleAddBenefit = () => {
    setForm((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }));
  };

  const handleRemoveBenefit = (index) => {
    setForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleRuleChange = (index, field, value) => {
    setForm((prev) => {
      const rules = [...prev.rules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, rules };
    });
  };

  const handleAddRule = () => {
    setForm((prev) => ({ ...prev, rules: [...prev.rules, { ...EMPTY_RULE }] }));
  };

  const handleRemoveRule = (index) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ message: "Nama level wajib diisi", type: "warning" });
      return;
    }
    if (!form.icon) {
      toast({ message: "Icon wajib diupload", type: "warning" });
      return;
    }
    if (form.rules.length === 0) {
      toast({ message: "Minimal 1 rule diperlukan", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon,
        description: form.description.trim(),
        benefits: form.benefits.map((b) => b.trim()).filter(Boolean),
        order: Number(form.order) || 0,
        isActive: form.isActive,
        rules: form.rules.map((rule) => ({
          metric: rule.metric,
          operator: rule.operator,
          value: Number(rule.value) || 0,
        })),
      };

      const res = await apiFetch(
        isEdit ? `/api/levels/${mongoId}` : "/api/levels",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (data.success) {
        toast({
          message: isEdit ? "User level berhasil diperbarui!" : "User level berhasil dibuat!",
          type: "success",
        });
        navigate("/user-levels");
      } else {
        toast({ message: data.error || "Terjadi kesalahan", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan. Coba lagi.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const inputClass =
    "block w-full px-3 py-2 text-sm rounded-sm border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/user-levels")}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isEdit ? "Edit User Level" : "Tambah User Level"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? `Mengedit: ${form.name}` : "Buat user level baru"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-3">
          <CardBody className="space-y-5">
            {/* Name */}
            <div>
              <label className={labelClass}>
                Nama Level <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Newbie"
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                Deskripsi
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — tagline singkat, tampil di halaman detail level member
                </span>
              </label>
              <textarea
                className={inputClass}
                rows={2}
                maxLength={200}
                placeholder="Baru mulai split bareng temen"
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
              />
            </div>

            {/* Icon upload */}
            <div>
              <label className={labelClass}>
                Icon <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — square ratio direkomendasikan
                </span>
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm border border-border bg-white text-foreground hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    {form.icon ? "Ganti Icon" : "Pilih Icon"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleIconChange(e.target.files[0])}
                  />
                </label>
                <span className="text-xs text-muted-foreground">
                  {form.icon ? "Icon dipilih" : "Belum ada icon"}
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + " mb-0"}>
                  Benefit
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — bullet list, tampil di halaman detail level member
                  </span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={handleAddBenefit}
                >
                  Tambah Benefit
                </Button>
              </div>

              <div className="space-y-2">
                {form.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      className={inputClass}
                      maxLength={120}
                      placeholder="Dapat badge eksklusif"
                      value={benefit}
                      onChange={(e) => handleBenefitChange(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(index)}
                      disabled={form.benefits.length === 1}
                      className="flex-shrink-0 p-2 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Hapus benefit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Order & Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Order
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (makin besar = makin tinggi level)
                  </span>
                </label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.order}
                  onChange={(e) => handleField("order", Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Status Aktif</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleField("isActive", !form.isActive)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${
                    form.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  style={{ height: "20px" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                    style={{
                      transform: form.isActive ? "translateX(2px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Rules builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + " mb-0"}>
                  Rules <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — level match kalau salah satu rule terpenuhi (OR)
                  </span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={handleAddRule}
                >
                  Tambah Rule
                </Button>
              </div>

              <div className="space-y-2">
                {form.rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      className={inputClass}
                      value={rule.metric}
                      onChange={(e) => handleRuleChange(index, "metric", e.target.value)}
                    >
                      {METRIC_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass + " max-w-[80px] flex-shrink-0"}
                      value={rule.operator}
                      onChange={(e) => handleRuleChange(index, "operator", e.target.value)}
                    >
                      {OPERATOR_OPTIONS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className={inputClass + " max-w-[140px] flex-shrink-0"}
                      value={rule.value}
                      onChange={(e) => handleRuleChange(index, "value", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(index)}
                      disabled={form.rules.length === 1}
                      className="flex-shrink-0 p-2 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Hapus rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>

          <CardFooter className="py-3 flex justify-between">
            <Button variant="ghost" onClick={() => navigate("/user-levels")} disabled={saving}>
              Batal
            </Button>
            <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Level"}
            </Button>
          </CardFooter>
        </Card>

        {/* Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold text-foreground">Preview Level</p>
            </div>
            <CardBody className="flex flex-col items-center gap-3 py-8">
              <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                {form.icon ? (
                  <img src={form.icon} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-base font-bold text-foreground">{form.name || "Nama Level"}</p>
              {form.description && (
                <p className="text-xs text-muted-foreground text-center">{form.description}</p>
              )}
              {form.benefits.filter(Boolean).length > 0 && (
                <ul className="w-full text-xs text-foreground space-y-1 pt-2">
                  {form.benefits.filter(Boolean).map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Ringkasan</p>
              <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground flex-shrink-0">Order</span>
                  <span className="font-medium text-foreground flex-1 text-right">
                    {form.order}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground flex-shrink-0">Status</span>
                  <span className="font-medium flex-1 text-right">
                    {form.isActive ? (
                      <span className="text-green-600 font-semibold">Aktif</span>
                    ) : (
                      <span className="text-muted-foreground">Nonaktif</span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground flex-shrink-0">Jumlah Rule</span>
                  <span className="font-medium text-foreground flex-1 text-right">
                    {form.rules.length}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
