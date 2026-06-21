import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { Star, MessageSquare, Phone, Globe, X } from "lucide-react";
import {
  Card, CardHeader,
  StatCard, SearchInput, Select, Badge,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  EmptyState, Pagination, useToast,
} from "../components/ui";
import { formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";

// Reusable star rating display
function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "text-warning" : "text-border"}
        />
      ))}
    </div>
  );
}

// Compact interactive star rating for filter
function StarFilter({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(value === star ? "" : star)}
          className="transition-transform hover:scale-110"
          title={`${star} bintang`}
        >
          <Star
            size={16}
            fill={(hovered || value) >= star ? "currentColor" : "none"}
            className={(hovered || value) >= star ? "text-warning" : "text-border hover:text-warning/60"}
          />
        </button>
      ))}
      {value !== "" && (
        <span className="ml-1 text-xs text-warning font-semibold">{value}★</span>
      )}
    </div>
  );
}

const LANDING_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "true", label: "Di Landing" },
  { value: "false", label: "Tidak Aktif" },
];

export default function Reviews() {
  usePageMeta(
    "Daftar Review",
    "Pantau feedback dan pengalaman pengguna untuk meningkatkan kualitas layanan."
  );
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState(""); // "" | 1-5
  const [landingFilter, setLandingFilter] = useState(""); // "" | "true" | "false"
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [contactableCount, setContactableCount] = useState(0);

  // Debounce search & reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter, landingFilter]);

  const fetchReviews = useCallback(async (page, search, rating, landing) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (rating !== "") params.set("rating", rating);
      if (landing !== "") params.set("showOnLanding", landing);
      const res = await apiFetch(`/api/reviews?${params}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Gagal memuat data review");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/reviews/stats");
      const data = await res.json();
      if (data.success) {
        setAvgRating(data.data.avgRating);
        setContactableCount(data.data.contactableCount);
      }
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchReviews(currentPage, debouncedSearch, ratingFilter, landingFilter);
  }, [currentPage, debouncedSearch, ratingFilter, landingFilter, fetchReviews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Toggle landing page — uses toast instead of browser confirm()
  const handleToggleLanding = async (reviewId, currentStatus) => {
    const action = currentStatus ? "dihapus dari" : "ditampilkan di";
    try {
      const res = await apiFetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, showOnLanding: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ message: `Review ${action} landing page`, type: "success" });
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewId ? { ...r, showOnLanding: !currentStatus } : r
          )
        );
      } else {
        toast({ message: data.message || "Gagal memperbarui status", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan koneksi", type: "error" });
    }
  };

  const hasActiveFilters = ratingFilter !== "" || landingFilter !== "" || debouncedSearch;
  const clearFilters = () => {
    setRatingFilter("");
    setLandingFilter("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Daftar Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pantau feedback dan pengalaman pengguna untuk meningkatkan kualitas layanan.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Review"
          value={totalItems}
          icon={MessageSquare}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Rating Rata-rata"
          value={avgRating.toFixed(1)}
          icon={Star}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Bersedia Dihubungi"
          value={contactableCount}
          icon={Phone}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none min-w-0">
            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama atau isi review..."
              className="w-52 shrink-0"
            />

            {/* Divider */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Rating filter — interactive stars */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rating:</span>
              <StarFilter value={ratingFilter} onChange={setRatingFilter} />
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Landing Page filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={landingFilter}
                onChange={(e) => setLandingFilter(e.target.value)}
              >
                {LANDING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            {/* Reset filter */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-auto"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Nama</Th>
              <Th className="w-1/3">Review</Th>
              <Th>Rating</Th>
              <Th>Tanggal &amp; Waktu</Th>
              <Th>Kontak</Th>
              <Th className="text-center">Landing Page</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={6} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={6} className="text-center py-12 text-destructive">{error}</Td>
              </Tr>
            </Tbody>
          ) : reviews.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={6} className="p-0">
                  <EmptyState
                    icon={MessageSquare}
                    title="Tidak ada review ditemukan"
                    description={hasActiveFilters ? "Coba ubah filter atau kata kunci pencarian." : "Belum ada review masuk."}
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {reviews.map((review) => (
                <Tr key={review._id}>
                  <Td className="font-semibold whitespace-nowrap">{review.name}</Td>
                  <Td className="text-muted-foreground break-words">{review.review}</Td>
                  <Td>
                    <StarRating rating={review.rating} />
                  </Td>
                  <Td className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(review.createdAt)}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge variant={review.contactPermission ? "success" : "neutral"}>
                        {review.contactPermission ? "Bersedia" : "Tidak"}
                      </Badge>
                      {review.contactPermission && (
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                          {review.email && <div>{review.email}</div>}
                          {review.phone && <div>{review.phone}</div>}
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td className="text-center">
                    <button
                      onClick={() => handleToggleLanding(review._id, review.showOnLanding)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        review.showOnLanding
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={review.showOnLanding ? "Hapus dari landing page" : "Tampilkan di landing page"}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {review.showOnLanding ? "Aktif" : "Nonaktif"}
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>

        {!loading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemName="review"
          />
        )}
      </Card>
    </div>
  );
}
