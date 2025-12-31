import apiClient from './apiClient';

export const assignmentService = {
  // Assignments
  getAssignments: async (params = {}) => {
    const response = await apiClient.get('/assignments', { params });
    return response.data;
  },
  
  getAssignment: async (id) => {
    const response = await apiClient.get(`/assignments/${id}`);
    return response.data;
  },
  
  createAssignment: async (formData) => {
    const response = await apiClient.post('/assignments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  updateAssignment: async (id, data) => {
    const response = await apiClient.put(`/assignments/${id}`, data);
    return response.data;
  },
  
  deleteAssignment: async (id) => {
    const response = await apiClient.delete(`/assignments/${id}`);
    return response.data;
  },

  // Submissions
  submitAssignment: async (formData) => {
    const response = await apiClient.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  getSubmissionsByAssignment: async (assignmentId) => {
    const response = await apiClient.get(`/submissions/assignment/${assignmentId}`);
    return response.data;
  },
  
  gradeSubmission: async (id, data) => {
    const response = await apiClient.put(`/submissions/${id}/grade`, data);
    return response.data;
  },
};
