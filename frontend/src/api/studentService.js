import apiClient from './apiClient';

export const studentService = {
  getStudents: async (params = {}) => {
    const response = await apiClient.get('/students', { params });
    return response.data;
  },
  
  getStudent: async (id) => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },
  // Alias for better readability/compatibility
  getStudentById: async (id) => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },
  
  createStudent: async (data) => {
    const response = await apiClient.post('/students', data);
    return response.data;
  },
  
  updateStudent: async (id, data) => {
    const response = await apiClient.put(`/students/${id}`, data);
    return response.data;
  },
  
  enrollStudent: async (id, enrollmentData) => {
    const response = await apiClient.post(`/students/${id}/enroll`, enrollmentData);
    return response.data;
  },
};
