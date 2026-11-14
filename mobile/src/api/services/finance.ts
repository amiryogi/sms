import { http } from "../http";
import { unwrap, unwrapPage, unwrapWithMessage } from "../client";
import type { ApiEnvelope, PaginatedEnvelope } from "../types";
import type { FeeTransaction, PaymentMethod } from "@/types/api";
import type { AccountRow, FinanceDashboard, FinanceReport, ReportName } from "@/types/admin";

export type RecordPaymentInput = {
  studentId: number;
  /** Two decimals at most, more than 0; never more than is owed (server-checked). */
  amount: string;
  method: PaymentMethod;
  reference?: string;
  remarks?: string;
  /** "YYYY-MM-DD", not in the future; default today. */
  paidOn?: string;
  /** A UUID per payment attempt: a retry with the same key returns the first receipt. */
  idempotencyKey: string;
};

/**
 * Fee staff (ADMIN, ACCOUNTANT) side of the ledger (backend/src/routes/fee.routes.js).
 * The ledger is append-only: the app records payments and reads; reversals,
 * discounts and cancellations stay on the web with their approval steps.
 */
export const financeService = {
  dashboard: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<FinanceDashboard>>("/fees/dashboard", { signal })),

  accounts: (query: { search?: string; status?: string; classId?: number; page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    unwrapPage(http.get<PaginatedEnvelope<AccountRow>>("/fees/accounts", { params: { limit: 20, ...query }, signal })),

  transactions: (query: { from?: string; to?: string; type?: "PAYMENT" | "REVERSAL"; method?: PaymentMethod; studentId?: number; page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    unwrapPage(http.get<PaginatedEnvelope<FeeTransaction>>("/fees/transactions", { params: { limit: 20, ...query }, signal })),

  /** Allocated oldest-due first by the server. `replayed` = this key was already recorded. */
  recordPayment: (input: RecordPaymentInput) =>
    unwrapWithMessage(http.post<ApiEnvelope<FeeTransaction & { replayed: boolean }>>("/fees/transactions", input)),

  report: (name: ReportName, query: Record<string, string | number | undefined> = {}, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<FinanceReport>>(`/fees/reports/${name}`, { params: query, signal })),
};
