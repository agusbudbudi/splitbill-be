import { useState, useEffect } from "react";
import { Search, Star, MessageSquare, Phone } from "lucide-react";
import Pagination from "../components/Pagination";
import { formatDateTime } from "../lib/utils";
import clsx from "clsx";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Stats
  const [avgRating, setAvgRating] = useState(0);
  const [contactableCount, setContactableCount] = useState(0);

  useEffect(() => {
    fetchReviews(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchReviews = async (page) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews?page=${page}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setReviews(data.data.reviews);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Failed to fetch reviews");
      }
    } catch (err) {
      setError("An error occurred while fetching reviews");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/reviews?page=1&limit=1000");
      const data = await res.json();

      if (data.success) {
        const allReviews = data.data.reviews;
        const avg =
          allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) /
              allReviews.length
            : 0;
        const contactable = allReviews.filter(
          (r) => r.contactPermission,
        ).length;

        setAvgRating(avg);
        setContactableCount(contactable);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const filteredReviews = reviews.filter(
    (review) =>
      review.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderStars = (rating) => {
    return (
      <div className="flex text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            fill={i < rating ? "currentColor" : "none"}
            className={i < rating ? "text-yellow-500" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Daftar Review
        </h1>
        <p
          className="text-sm font-regular mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Pantau feedback dan pengalaman pengguna untuk meningkatkan kualitas
          layanan.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        <div
          className="p-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1.2rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total Review
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: "var(--foreground)" }}
              >
                {totalItems}
              </p>
            </div>
          </div>
        </div>
        <div
          className="p-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1.2rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "var(--warning-soft)",
                color: "var(--warning)",
              }}
            >
              <Star className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Rating Rata-rata
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: "var(--foreground)" }}
              >
                {avgRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        <div
          className="p-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1.2rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "var(--success-soft)",
                color: "var(--success)",
              }}
            >
              <Phone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Bersedia Dihubungi
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: "var(--foreground)" }}
              >
                {contactableCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "1.2rem",
          boxShadow: "var(--shadow-soft)",
          overflow: "hidden",
        }}
      >
        <div
          className="px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search
                className="h-5 w-5"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-10 pr-4 py-2.5 text-sm transition-all"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "calc(var(--radius) - 4px)",
                color: "var(--foreground)",
              }}
              placeholder="Cari review..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-[#fbfcff]">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Nama
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                >
                  Review
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rating
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tanggal & Waktu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Bersedia Dihubungi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading reviews...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-sm text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No reviews found.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {review.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 break-words">
                      {review.review}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStars(review.rating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(review.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit",
                            review.contactPermission
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800",
                          )}
                        >
                          {review.contactPermission ? "YA" : "TIDAK"}
                        </span>
                        {review.contactPermission && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div>{review.email}</div>
                            <div>{review.phone}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemName="reviews"
        />
      </div>
    </div>
  );
}
