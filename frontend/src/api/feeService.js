import apiClient from "./apiClient";

export const feeService = {
  // Fee Types
  getFeeTypes: async (params = {}) => {
    const response = await apiClient.get("/fees/types", { params });
    return response.data;
  },
  getFeeType: async (id) => {
    const response = await apiClient.get(`/fees/types/${id}`);
    return response.data;
  },
  createFeeType: async (data) => {
    const response = await apiClient.post("/fees/types", data);
    return response.data;
  },
  updateFeeType: async (id, data) => {
    const response = await apiClient.put(`/fees/types/${id}`, data);
    return response.data;
  },
  deleteFeeType: async (id) => {
    const response = await apiClient.delete(`/fees/types/${id}`);
    return response.data;
  },

  // Fee Structures
  getFeeStructures: async (params = {}) => {
    const response = await apiClient.get("/fees/structures", { params });
    return response.data;
  },
  getFeeStructuresByClass: async (classId, academicYearId) => {
    const response = await apiClient.get(
      `/fees/structures/by-class/${classId}/${academicYearId}`
    );
    return response.data;
  },
  getFeeStructure: async (id) => {
    const response = await apiClient.get(`/fees/structures/${id}`);
    return response.data;
  },
  createFeeStructure: async (data) => {
    const response = await apiClient.post("/fees/structures", data);
    return response.data;
  },
  bulkCreateFeeStructures: async (data) => {
    const response = await apiClient.post("/fees/structures/bulk", data);
    return response.data;
  },
  updateFeeStructure: async (id, data) => {
    const response = await apiClient.put(`/fees/structures/${id}`, data);
    return response.data;
  },
  deleteFeeStructure: async (id) => {
    const response = await apiClient.delete(`/fees/structures/${id}`);
    return response.data;
  },

  // Fee Payments
  getFeePayments: async (params = {}) => {
    const response = await apiClient.get("/fees/payments", { params });
    return response.data;
  },
  getStudentFeeSummary: async (studentId, params = {}) => {
    const response = await apiClient.get(
      `/fees/payments/student/${studentId}`,
      { params }
    );
    return response.data;
  },
  recordPayment: async (feePaymentId, data) => {
    const response = await apiClient.post(
      `/fees/payments/${feePaymentId}/pay`,
      data
    );
    return response.data;
  },
  generateStudentFees: async (studentClassId) => {
    const response = await apiClient.post(
      `/fees/payments/generate/${studentClassId}`
    );
    return response.data;
  },
  bulkGenerateFees: async (data) => {
    const response = await apiClient.post("/fees/payments/generate-bulk", data);
    return response.data;
  },

  // ---------- Ledger (docs/plans/finance-and-portals.md §5) ----------

  /** Paged student accounts with totals; params: academicYearId, classId, sectionId, status, search, page, limit. */
  getAccounts: async (params = {}) => (await apiClient.get("/fees/accounts", { params })).data,
  /** Statement: years -> fees -> installments, discounts, transactions. */
  getStatement: async (studentId, params = {}) => (await apiClient.get(`/fees/accounts/${studentId}`, { params })).data,

  /** Record a payment; data.idempotencyKey makes a resend return the same receipt. */
  recordTransaction: async (data) => (await apiClient.post("/fees/transactions", data)).data,
  getTransactions: async (params = {}) => (await apiClient.get("/fees/transactions", { params })).data,
  getTransaction: async (id) => (await apiClient.get(`/fees/transactions/${id}`)).data,

  requestReversal: async (transactionId, data) => (await apiClient.post(`/fees/transactions/${transactionId}/reversal-requests`, data)).data,
  reverseTransaction: async (transactionId, data) => (await apiClient.post(`/fees/transactions/${transactionId}/reverse`, data)).data,
  getReversalRequests: async (params = {}) => (await apiClient.get("/fees/reversal-requests", { params })).data,
  approveReversal: async (requestId, data = {}) => (await apiClient.post(`/fees/reversal-requests/${requestId}/approve`, data)).data,
  rejectReversal: async (requestId, data = {}) => (await apiClient.post(`/fees/reversal-requests/${requestId}/reject`, data)).data,

  getDiscounts: async (params = {}) => (await apiClient.get("/fees/discounts", { params })).data,
  requestDiscount: async (data) => (await apiClient.post("/fees/discounts", data)).data,
  updateDiscount: async (id, data) => (await apiClient.put(`/fees/discounts/${id}`, data)).data,
  approveDiscount: async (id, data = {}) => (await apiClient.post(`/fees/discounts/${id}/approve`, data)).data,
  rejectDiscount: async (id, data = {}) => (await apiClient.post(`/fees/discounts/${id}/reject`, data)).data,
  revokeDiscount: async (id, data) => (await apiClient.post(`/fees/discounts/${id}/revoke`, data)).data,

  cancelObligation: async (obligationId, data) => (await apiClient.post(`/fees/obligations/${obligationId}/cancel`, data)).data,
  getInstallmentPlan: async (feeStructureId) => (await apiClient.get(`/fees/structures/${feeStructureId}/installments`)).data,
  setInstallmentPlan: async (feeStructureId, installments) =>
    (await apiClient.put(`/fees/structures/${feeStructureId}/installments`, { installments })).data,
  reconcile: async () => (await apiClient.get("/fees/reconcile")).data,

  // ---------- Dashboard and reports (Phase 5) ----------
  /** KPIs and chart series; params: academicYearId, classId, feeTypeId, method, from, to. */
  getDashboard: async (params = {}) => (await apiClient.get("/fees/dashboard", { params })).data,
  /** { report, title, subtitle, columns, rows, totals } for collections | outstanding | discounts | reversals. */
  getReport: async (name, params = {}) => (await apiClient.get(`/fees/reports/${name}`, { params })).data,
  /** The same report as a CSV file: { blob, filename }. */
  downloadReport: async (name, params = {}) => {
    const response = await apiClient.get(`/fees/reports/${name}`, { params: { ...params, format: "csv" }, responseType: "blob" });
    const match = /filename="([^"]+)"/.exec(response.headers["content-disposition"] || "");
    return { blob: response.data, filename: match ? match[1] : `${name}.csv` };
  },
};
