import apiClient from './apiClient';

export const teacherService = {
  // Teacher CRUD
  getTeachers: async (params = {}) => {
    const response = await apiClient.get('/teachers', { params });
    return response.data;
  },

  getTeacher: async (id) => {
    const response = await apiClient.get(`/teachers/${id}`);
    return response.data;
  },

  createTeacher: async (data) => {
    // Architecturally, Teachers are Users. Use the user creation endpoint.
    const response = await apiClient.post('/users', { ...data, role: 'TEACHER' });
    return response.data;
  },

  updateTeacher: async (id, data) => {
    const response = await apiClient.put(`/teachers/${id}`, data);
    return response.data;
  },

  // Teacher-Subject Assignments
  getTeacherAssignments: async (params = {}) => {
    const response = await apiClient.get('/teacher-subjects', { params });
    return response.data;
  },

  assignTeacher: async (data) => {
    const response = await apiClient.post('/teacher-subjects', data);
    return response.data;
  },

  updateAssignment: async (id, data) => {
    const response = await apiClient.put(`/teacher-subjects/${id}`, data);
    return response.data;
  },

  removeAssignment: async (id) => {
    const response = await apiClient.delete(`/teacher-subjects/${id}`);
    return response.data;
  },
};
