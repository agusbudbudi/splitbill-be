import { useState, useEffect } from "react";
import { Plus, Save, Trash, Image as ImageIcon, Upload } from "lucide-react";
import { cn as clsx } from "../lib/utils";

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/banners", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setBanners(data.data.banners || []);
      } else {
        setError(data.message || "Failed to fetch banners");
      }
    } catch (err) {
      setError("An error occurred while fetching banners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBanner = () => {
    setBanners([...banners, { image: "", route: "" }]);
  };

  const handleRemoveBanner = (index) => {
    if (
      confirm(
        'Apakah Anda yakin ingin menghapus banner ini dari daftar? Perubahan akan disimpan saat Anda mengklik "Simpan Banner".',
      )
    ) {
      const newBanners = [...banners];
      newBanners.splice(index, 1);
      setBanners(newBanners);
    }
  };

  const handleImageChange = (index, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const newBanners = [...banners];
      newBanners[index].image = e.target.result;
      setBanners(newBanners);
    };
    reader.readAsDataURL(file);
  };

  const handleRouteChange = (index, value) => {
    const newBanners = [...banners];
    newBanners[index].route = value;
    setBanners(newBanners);
  };

  const handleSave = async () => {
    // Validate
    for (const banner of banners) {
      if (!banner.image || !banner.route) {
        alert("Gambar dan Route URL harus diisi untuk semua banner.");
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ banners }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Semua banner berhasil disimpan!");
        fetchBanners();
      } else {
        alert(`Error menyimpan banner: ${result.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan semua banner.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading banners...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Manajemen Banner
          </h1>
          <p
            className="text-sm font-regular mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Atur konten promosi dan gambar banner yang akan tampil di aplikasi
            pengguna.
          </p>
        </div>
        <button
          onClick={handleAddBanner}
          className="inline-flex items-center px-4 py-2 text-sm font-medium transition-all shadow-sm hover:translate-y-[-1px] active:scale-95"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "calc(var(--radius) - 2px)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner, index) => (
          <div
            key={banner._id || index}
            className="p-6 flex flex-col gap-6 items-start transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              borderRadius: "1.2rem",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {/* Image Preview */}
            <div
              className="w-full flex-shrink-0 bg-gray-100 overflow-hidden flex items-center justify-center h-48"
              style={{
                borderRadius: "calc(var(--radius) - 4px)",
                border: "1px solid var(--border)",
                background: "var(--input)",
              }}
            >
              {banner.image ? (
                <img
                  src={banner.image}
                  alt="Banner Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon
                  className="h-12 w-12"
                  style={{ color: "var(--muted-foreground)" }}
                />
              )}
            </div>

            {/* Form */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Banner Image
                </label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Recommended size 1080 x 339
                </p>
                <div className="flex items-center">
                  <label
                    className="cursor-pointer py-2 px-3 text-sm leading-4 font-medium transition-all hover:bg-opacity-80 focus:outline-none"
                    style={{
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "calc(var(--radius) - 4px)",
                    }}
                  >
                    <span className="flex items-center gap-2">
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
                  <span
                    className="ml-3 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {banner.image
                      ? "Gambar dipilih"
                      : "Tidak ada gambar dipilih"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Route URL
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="/profile"
                  value={banner.route}
                  onChange={(e) => handleRouteChange(index, e.target.value)}
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    borderRadius: "calc(var(--radius) - 4px)",
                  }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleRemoveBanner(index)}
                  className="inline-flex items-center px-3 py-2 text-sm leading-4 font-medium transition-all hover:bg-opacity-10 focus:outline-none"
                  style={{
                    background: "transparent",
                    color: "var(--destructive)",
                    border: "1px solid var(--destructive)",
                    borderRadius: "calc(var(--radius) - 4px)",
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">
              Belum ada banner. Klik "Tambah Banner" untuk membuat baru.
            </p>
          </div>
        )}
      </div>

      {banners.length > 0 && (
        <div
          className="flex justify-end pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 text-base font-medium transition-all shadow-sm hover:translate-y-[-1px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--success)",
              color: "var(--success-foreground)",
              borderRadius: "calc(var(--radius) - 2px)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? "Menyimpan..." : "Simpan Semua Banner"}
          </button>
        </div>
      )}
    </div>
  );
}
