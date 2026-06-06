import mongoose from "mongoose";

import SplitBillRecord from "../../../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../../lib/http.js";
import { parseJsonBody } from "../../../lib/parsers.js";
import { HttpError, toHttpError } from "../../../lib/errors.js";
import { mapDraft } from "./utils.js";
import { mapRecord } from "../index.js";

// ─── Sanitizers (reused from index.js pattern) ───────────────────────────────

function ensureArray(value, message) {
  if (!Array.isArray(value)) throw new HttpError(400, message);
  return value;
}

function sanitizeParticipant(p) {
  if (!p || typeof p !== "object") throw new HttpError(400, "Peserta tidak valid");
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!id || !name) throw new HttpError(400, "ID dan nama peserta wajib diisi");
  return { id, name };
}

function sanitizeExpense(expense, msg) {
  if (!expense || typeof expense !== "object") throw new HttpError(400, msg);
  const id = typeof expense.id === "string" ? expense.id.trim() : "";
  const description = typeof expense.description === "string" ? expense.description.trim() : "";
  const paidBy = typeof expense.paidBy === "string" ? expense.paidBy.trim() : "";
  const amount = Number(expense.amount);
  const createdAt = Number(expense.createdAt);
  const participants = ensureArray(expense.participants, "Daftar peserta pada pengeluaran tidak valid").map(
    (pid) => {
      if (typeof pid !== "string" || !pid.trim()) throw new HttpError(400, "ID peserta tidak valid");
      return pid.trim();
    }
  );
  if (!id || !description || !paidBy || Number.isNaN(amount) || Number.isNaN(createdAt)) {
    throw new HttpError(400, msg);
  }
  return { id, description, paidBy, amount, createdAt, participants };
}

function sanitizeAdditionalExpense(expense) {
  const sanitized = sanitizeExpense(expense, "Additional expense tidak valid");
  const splitType = expense.splitType === "proportionally" ? "proportionally" : "equally";
  return { ...sanitized, splitType };
}

function sanitizePaymentMethodSnapshot(method) {
  if (!method || typeof method !== "object") throw new HttpError(400, "Snapshot metode pembayaran tidak valid");
  const id = typeof method.id === "string" ? method.id.trim() : "";
  const category =
    method.category === "bank_transfer"
      ? "bank_transfer"
      : method.category === "ewallet"
      ? "ewallet"
      : null;
  const provider = typeof method.provider === "string" ? method.provider.trim() : "";
  const ownerName = typeof method.ownerName === "string" ? method.ownerName.trim() : "";
  const accountNumber = typeof method.accountNumber === "string" ? method.accountNumber.trim() : undefined;
  const phoneNumber = typeof method.phoneNumber === "string" ? method.phoneNumber.trim() : undefined;
  if (!id || !category || !provider || !ownerName) throw new HttpError(400, "Data snapshot metode pembayaran tidak valid");
  if (category === "bank_transfer" && !accountNumber) throw new HttpError(400, "Snapshot bank transfer wajib memiliki accountNumber");
  if (category === "ewallet" && !phoneNumber) throw new HttpError(400, "Snapshot e-wallet wajib memiliki phoneNumber");
  return { id, category, provider, ownerName, accountNumber, phoneNumber };
}

function sanitizeSummary(summary) {
  if (!summary || typeof summary !== "object") throw new HttpError(400, "Ringkasan split bill tidak valid");
  const total = Number(summary.total);
  if (Number.isNaN(total)) throw new HttpError(400, "Total ringkasan tidak valid");

  const perParticipant = ensureArray(summary.perParticipant, "Ringkasan per peserta tidak valid").map((entry) => {
    if (!entry || typeof entry !== "object") throw new HttpError(400, "Entry ringkasan peserta tidak valid");
    const participantId = typeof entry.participantId === "string" ? entry.participantId.trim() : "";
    const paid = Number(entry.paid);
    const owed = Number(entry.owed);
    const balance = Number(entry.balance);
    if (!participantId || Number.isNaN(paid) || Number.isNaN(owed) || Number.isNaN(balance)) {
      throw new HttpError(400, "Data ringkasan peserta tidak valid");
    }
    const owedItems = ensureArray(entry.owedItems, "Daftar tagihan peserta tidak valid").map((item) => {
      if (!item || typeof item !== "object") throw new HttpError(400, "Tagihan peserta tidak valid");
      const itemId = typeof item.id === "string" ? item.id.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      const amount = Number(item.amount);
      const type = item.type === "additional" ? "additional" : "base";
      if (!itemId || !description || Number.isNaN(amount)) throw new HttpError(400, "Detail tagihan peserta tidak valid");
      return { id: itemId, description, amount, type };
    });
    return { participantId, paid, owed, balance, owedItems };
  });

  const settlements = ensureArray(summary.settlements, "Daftar pelunasan tidak valid").map((s) => {
    if (!s || typeof s !== "object") throw new HttpError(400, "Pelunasan tidak valid");
    const from = typeof s.from === "string" ? s.from.trim() : "";
    const to = typeof s.to === "string" ? s.to.trim() : "";
    const amount = Number(s.amount);
    if (!from || !to || Number.isNaN(amount) || amount < 0) throw new HttpError(400, "Data pelunasan tidak valid");
    return { from, to, amount };
  });

  return { total, perParticipant, settlements };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve optional auth. Returns user or null (for guests).
 */
async function tryGetUser(event) {
  // Read the Authorization header robustly. In Netlify Functions v2 `event.headers`
  // is a `Headers` object (use `.get()`); in v1 it's a plain object (property access).
  const rawHeaders = event?.headers;
  let authorization = null;
  if (rawHeaders && typeof rawHeaders.get === "function") {
    authorization = rawHeaders.get("authorization") || rawHeaders.get("Authorization");
  } else if (rawHeaders) {
    authorization = rawHeaders.authorization || rawHeaders.Authorization;
  }

  if (!authorization) return null; // No token header -> guest user

  const { requireUser } = await import("../../../lib/middleware/auth.js");
  return await requireUser(event); // Let token validation/expiration errors bubble up
}

/**
 * Validate that the caller is allowed to access this draft.
 * - Guest: draft must have user=null
 * - Authenticated: draft must belong to user OR draft.user=null (guest draft before association)
 */
function assertDraftAccess(draft, userId) {
  if (!draft) throw new HttpError(404, "Draft tidak ditemukan");
  if (draft.user === null || draft.user === undefined) return; // guest draft — open access
  if (userId && draft.user.toString() === userId.toString()) return;
  throw new HttpError(403, "Anda tidak memiliki akses ke draft ini");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Handler for /api/split-bills/drafts/:draftId[/:action]
 *
 * GET  /api/split-bills/drafts/:draftId           — fetch draft
 * PUT  /api/split-bills/drafts/:draftId           — update draft (Steps 1-3)
 * POST /api/split-bills/drafts/:draftId/finalize  — finalize draft (auth required)
 */
export async function handleDraftById(event, draftId, action, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      throw new HttpError(400, "ID draft tidak valid");
    }

    await connectDatabase();

    // ── POST /drafts/:draftId/finalize ──────────────────────────────────────
    if (method === "POST" && action === "finalize") {
      const { requireUser } = await import("../../../lib/middleware/auth.js");
      const user = await requireUser(event); // Throws 401 for guests (AC-05)

      const draft = await SplitBillRecord.findById(draftId);
      if (!draft) throw new HttpError(404, "Draft tidak ditemukan");
      if (draft.status === "locked") {
        throw new HttpError(409, "Draft ini sudah difinalisasi");
      }

      // Guest draft association — if draft has no user, assign current user
      if (!draft.user) {
        draft.user = user._id;
      } else if (draft.user.toString() !== user._id.toString()) {
        throw new HttpError(403, "Anda tidak memiliki akses ke draft ini");
      }

      // Validate all required fields are present before finalization
      if (!draft.activityName) throw new HttpError(400, "Nama aktivitas wajib diisi sebelum finalisasi");
      if (!draft.occurredAt) throw new HttpError(400, "Tanggal aktivitas wajib diisi sebelum finalisasi");
      if (!draft.participants || draft.participants.length === 0) {
        throw new HttpError(400, "Minimal satu peserta wajib diisi sebelum finalisasi");
      }
      if (!draft.expenses || draft.expenses.length === 0) {
        throw new HttpError(400, "Minimal satu pengeluaran wajib diisi sebelum finalisasi");
      }
      if (!draft.summary) {
        throw new HttpError(400, "Ringkasan split bill wajib diisi sebelum finalisasi");
      }

      // Finalize: editable → locked, last_step → FINALIZED
      draft.status = "locked";
      draft.last_step = "FINALIZED";
      draft.user = user._id;
      await draft.save();

      // Populate user for response
      await draft.populate("user", "name email");

      return jsonResponse(
        200,
        {
          success: true,
          record: mapRecord(draft),
        },
        headers
      );
    }

    // ── GET /drafts/:draftId ────────────────────────────────────────────────
    if (method === "GET") {
      const user = await tryGetUser(event);
      const draft = await SplitBillRecord.findById(draftId);

      assertDraftAccess(draft, user?._id);

      // Auto-associate guest draft with authenticated user on first access
      if (user && (draft.user === null || draft.user === undefined)) {
        draft.user = user._id;
        await draft.save();
      }

      return jsonResponse(
        200,
        {
          success: true,
          draft: mapDraft(draft),
        },
        headers
      );
    }

    // ── PUT /drafts/:draftId ────────────────────────────────────────────────
    if (method === "PUT") {
      const user = await tryGetUser(event);
      const draft = await SplitBillRecord.findById(draftId);

      assertDraftAccess(draft, user?._id);

      // Auto-associate guest draft with authenticated user on first write
      if (user && (draft.user === null || draft.user === undefined)) {
        draft.user = user._id;
      }

      if (draft.status === "locked") {
        throw new HttpError(409, "Draft ini sudah difinalisasi dan tidak dapat diubah");
      }

      const payload = await parseJsonBody(event);
      const last_step = payload?.last_step;

      const validSteps = ["STEP_1", "STEP_2", "STEP_3", "FINALIZED"];
      if (!last_step || !validSteps.includes(last_step)) {
        throw new HttpError(400, "last_step tidak valid. Nilai yang diizinkan: STEP_1, STEP_2, STEP_3");
      }

      // ── Step 1 update: activityName, occurredAt, participants
      if (last_step === "STEP_1" || payload?.activityName !== undefined || payload?.occurredAt !== undefined) {
        if (payload?.activityName !== undefined) {
          const activityName = typeof payload.activityName === "string" ? payload.activityName.trim() : "";
          if (!activityName) throw new HttpError(400, "Nama aktivitas tidak boleh kosong");
          draft.activityName = activityName;
        }
        if (payload?.occurredAt !== undefined) {
          const occurredAt = typeof payload.occurredAt === "string" ? payload.occurredAt : null;
          if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) throw new HttpError(400, "Tanggal aktivitas tidak valid");
          draft.occurredAt = new Date(occurredAt);
        }
        if (payload?.participants !== undefined) {
          draft.participants = ensureArray(payload.participants, "Daftar peserta tidak valid").map(sanitizeParticipant);
        }
      }

      // ── Step 2 update: expenses, additionalExpenses
      if (payload?.expenses !== undefined) {
        draft.expenses = ensureArray(payload.expenses, "Daftar pengeluaran tidak valid").map((e) =>
          sanitizeExpense(e, "Pengeluaran tidak valid")
        );
      }
      if (payload?.additionalExpenses !== undefined) {
        draft.additionalExpenses = ensureArray(payload.additionalExpenses, "Daftar additional expense tidak valid").map(
          sanitizeAdditionalExpense
        );
      }

      // ── Step 3 update: payment methods, summary
      if (payload?.paymentMethodIds !== undefined) {
        draft.paymentMethodIds = ensureArray(payload.paymentMethodIds, "Daftar metode pembayaran tidak valid").map((id) => {
          if (typeof id !== "string" || !id.trim()) throw new HttpError(400, "ID metode pembayaran tidak valid");
          return id.trim();
        });
      }
      if (payload?.paymentMethodSnapshots !== undefined) {
        draft.paymentMethodSnapshots = ensureArray(
          payload.paymentMethodSnapshots,
          "Daftar snapshot metode pembayaran tidak valid"
        ).map(sanitizePaymentMethodSnapshot);
      }
      if (payload?.summary !== undefined) {
        draft.summary = sanitizeSummary(payload.summary);
      }

      draft.last_step = last_step;

      await draft.save();

      return jsonResponse(
        200,
        {
          success: true,
          draft: mapDraft(draft),
        },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Draft detail handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleDraftById;
