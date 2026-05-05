import { useState, useEffect } from "react";
import { Plus, Save, Trash, Image as ImageIcon, Upload } from "lucide-react";
import { compressImage } from "../lib/imageUtils";
import { apiFetch } from "../lib/api";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Modal,
  ModalFooter,
  EmptyState,
  useToast,
} from "../components/ui";

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/banners");
      const data = await res.json();
      if (data.success) {
        setBanners(data.data.banners || []);
      } else {
        toast({
          message: data.message || "Gagal memuat banner",
          type: "error",
        });
      }
    } catch {
      toast({ message: "Terjadi kesalahan saat memuat banner", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBanner = () => {
    setBanners([...banners, { image: "", route: "" }]);
  };

  const confirmRemoveBanner = (index) => setDeleteIndex(index);

  const handleRemoveBanner = () => {
    const newBanners = [...banners];
    newBanners.splice(deleteIndex, 1);
    setBanners(newBanners);
    setDeleteIndex(null);
  };

  const handleImageChange = async (index, file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const newBanners = [...banners];
      newBanners[index].image = compressed;
      setBanners(newBanners);
    } catch {
      toast({
        message: "Gagal memproses gambar. Silakan coba lagi.",
        type: "error",
      });
    }
  };

  const handleRouteChange = (index, value) => {
    const newBanners = [...banners];
    newBanners[index].route = value;
    setBanners(newBanners);
  };

  const handleSave = async () => {
    for (const banner of banners) {
      if (!banner.image || !banner.route) {
        toast({
          message: "Gambar dan Route URL harus diisi untuk semua banner.",
          type: "warning",
        });
        return;
      }
    }

    const payload = JSON.stringify({ banners });
    const payloadSize = new Blob([payload]).size;

    if (payloadSize > 6 * 1024 * 1024) {
      toast({
        message: `Ukuran total terlalu besar (${(payloadSize / 1024 / 1024).toFixed(2)} MB). Maksimum 6MB.`,
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const result = await response.json();
      if (result.success) {
        toast({ message: "Semua banner berhasil disimpan!", type: "success" });
        fetchBanners();
      } else {
        toast({
          message: result.message || "Terjadi kesalahan saat menyimpan",
          type: "error",
        });
      }
    } catch {
      toast({
        message: "Terjadi kesalahan. Cek koneksi atau ukuran gambar.",
        type: "error",
      });
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Manajemen Banner
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur konten promosi dan gambar banner yang tampil di aplikasi
            pengguna.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={handleAddBanner}
          className="flex-shrink-0"
        >
          Tambah Banner
        </Button>
      </div>

      {/* Banner grid */}
      {banners.length === 0 ? (
        <Card>
          <EmptyState
            icon={ImageIcon}
            title="Belum ada banner"
            description="Klik Tambah Banner untuk membuat banner promosi baru."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                size="sm"
                onClick={handleAddBanner}
              >
                Tambah Banner
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {banners.map((banner, index) => (
            <Card key={banner._id || index} className="overflow-hidden">
              {/* Image preview */}
              <div
                className="w-full h-44 flex items-center justify-center bg-muted"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {banner.image ? (
                  <img
                    src={banner.image}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Belum ada gambar</span>
                  </div>
                )}
              </div>

              <CardBody className="space-y-4">
                {/* Image upload */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Gambar Banner
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (Rekomendasi: 1080 × 339)
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm border border-border bg-white text-foreground hover:bg-muted transition-colors">
                        <Upload className="h-4 w-4" />
                        {banner.image ? "Ganti Gambar" : "Pilih Gambar"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageChange(index, e.target.files[0])
                        }
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {banner.image ? "Gambar dipilih" : "Belum ada gambar"}
                    </span>
                  </div>
                </div>

                {/* Route input */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Route URL
                  </label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 text-sm rounded-sm border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                    placeholder="/profile"
                    value={banner.route}
                    onChange={(e) => handleRouteChange(index, e.target.value)}
                  />
                </div>
              </CardBody>

              <CardFooter className="py-3">
                <Button
                  variant="danger"
                  size="md"
                  icon={<Trash className="h-4 w-4" />}
                  onClick={() => confirmRemoveBanner(index)}
                >
                  Hapus Banner
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Save button */}
      {banners.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            icon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={handleSave}
            size="lg"
          >
            {saving ? "Menyimpan..." : "Simpan Semua Banner"}
          </Button>
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Hapus Banner"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus banner ini dari daftar? Perubahan akan
            disimpan saat Anda klik <strong>Simpan Semua Banner</strong>.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setDeleteIndex(null)}
          >
            Batal
          </Button>
          <Button variant="danger" size="md" onClick={handleRemoveBanner}>
            Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
