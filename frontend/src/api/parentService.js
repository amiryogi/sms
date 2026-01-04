import apiClient from "./apiClient";

export const parentService = {
  // =====================================================
  // PARENT-FACING ENDPOINTS (for logged-in parents)
  // =====================================================

  /**
   * Get the logged-in parent's children
   * @returns {Promise<{children: Array, count: number}>}
   */
  getMyChildren: async () => {
    const response = await apiClient.get("/parents/me/children");
    return response.data;
  },

  /**
   * Get specific child details (only if linked to parent)
   * @param {number} studentId
   * @returns {Promise<Object>}
   */
  getChildById: async (studentId) => {
    const response = await apiClient.get(`/parents/me/children/${studentId}`);
    return response.data;
  },

  // =====================================================
  // ADMIN ENDPOINTS (for admin managing parents)
  // =====================================================

  getParents: async (params = {}) => {
    const response = await apiClient.get("/admin/parents", { params });
    return response.data;
  },

  createParent: async (payload) => {
    const response = await apiClient.post("/admin/parents", payload);
    return response.data;
  },

  updateParent: async (id, payload) => {
    const response = await apiClient.put(`/admin/parents/${id}`, payload);
    return response.data;
  },

  linkStudent: async (id, payload) => {
    const response = await apiClient.post(
      `/admin/parents/${id}/link-student`,
      payload
    );
    return response.data;
  },

  unlinkStudent: async (id, studentId) => {
    const response = await apiClient.delete(
      `/admin/parents/${id}/unlink-student`,
      { data: { studentId } }
    );
    return response.data;
  },
};
