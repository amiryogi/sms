import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { FeeStatement, FeeTransaction } from "@/types/api";

/** backend/src/routes/fee.routes.js: read side (append-only ledger). */
export const feeService = {
  /** Every year's fees, installments, discounts and receipts. Owner, parent, or fee staff. */
  statement: (studentId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<FeeStatement>>(`/fees/accounts/${studentId}`, { signal })),

  /** One receipt (payment or reversal). */
  transaction: (id: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<FeeTransaction>>(`/fees/transactions/${id}`, { signal })),
};
