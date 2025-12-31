import apiClient from './apiClient';

export const examService = {
  // Exams
  getExams: async (params = {}) => {
    const response = await apiClient.get('/exams', { params });
    return response.data;
  },
  
  getExam: async (id) => {
    const response = await apiClient.get(`/exams/${id}`);
    return response.data;
  },
  
  createExam: async (data) => {
    const response = await apiClient.post('/exams', data);
    return response.data;
  },
  
  updateExamSubjects: async (id, subjects) => {
    const response = await apiClient.post(`/exams/${id}/subjects`, { subjects });
    return response.data;
  },
  
  publishExam: async (id) => {
    const response = await apiClient.put(`/exams/${id}/publish`);
    return response.data;
  },
  
  deleteExam: async (id) => {
    const response = await apiClient.delete(`/exams/${id}`);
    return response.data;
  },

  // Results
  getResultsBySubject: async (examSubjectId) => {
    const response = await apiClient.get(`/results/${examSubjectId}`);
    return response.data;
  },
  
  saveResults: async (data) => {
    const response = await apiClient.post('/results', data);
    return response.data;
  },
  
  getStudentExamResults: async (studentId, examId) => {
    const response = await apiClient.get(`/results/student/${studentId}/exam/${examId}`);
    return response.data;
  },

  // Report Cards
  generateReportCards: async (data) => {
    const response = await apiClient.post('/report-cards/generate', data);
    return response.data;
  },
  
  getReportCard: async (studentId, examId) => {
    const response = await apiClient.get(`/report-cards/student/${studentId}/exam/${examId}`);
    return response.data;
  },
  
  publishReportCards: async (data) => {
    const response = await apiClient.put('/report-cards/publish', data);
    return response.data;
  },
};
