import apiClient from "./apiClient";

export const examService = {
  // Get all exams (optional academicYearId)
  getExams: async (academicYearId) => {
    const params = academicYearId ? { academicYearId } : {};
    const response = await apiClient.get("/exams", { params });
    return response.data;
  },

  // Get single exam details
  getExam: async (id) => {
    const response = await apiClient.get(`/exams/${id}`);
    return response.data;
  },

  // Create exam
  createExam: async (data) => {
    const response = await apiClient.post("/exams", data);
    return response.data;
  },

  // Update exam details
  updateExam: async (id, data) => {
    const response = await apiClient.put(`/exams/${id}`, data);
    return response.data;
  },

  // Update exam subjects (schedule/marks)
  updateExamSubjects: async (id, subjects) => {
    const response = await apiClient.post(`/exams/${id}/subjects`, {
      subjects,
    });
    return response.data;
  },

  // Publish exam results
  publishExam: async (id) => {
    const response = await apiClient.put(`/exams/${id}/publish`);
    return response.data;
  },

  // Lock exam
  lockExam: async (id) => {
    const response = await apiClient.put(`/exams/${id}/lock`);
    return response.data;
  },

  // Unlock exam
  unlockExam: async (id) => {
    const response = await apiClient.put(`/exams/${id}/unlock`);
    return response.data;
  },

  // Delete exam
  deleteExam: async (id) => {
    const response = await apiClient.delete(`/exams/${id}`);
    return response.data;
  },

  // --- Teacher Methods ---

  // Get teacher's exams (PUBLISHED exams for assigned subjects)
  getTeacherExams: async (academicYearId) => {
    const params = academicYearId ? { academicYearId } : {};
    const response = await apiClient.get("/exam-results/teacher/exams", {
      params,
    });
    return response.data;
  },

  // Get existing results for a specific subject in an exam
  getResultsBySubject: async (examSubjectId, sectionId) => {
    const params = sectionId ? { sectionId } : {};
    const response = await apiClient.get(
      `/exam-results/exam-subjects/${examSubjectId}`,
      { params }
    );
    return response.data;
  },

  // Get students list for marks entry (if no results exist yet)
  getStudentsForMarksEntry: async (examSubjectId, sectionId) => {
    const params = { examSubjectId, sectionId };
    const response = await apiClient.get("/exam-results/students", { params });
    return response.data;
  },

  // Save/Update results
  saveResults: async (data) => {
    const response = await apiClient.post("/exam-results", data);
    return response.data;
  },

  // Get student's published exams (exams with published report cards)
  getStudentPublishedExams: async (studentId) => {
    const response = await apiClient.get(
      `/report-cards/student/${studentId}/exams`
    );
    return response.data;
  },

  // Get student's exam results (individual subject marks)
  getStudentExamResults: async (studentId, examId) => {
    const response = await apiClient.get(
      `/results/student/${studentId}/exam/${examId}`
    );
    return response.data;
  },

  // Get student's report card
  getReportCard: async (studentId, examId) => {
    const response = await apiClient.get(
      `/report-cards/student/${studentId}/exam/${examId}`
    );
    return response.data;
  },
};
