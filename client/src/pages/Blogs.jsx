import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Spinner,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
  useToast,
  Modal,
  ModalFooter,
} from "../components/ui";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/utils";

const STATUS_STYLES = {
  published: { variant: "success", label: "Published" },
  draft: { variant: "warning", label: "Draft" },
};

const FILTER_OPTIONS = [
  { id: "all", label: "Semua" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
];

export default function Blogs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);

  const fetchBlogs = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const params =
        activeFilter !== "all" ? `?status=${activeFilter}` : "?status=all";
      const res = await apiFetch(`/api/blogs${params}`);
      const json = await res.json();
      if (json.success) {
        setBlogs(json.data);
        if (isManual) {
          toast({
            title: "Direfresh",
            message: "Daftar artikel berhasil diperbarui",
            type: "success",
          });
        }
      } else {
        toast({
          title: "Error",
          message: json.error || "Gagal memuat artikel",
          type: "error",
        });
      }
    } catch {
      toast({
        title: "Error",
        message: "Terjadi kesalahan koneksi",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (id, title) => {
    setDeleteTarget({ id, title });
  };

  const confirmDeleteBlog = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setDeleting(id);
    try {
      const res = await apiFetch(`/api/blogs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Terhapus",
          message: "Artikel berhasil dihapus",
          type: "success",
        });
        fetchBlogs();
      } else {
        toast({
          title: "Gagal",
          message: json.error || "Gagal menghapus artikel",
          type: "error",
        });
      }
    } catch {
      toast({
        title: "Error",
        message: "Kesalahan saat menghapus",
        type: "error",
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading && blogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat artikel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Blog Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola artikel blog yang ditampilkan di halaman publik.
          </p>
        </div>
        <Button
          onClick={() => navigate("/blogs/new")}
          leftIcon={<Plus size={18} />}
        >
          Buat Artikel
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Daftar Artikel
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {blogs.length} artikel ditemukan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeFilter === opt.id
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchBlogs(true)}
              className="text-muted-foreground hover:text-primary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="ml-2 text-xs">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Artikel</Th>
              <Th>Kategori</Th>
              <Th className="text-center">Status</Th>
              <Th>Tanggal Publish</Th>
              <Th className="text-center">Read Time</Th>
              <Th className="text-right"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {blogs.length === 0 ? (
              <Tr className="hover:bg-transparent">
                <Td colSpan={6} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="Belum ada artikel"
                    description="Klik 'Buat Artikel' untuk mulai menulis blog pertama Anda."
                  />
                </Td>
              </Tr>
            ) : (
              blogs.map((blog) => {
                const statusStyle =
                  STATUS_STYLES[blog.status] || STATUS_STYLES.draft;
                return (
                  <Tr key={blog._id}>
                    <Td>
                      <div className="flex items-start gap-3">
                        {blog.thumbnail && (
                          <img
                            src={blog.thumbnail}
                            alt={blog.thumbnailAlt || blog.title}
                            className="w-20 h-20 object-cover rounded-sm flex-shrink-0 bg-muted"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div>
                          <div className="font-bold text-sm text-foreground line-clamp-1 max-w-[260px]">
                            {blog.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            /{blog.slug}
                          </div>
                          {blog.excerpt && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px] mt-0.5">
                              {blog.excerpt}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {blog.category ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                        >
                          {blog.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-center">
                      <Badge
                        className="text-[10px] uppercase font-bold px-2 py-0.5"
                        variant={statusStyle.variant}
                      >
                        {statusStyle.label}
                      </Badge>
                    </Td>
                    <Td className="text-muted-foreground text-xs font-medium">
                      {blog.publishedAt
                        ? formatDateTime(blog.publishedAt)
                        : "—"}
                    </Td>
                    <Td className="text-center">
                      {blog.readTime ? (
                        <span className="text-xs text-muted-foreground">
                          {blog.readTime} min
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {blog.status === "published" && (
                          <a
                            href={`https://splitbill.my.id/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-emerald-600"
                              title="Lihat di website"
                            >
                              <ExternalLink size={13} className="mr-1" />
                              View
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/blogs/${blog._id}`)}
                          className="h-8 px-2 text-amber-500"
                          title="Edit"
                        >
                          <Pencil size={13} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(blog._id, blog.title)}
                          disabled={deleting === blog._id}
                          isLoading={deleting === blog._id}
                          className="h-8 px-2 text-red-500"
                          title="Hapus"
                        >
                          <Trash2 size={13} className="mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Artikel Blog"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus artikel berjudul <strong>"{deleteTarget?.title}"</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setDeleteTarget(null)}
          >
            Batal
          </Button>
          <Button variant="danger" size="md" onClick={confirmDeleteBlog}>
            Hapus Artikel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
