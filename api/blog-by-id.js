import mongoose from "mongoose";
import { connectDatabase } from "../lib/db.js";
import Blog from "../lib/models/Blog.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { generateSlug, estimateReadTime } from "./blogs.js";

export async function handleBlogById(event, idOrSlug) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "GET":
        return await getBlog(event, idOrSlug, headers);
      case "PUT":
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware((ev, h) => updateBlog(ev, idOrSlug, h))(
          event,
          headers,
        );
      case "DELETE":
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware((ev, h) => deleteBlog(ev, idOrSlug, h))(
          event,
          headers,
        );
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Blog by ID handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function getBlog(event, idOrSlug, headers) {
  let blog;

  // Support lookup by MongoDB ObjectId OR by slug
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  if (isObjectId) {
    blog = await Blog.findById(idOrSlug);
  } else {
    blog = await Blog.findOne({ slug: idOrSlug });
  }

  if (!blog) {
    throw new HttpError(404, "Blog not found");
  }

  // Draft posts are only visible to admins
  if (blog.status === "draft") {
    try {
      const { requireAdmin } = await import("../lib/middleware/auth.js");
      await requireAdmin(event);
    } catch (_) {
      throw new HttpError(404, "Blog not found");
    }
  }

  return jsonResponse(200, { success: true, data: blog }, headers);
}

async function updateBlog(event, id, headers) {
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
    status,
  } = body;

  const blog = await Blog.findById(id);
  if (!blog) throw new HttpError(404, "Blog not found");

  // Handle slug update logic
  if (slugInput && slugInput.toLowerCase().trim() !== blog.slug) {
    const existing = await Blog.findOne({
      slug: slugInput.toLowerCase().trim(),
      _id: { $ne: id },
    });
    if (existing) throw new HttpError(400, "Slug sudah digunakan oleh artikel lain");
    blog.slug = slugInput.toLowerCase().trim();
  } else if (title && title !== blog.title && !slugInput) {
    // Auto-regenerate slug from new title only if no custom slug was given
    const newSlug = generateSlug(title);
    const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
    if (!existing) blog.slug = newSlug;
  }

  // Apply all provided fields
  if (title !== undefined) blog.title = title.trim();
  if (excerpt !== undefined) blog.excerpt = excerpt;
  if (content !== undefined) {
    blog.content = content;
    blog.readTime = estimateReadTime(content);
  }
  if (thumbnail !== undefined) blog.thumbnail = thumbnail;
  if (thumbnailAlt !== undefined) blog.thumbnailAlt = thumbnailAlt;
  if (author !== undefined) blog.author = author;
  if (category !== undefined) blog.category = category;
  if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (metaTitle !== undefined) blog.metaTitle = metaTitle;
  if (metaDescription !== undefined) blog.metaDescription = metaDescription;
  if (canonicalUrl !== undefined) blog.canonicalUrl = canonicalUrl;

  // Handle status transition: auto-set publishedAt on first publish
  if (status !== undefined && status !== blog.status) {
    blog.status = status;
    if (status === "published" && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
  }

  await blog.save();

  return jsonResponse(200, { success: true, data: blog }, headers);
}

async function deleteBlog(event, id, headers) {
  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) throw new HttpError(404, "Blog not found");

  return jsonResponse(
    200,
    { success: true, message: "Artikel berhasil dihapus" },
    headers,
  );
}

export default handleBlogById;
