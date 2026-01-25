import apiClient from './apiClient';

export const promotionService = {
  /**
   * Get promotion history with optional filters
   * @param {Object} params - Query params (studentId, fromAcademicYearId, toAcademicYearId, status, page, limit)
   */
  getHistory: async (params = {}) => {
    const response = await apiClient.get('/promotions', { params });
    return response.data;
  },

  /**
   * Get promotion statistics
   * @param {number} academicYearId - Optional academic year filter
   */
  getStats: async (academicYearId = null) => {
    const params = academicYearId ? { academicYearId } : {};
    const response = await apiClient.get('/promotions/stats', { params });
    return response.data;
  },

  /**
   * Get students eligible for promotion from a class/section/year
   * @param {number} classId - Source class ID
   * @param {number} academicYearId - Source academic year ID
   * @param {number} sectionId - Optional section filter
   */
  getEligibleStudents: async (classId, academicYearId, sectionId = null) => {
    const params = { classId, academicYearId };
    if (sectionId) params.sectionId = sectionId;
    const response = await apiClient.get('/promotions/eligible', { params });
    return response.data;
  },

  /**
   * Process single student promotion
   * @param {Object} data - Promotion data
   */
  processPromotion: async (data) => {
    const response = await apiClient.post('/promotions', data);
    return response.data;
  },

  /**
   * Bulk promote multiple students
   * @param {Object} data - Bulk promotion data
   */
  bulkPromote: async (data) => {
    const response = await apiClient.post('/promotions/bulk', data);
    return response.data;
  },

  /**
   * Undo/delete a promotion record
   * @param {number} id - Promotion ID
   */
  undoPromotion: async (id) => {
    const response = await apiClient.delete(`/promotions/${id}`);
    return response.data;
  },
};

export default promotionService;
