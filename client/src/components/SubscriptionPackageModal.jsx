import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  discountType: "rupiah",
  discountValue: "",
  durationMonths: "1",
  benefits: [""],
  isActive: true,
  showToCustomer: false,
};

function computeFinalPrice(price, discountType, discountValue) {
  const p = parseFloat(price) || 0;
  const d = parseFloat(discountValue) || 0;
  if (discountType === "percentage")
    return Math.max(0, Math.round(p * (1 - d / 100)));
  return Math.max(0, p - d);
}

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border w-fit">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-5 py-1.5 text-sm font-medium transition-all ${
            value === opt
              ? "bg-primary text-white"
              : "bg-white text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt ? "Ya" : "Tidak"}
        </button>
      ))}
    </div>
  );
}

export default function SubscriptionPackageModal({
  isOpen,
  onClose,
  onSave,
  editData,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editData);

  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      setForm({
        name: editData.name || "",
        description: editData.description || "",
        price: String(editData.price ?? ""),
        discountType: editData.discountType || "rupiah",
        discountValue: String(editData.discountValue ?? ""),
        durationMonths: String(editData.durationMonths ?? "1"),
        benefits: editData.benefits?.length > 0 ? editData.benefits : [""],
        isActive: editData.isActive ?? true,
        showToCustomer: editData.showToCustomer ?? false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [isOpen, editData]);

  const finalPrice = computeFinalPrice(
    form.price,
    form.discountType,
    form.discountValue,
  );

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function setBenefit(index, value) {
    setForm((prev) => {
      const updated = [...prev.benefits];
      updated[index] = value;
      return { ...prev, benefits: updated };
    });
  }

  function addBenefit() {
    setForm((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }));
  }

  function removeBenefit(index) {
    setForm((prev) => {
      const updated = prev.benefits.filter((_, i) => i !== index);
      return { ...prev, benefits: updated.length > 0 ? updated : [""] };
    });
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Nama paket harus diisi";
    if (form.price === "" || isNaN(Number(form.price)))
      errs.price = "Harga harus diisi";
    else if (Number(form.price) < 0) errs.price = "Harga tidak boleh negatif";
    if (form.discountValue !== "" && isNaN(Number(form.discountValue)))
      errs.discountValue = "Diskon tidak valid";
    if (form.discountType === "percentage") {
      const d = Number(form.discountValue) || 0;
      if (d < 0 || d > 100)
        errs.discountValue = "Persentase diskon harus antara 0–100";
    }
    if (!form.durationMonths) errs.durationMonths = "Durasi harus dipilih";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        finalPrice,
        durationMonths: Number(form.durationMonths),
        benefits: form.benefits.filter((b) => b.trim()),
        isActive: form.isActive,
        showToCustomer: form.showToCustomer,
      };
      await onSave(payload, editData?._id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Paket Berlangganan" : "Tambah Paket Berlangganan"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ModalBody className="space-y-4">
          {/* Name */}
          <Input
            label="Nama Paket"
            required
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Contoh: Paket Premium 3 Bulan"
            error={errors.name}
          />

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Deskripsi paket..."
              rows={2}
              className="block w-full px-3 py-2 text-sm rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Price */}
          <Input
            label="Harga"
            required
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            placeholder="0"
            error={errors.price}
            leftIcon={<span className="text-xs font-medium">Rp</span>}
          />

          {/* Discount */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Diskon
            </label>
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-border flex-shrink-0">
                {[
                  { value: "rupiah", label: "Rp" },
                  { value: "percentage", label: "%" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("discountType", opt.value)}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      form.discountType === opt.value
                        ? "bg-primary text-white"
                        : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                max={form.discountType === "percentage" ? "100" : undefined}
                value={form.discountValue}
                onChange={(e) => setField("discountValue", e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
            {errors.discountValue && (
              <p className="text-xs text-destructive">{errors.discountValue}</p>
            )}
          </div>

          {/* Final price (read-only) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Harga Akhir
            </label>
            <div className="px-3 py-2 rounded-lg border border-border bg-secondary text-primary text-sm font-semibold">
              {formatRupiah(finalPrice)}
            </div>
            <p className="text-xs text-muted-foreground">
              Dihitung otomatis dari Harga − Diskon
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Durasi <span className="text-destructive">*</span>
            </label>
            <select
              value={form.durationMonths}
              onChange={(e) => setField("durationMonths", e.target.value)}
              className="block w-full px-3 py-2 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:border-primary transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {m} Bulan
                </option>
              ))}
            </select>
            {errors.durationMonths && (
              <p className="text-xs text-destructive">
                {errors.durationMonths}
              </p>
            )}
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Yang Didapatkan
            </label>
            <div className="space-y-2">
              {form.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => setBenefit(index, e.target.value)}
                    placeholder={`Benefit ${index + 1}`}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    disabled={form.benefits.length === 1 && !benefit}
                    className="p-2 rounded-lg border border-border bg-white text-destructive hover:bg-destructive/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBenefit}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Plus size={14} />
                Tambah benefit
              </button>
            </div>
          </div>

          {/* Status Active */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Status Aktif
            </label>
            <YesNoToggle
              value={form.isActive}
              onChange={(v) => setField("isActive", v)}
            />
          </div>

          {/* Show to Customer */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Tampilkan ke Pelanggan
            </label>
            <YesNoToggle
              value={form.showToCustomer}
              onChange={(v) => setField("showToCustomer", v)}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={saving}
          >
            Batal
          </Button>
          <Button type="submit" size="md" loading={saving}>
            {isEdit ? "Simpan Perubahan" : "Tambah Paket"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
