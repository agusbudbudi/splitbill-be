import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Package, CheckCircle, Eye } from "lucide-react";
import {
  Card,
  CardHeader,
  StatCard,
  SearchInput,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableSkeleton,
  Button,
  EmptyState,
  Pagination,
  Modal,
  ModalFooter,
  useToast,
} from "../components/ui";
import SubscriptionPackageModal from "../components/SubscriptionPackageModal";
import { apiFetch } from "../lib/api";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function SubscriptionPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const toast = useToast();

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 10 });
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/subscription-packages?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setPackages(data.data.packages);
      setTotalPages(data.data.pagination.totalPages);
      setTotalItems(data.data.pagination.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput);
  }

  function openAdd() {
    setEditData(null);
    setModalOpen(true);
  }

  function openEdit(pkg) {
    setEditData(pkg);
    setModalOpen(true);
  }

  async function handleSave(payload, id) {
    const url = id ? `/api/subscription-packages/${id}` : "/api/subscription-packages";
    const res = await apiFetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        data.errors?.map((e) => e.message).join(", ") ||
        data.error ||
        "Gagal menyimpan";
      toast({ message: msg, type: "error" });
      throw new Error(msg);
    }
    toast({
      message: id
        ? "Paket berhasil diperbarui."
        : "Paket berhasil ditambahkan.",
      type: "success",
    });
    setModalOpen(false);
    fetchPackages();
  }

  async function handleDelete(id) {
    const res = await apiFetch(`/api/subscription-packages/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ message: data.error || "Gagal menghapus paket", type: "error" });
      return;
    }
    toast({ message: "Paket berhasil dihapus.", type: "success" });
    setDeleteConfirm(null);
    fetchPackages();
  }

  const activeCount = packages.filter((p) => p.isActive).length;
  const visibleCount = packages.filter((p) => p.showToCustomer).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Subscription Package
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola paket berlangganan yang tersedia.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={openAdd}
          className="flex-shrink-0"
        >
          Tambah Paket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Paket"
          value={totalItems}
          icon={Package}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Paket Aktif"
          value={activeCount}
          icon={CheckCircle}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Ditampilkan ke Pelanggan"
          value={visibleCount}
          icon={Eye}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Cari nama paket..."
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Cari
            </Button>
          </form>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Nama Paket</Th>
              <Th>Harga</Th>
              <Th>Harga Akhir</Th>
              <Th>Durasi</Th>
              <Th>Aktif</Th>
              <Th>Tampil</Th>
              <Th>Aksi</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={7} rows={5} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={7} className="text-center py-12 text-destructive">
                  {error}
                </Td>
              </Tr>
            </Tbody>
          ) : packages.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Package}
                    title={
                      search
                        ? "Paket tidak ditemukan"
                        : "Belum ada paket berlangganan"
                    }
                    description={
                      search ? "Coba ubah kata kunci pencarian." : undefined
                    }
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {packages.map((pkg) => (
                <Tr key={pkg._id}>
                  <Td>
                    <p className="font-semibold text-foreground">{pkg.name}</p>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {pkg.description}
                      </p>
                    )}
                  </Td>
                  <Td className="text-muted-foreground">
                    {formatRupiah(pkg.price)}
                    {pkg.discountValue > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (
                        {pkg.discountType === "percentage"
                          ? `−${pkg.discountValue}%`
                          : `−${formatRupiah(pkg.discountValue)}`}
                        )
                      </span>
                    )}
                  </Td>
                  <Td className="font-semibold text-primary">
                    {formatRupiah(pkg.finalPrice)}
                  </Td>
                  <Td className="text-muted-foreground">
                    {pkg.durationMonths} Bulan
                  </Td>
                  <Td>
                    <Badge variant={pkg.isActive ? "success" : "danger"}>
                      {pkg.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={pkg.showToCustomer ? "success" : "neutral"}>
                      {pkg.showToCustomer ? "Ya" : "Tidak"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(pkg)}
                        title="Edit"
                        className="p-1.5 rounded-lg border border-border bg-white text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(pkg)}
                        title="Hapus"
                        className="p-1.5 rounded-lg border border-destructive/20 bg-white text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>

        {!loading && !error && packages.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemName="paket"
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <SubscriptionPackageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editData={editData}
      />

      {/* Delete confirm */}
      <Modal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Paket"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus paket{" "}
            <span className="font-semibold text-foreground">
              {deleteConfirm?.name}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setDeleteConfirm(null)}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => handleDelete(deleteConfirm._id)}
          >
            Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
