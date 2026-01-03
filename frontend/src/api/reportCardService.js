import apiClient from "./apiClient";

export const reportCardService = {
  /**
   * Get report cards for a class/section (Admin view)
   * @param {number} examId
   * @param {number} classId
   * @param {number} sectionId
   */
  getReportCards: async (examId, classId, sectionId) => {
    const response = await apiClient.get("/report-cards", {
      params: { examId, classId, sectionId },
    });
    return response.data;
  },

  /**
   * Generate report cards for a class/section
   * @param {number} examId
   * @param {number} classId
   * @param {number} sectionId
   */
  generateReportCards: async (examId, classId, sectionId) => {
    const response = await apiClient.post("/report-cards/generate", {
      examId,
      classId,
      sectionId,
    });
    return response.data;
  },

  /**
   * Get individual student's report card
   * @param {number} studentId
   * @param {number} examId
   */
  getReportCard: async (studentId, examId) => {
    const response = await apiClient.get(
      `/report-cards/student/${studentId}/exam/${examId}`
    );
    return response.data;
  },

  /**
   * Publish report cards for a class/section
   * @param {number} examId
   * @param {number} classId
   * @param {number} sectionId
   */
  publishReportCards: async (examId, classId, sectionId) => {
    const response = await apiClient.put("/report-cards/publish", {
      examId,
      classId,
      sectionId,
    });
    return response.data;
  },

  /**
   * Unpublish report cards for a class/section
   * @param {number} examId
   * @param {number} classId
   * @param {number} sectionId
   */
  unpublishReportCards: async (examId, classId, sectionId) => {
    const response = await apiClient.put("/report-cards/unpublish", {
      examId,
      classId,
      sectionId,
    });
    return response.data;
  },
};
