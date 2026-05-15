import { connectDatabase } from "../lib/db.js";
import Blog from "../lib/models/Blog.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams, parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

/**
 * Converts a title string to a URL-friendly slug.
 * Example: "Tips Split Bill Hemat!" → "tips-split-bill-hemat"
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Estimates reading time (in minutes) by stripping HTML tags and counting words.
 * Assumes an average reading speed of 200 words per minute.
 */
export function estimateReadTime(htmlContent) {
  if (!htmlContent) return 0;
  const text = htmlContent.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function handleBlogs(event) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "GET":
        return await getBlogs(event, headers);
      case "POST":
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware(createBlog)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Blogs handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function getBlogs(event, headers) {
  const query = getQueryParams(event);
  const { page = "1", limit = "10", category, tag, status } = query;

  // Attempt admin check — if it passes, admin can see all statuses
  let isAdmin = false;
  try {
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);
    isAdmin = true;
  } catch (_) {
    // Not an admin — public access, show only published
  }

  const filter = {};

  if (isAdmin) {
    // Admin can filter by status, or get all if status=all
    if (status && status !== "all") {
      filter.status = status;
    }
    // If no status param or status=all, no filter → return everything
  } else {
    // Public: always only published
    filter.status = "published";
  }

  if (category) filter.category = { $regex: new RegExp(category, "i") };
  if (tag) filter.tags = { $in: [tag] };

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-content"), // Exclude full content for list view (performance)
    Blog.countDocuments(filter),
  ]);

  return jsonResponse(
    200,
    {
      success: true,
      data: blogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
    headers,
  );
}

async function createBlog(event, headers) {
  const body = await parseJsonBody(event);
  const {
    title,
    slug: slugInput,
    excerpt,
    content,
    thumbnail,
    thumbnailAlt,
    author,
    category,
    tags,
    metaTitle,
    metaDescription,
    canonicalUrl,
    status = "draft",
  } = body;

  if (!title || !title.trim()) {
    throw new HttpError(400, "Title is required");
  }

  // Auto-generate slug from title if not provided
  let slug = slugInput ? slugInput.toLowerCase().trim() : generateSlug(title);

  // Ensure slug uniqueness — suffix with timestamp if collision
  const existingSlug = await Blog.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  const readTime = estimateReadTime(content);
  const publishedAt = status === "published" ? new Date() : undefined;

  const blog = await Blog.create({
    title: title.trim(),
    slug,
    excerpt,
    content: content || "",
    thumbnail,
    thumbnailAlt,
    author,
    category,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    metaTitle,
    metaDescription,
    canonicalUrl,
    status,
    publishedAt,
    readTime,
  });

  return jsonResponse(201, { success: true, data: blog }, headers);
}

export default handleBlogs;
