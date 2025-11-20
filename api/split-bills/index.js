import SplitBillRecord from "../../lib/models/SplitBillRecord.js";
import { requireUser } from "../../lib/middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

export function mapRecord(record) {
  const doc = record.toObject({ versionKey: false });
  const ownerId = (() => {
    if (record.user && typeof record.user.toString === "function") {
      return record.user.toString();
    }
    if (doc.user && typeof doc.user.toString === "function") {
      return doc.user.toString();
    }
    return typeof doc.user === "string" ? doc.user : undefined;
  })();

  return {
    id: record._id.toString(),
    ownerId: ownerId ?? "",
    activityName: doc.activityName,
    occurredAt:
      doc.occurredAt instanceof Date
        ? doc.occurredAt.toISOString()
        : doc.occurredAt,
    participants: (doc.participants || []).map((participant) => ({
      id: participant.id,
      name: participant.name,
    })),
    expenses: doc.expenses || [],
    additionalExpenses: doc.additionalExpenses || [],
    paymentMethodIds: doc.paymentMethodIds || [],
    paymentMethodSnapshots: doc.paymentMethodSnapshots || [],
    summary: doc.summary,
    status: doc.status,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
    updatedAt:
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : record.updatedAt,
  };
}

function ensureArray(value, message) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, message);
  }
  return value;
}

function sanitizeParticipant(participant) {
  if (!participant || typeof participant !== "object") {
    throw new HttpError(400, "Peserta tidak valid");
  }

  const id = typeof participant.id === "string" ? participant.id.trim() : "";
  const name =
    typeof participant.name === "string" ? participant.name.trim() : "";

  if (!id || !name) {
    throw new HttpError(400, "Data peserta wajib diisi dengan benar");
  }

  return { id, name };
}

function sanitizeExpense(expense, errorMessage) {
  if (!expense || typeof expense !== "object") {
    throw new HttpError(400, errorMessage);
  }

  const id = typeof expense.id === "string" ? expense.id.trim() : "";
  const description =
    typeof expense.description === "string" ? expense.description.trim() : "";
  const paidBy =
    typeof expense.paidBy === "string" ? expense.paidBy.trim() : "";
  const amount = Number(expense.amount);
  const createdAt = Number(expense.createdAt);
  const participants = ensureArray(
    expense.participants,
    "Daftar peserta pada pengeluaran tidak valid"
  ).map((participantId) => {
    if (typeof participantId !== "string" || !participantId.trim()) {
      throw new HttpError(400, "ID peserta pada pengeluaran tidak valid");
    }
    return participantId.trim();
  });

  if (
    !id ||
    !description ||
    !paidBy ||
    Number.isNaN(amount) ||
    amount < 0 ||
    Number.isNaN(createdAt)
  ) {
    throw new HttpError(400, errorMessage);
  }

  return {
    id,
    description,
    paidBy,
    amount,
    createdAt,
    participants,
  };
}

function sanitizeAdditionalExpense(expense) {
  return sanitizeExpense(expense, "Additional expense tidak valid");
}

function sanitizeBaseExpense(expense) {
  return sanitizeExpense(expense, "Pengeluaran tidak valid");
}

function sanitizeSummary(summary) {
  if (!summary || typeof summary !== "object") {
    throw new HttpError(400, "Ringkasan split bill tidak valid");
  }

  const total = Number(summary.total);
  if (Number.isNaN(total) || total < 0) {
    throw new HttpError(400, "Total ringkasan tidak valid");
  }

  const perParticipant = ensureArray(
    summary.perParticipant,
    "Ringkasan per peserta tidak valid"
  ).map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new HttpError(400, "Entry ringkasan peserta tidak valid");
    }

    const participantId =
      typeof entry.participantId === "string" ? entry.participantId.trim() : "";
    const paid = Number(entry.paid);
    const owed = Number(entry.owed);
    const balance = Number(entry.balance);

    if (
      !participantId ||
      Number.isNaN(paid) ||
      Number.isNaN(owed) ||
      Number.isNaN(balance)
    ) {
      throw new HttpError(400, "Data ringkasan peserta tidak valid");
    }

    const owedItems = ensureArray(
      entry.owedItems,
      "Daftar tagihan peserta tidak valid"
    ).map((item) => {
      if (!item || typeof item !== "object") {
        throw new HttpError(400, "Tagihan peserta tidak valid");
      }

      const itemId = typeof item.id === "string" ? item.id.trim() : "";
      const description =
        typeof item.description === "string" ? item.description.trim() : "";
      const amount = Number(item.amount);
      const type = item.type === "additional" ? "additional" : "base";

      if (!itemId || !description || Number.isNaN(amount) || amount < 0) {
        throw new HttpError(400, "Detail tagihan peserta tidak valid");
      }

      return { id: itemId, description, amount, type };
    });

    return {
      participantId,
      paid,
      owed,
      balance,
      owedItems,
    };
  });

  const settlements = ensureArray(
    summary.settlements,
    "Daftar pelunasan tidak valid"
  ).map((settlement) => {
    if (!settlement || typeof settlement !== "object") {
      throw new HttpError(400, "Pelunasan tidak valid");
    }

    const from =
      typeof settlement.from === "string" ? settlement.from.trim() : "";
    const to = typeof settlement.to === "string" ? settlement.to.trim() : "";
    const amount = Number(settlement.amount);

    if (!from || !to || Number.isNaN(amount) || amount < 0) {
      throw new HttpError(400, "Data pelunasan tidak valid");
    }

    return { from, to, amount };
  });

  return {
    total,
    perParticipant,
    settlements,
  };
}

function sanitizePaymentMethodSnapshot(method) {
  if (!method || typeof method !== "object") {
    throw new HttpError(400, "Snapshot metode pembayaran tidak valid");
  }

  const id = typeof method.id === "string" ? method.id.trim() : "";
  const category =
    method.category === "bank_transfer"
      ? "bank_transfer"
      : method.category === "ewallet"
      ? "ewallet"
      : null;
  const provider =
    typeof method.provider === "string" ? method.provider.trim() : "";
  const ownerName =
    typeof method.ownerName === "string" ? method.ownerName.trim() : "";
  const accountNumber =
    typeof method.accountNumber === "string"
      ? method.accountNumber.trim()
      : undefined;
  const phoneNumber =
    typeof method.phoneNumber === "string"
      ? method.phoneNumber.trim()
      : undefined;

  if (!id || !category || !provider || !ownerName) {
    throw new HttpError(400, "Data snapshot metode pembayaran tidak valid");
  }

  if (category === "bank_transfer" && !accountNumber) {
    throw new HttpError(
      400,
      "Snapshot bank transfer wajib memiliki accountNumber"
    );
  }
  if (category === "ewallet" && !phoneNumber) {
    throw new HttpError(400, "Snapshot e-wallet wajib memiliki phoneNumber");
  }

  return { id, category, provider, ownerName, accountNumber, phoneNumber };
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Payload tidak valid");
  }

  const activityName =
    typeof payload.activityName === "string" ? payload.activityName.trim() : "";
  const occurredAt =
    typeof payload.occurredAt === "string" ? payload.occurredAt : null;

  if (!activityName) {
    throw new HttpError(400, "Nama aktivitas wajib diisi");
  }

  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
    throw new HttpError(400, "Tanggal aktivitas tidak valid");
  }

  const participants = ensureArray(
    payload.participants,
    "Daftar peserta tidak valid"
  ).map(sanitizeParticipant);

  const expenses = ensureArray(
    payload.expenses,
    "Daftar pengeluaran tidak valid"
  ).map(sanitizeBaseExpense);

  const additionalExpenses = ensureArray(
    payload.additionalExpenses,
    "Daftar additional expense tidak valid"
  ).map(sanitizeAdditionalExpense);

  const paymentMethodIds = ensureArray(
    payload.paymentMethodIds,
    "Daftar metode pembayaran tidak valid"
  ).map((id) => {
    if (typeof id !== "string" || !id.trim()) {
      throw new HttpError(400, "ID metode pembayaran tidak valid");
    }
    return id.trim();
  });

  const paymentMethodSnapshots = ensureArray(
    payload.paymentMethodSnapshots ?? [],
    "Daftar snapshot metode pembayaran tidak valid"
  ).map(sanitizePaymentMethodSnapshot);

  const summary = sanitizeSummary(payload.summary);

  return {
    activityName,
    occurredAt: new Date(occurredAt),
    participants,
    expenses,
    additionalExpenses,
    paymentMethodIds,
    paymentMethodSnapshots,
    summary,
  };
}

export async function handleSplitBills(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);

    if (method === "GET") {
      const records = await SplitBillRecord.find({ user: user._id }).sort({
        createdAt: -1,
      });
      return jsonResponse(
        200,
        {
          success: true,
          records: records.map(mapRecord),
        },
        headers
      );
    }

    if (method === "POST") {
      const payload = await parseJsonBody(event);
      const sanitized = sanitizePayload(payload);

      const record = await SplitBillRecord.create({
        ...sanitized,
        user: user._id,
      });

      return jsonResponse(
        201,
        {
          success: true,
          record: mapRecord(record),
        },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Split bills handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitBills;
