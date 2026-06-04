/**
 * Shared utilities for the split-bills draft API.
 */

/**
 * Map a SplitBillRecord document (in draft state) to a clean JSON response.
 * status 'editable' = DRAFT, 'locked' = FINALIZED
 */
export function mapDraft(record) {
  const doc = record.toObject ? record.toObject({ versionKey: false }) : record;

  const userId = (() => {
    if (record.user && typeof record.user === "object" && record.user._id) {
      return record.user._id.toString();
    }
    if (record.user && typeof record.user.toString === "function") {
      return record.user.toString();
    }
    return null;
  })();

  return {
    id: record._id.toString(),
    userId,
    status: doc.status, // 'editable' (DRAFT) or 'locked' (FINALIZED)
    last_step: doc.last_step ?? null,
    activityName: doc.activityName ?? null,
    occurredAt:
      doc.occurredAt instanceof Date
        ? doc.occurredAt.toISOString()
        : doc.occurredAt ?? null,
    participants: doc.participants || [],
    expenses: doc.expenses || [],
    additionalExpenses: doc.additionalExpenses || [],
    paymentMethodIds: doc.paymentMethodIds || [],
    paymentMethodSnapshots: doc.paymentMethodSnapshots || [],
    summary: doc.summary ?? null,
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
