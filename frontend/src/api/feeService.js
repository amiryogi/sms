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
};
