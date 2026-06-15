/**
 * A business or voucher is hidden from public and customer-facing queries when
 * it has been soft-deleted (`deletedAt`) or flagged by an admin (`flaggedAt`).
 */
export function isHidden(doc: {
  deletedAt?: number;
  flaggedAt?: number;
}): boolean {
  return doc.deletedAt !== undefined || doc.flaggedAt !== undefined;
}
