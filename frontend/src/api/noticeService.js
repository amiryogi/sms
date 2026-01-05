import apiClient from "./apiClient";

/**
 * Notice Service
 *
 * API calls for notice management.
 * All role-based filtering is handled by the backend.
 */
export const noticeService = {
  /**
   * Get notices (filtered by backend based on user role)
   * @param {Object} params - Query parameters
   * @param {string} params.status - DRAFT | PUBLISHED | ARCHIVED
   * @param {string} params.priority - low | normal | high | urgent
   * @param {string} params.search - Search in title/content
   * @param {number} params.createdById - Filter by creator (admin only)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  getNotices: async (params = {}) => {
    const response = await apiClient.get("/notices", { params });
    return response.data;
  },

  /**
   * Get a single notice by ID
   */
  getNotice: async (id) => {
    const response = await apiClient.get(`/notices/${id}`);
    return response.data;
  },

  /**
   * Create a new notice
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.content
   * @param {string} data.targetType - GLOBAL | ROLE_SPECIFIC | CLASS_SPECIFIC
   * @param {string} data.priority - low | normal | high | urgent
   * @param {string} data.publishFrom - ISO date string
   * @param {string} data.publishTo - ISO date string
   * @param {number[]} data.roleTargets - Role IDs for ROLE_SPECIFIC
   * @param {Object[]} data.classTargets - [{classId, sectionId?}] for CLASS_SPECIFIC
   */
  createNotice: async (data) => {
    const response = await apiClient.post("/notices", data);
    return response.data;
  },

  /**
   * Update a notice (DRAFT only)
   */
  updateNotice: async (id, data) => {
    const response = await apiClient.put(`/notices/${id}`, data);
    return response.data;
  },

  /**
   * Delete a notice (DRAFT only)
   */
  deleteNotice: async (id) => {
    const response = await apiClient.delete(`/notices/${id}`);
    return response.data;
  },

  /**
   * Publish a notice (DRAFT → PUBLISHED)
   */
  publishNotice: async (id) => {
    const response = await apiClient.patch(`/notices/${id}/publish`);
    return response.data;
  },

  /**
   * Archive a notice (PUBLISHED → ARCHIVED)
   */
  archiveNotice: async (id) => {
    const response = await apiClient.patch(`/notices/${id}/archive`);
    return response.data;
  },

  /**
   * Get roles for targeting (admin only)
   */
  getRoles: async () => {
    const response = await apiClient.get("/users/roles");
    return response.data;
  },
};
