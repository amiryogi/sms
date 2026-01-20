import apiClient from './apiClient';

/**
 * NEB (Nepal Education Board) Curriculum Service
 * API client for managing Grade 11-12 subject components
 */
export const nebService = {
  // Get NEB-eligible classes (Grade 11 and 12)
  getNEBClasses: async () => {
    const response = await apiClient.get('/subject-components/neb-classes');
    return response.data;
  },

  // Get all subject components with optional filters
  getSubjectComponents: async (params = {}) => {
    const response = await apiClient.get('/subject-components', { params });
    return response.data;
  },

  // Get a single subject component by ID
  getSubjectComponent: async (id) => {
    const response = await apiClient.get(`/subject-components/${id}`);
    return response.data;
  },

  // Get components for a specific subject in a class
  getComponentsBySubject: async (classId, subjectId) => {
    const response = await apiClient.get(
      `/subject-components/class/${classId}/subject/${subjectId}`
    );
    return response.data;
  },

  // Create a new subject component
  createSubjectComponent: async (data) => {
    const response = await apiClient.post('/subject-components', data);
    return response.data;
  },

  // Update an existing subject component
  updateSubjectComponent: async (id, data) => {
    const response = await apiClient.put(`/subject-components/${id}`, data);
    return response.data;
  },

  // Delete a subject component
  deleteSubjectComponent: async (id) => {
    const response = await apiClient.delete(`/subject-components/${id}`);
    return response.data;
  },
};
