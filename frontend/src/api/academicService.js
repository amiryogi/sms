import apiClient from './apiClient';

export const academicService = {
  // Academic Years
  getAcademicYears: async () => {
    const response = await apiClient.get('/academic-years');
    return response.data;
  },
  getCurrentAcademicYear: async () => {
    const response = await apiClient.get('/academic-years/current');
    return response.data;
  },
  createAcademicYear: async (data) => {
    const response = await apiClient.post('/academic-years', data);
    return response.data;
  },
  updateAcademicYear: async (id, data) => {
    const response = await apiClient.put(`/academic-years/${id}`, data);
    return response.data;
  },
  deleteAcademicYear: async (id) => {
    const response = await apiClient.delete(`/academic-years/${id}`);
    return response.data;
  },

  // Classes
  getClasses: async () => {
    const response = await apiClient.get('/classes');
    return response.data;
  },
  createClass: async (data) => {
    const response = await apiClient.post('/classes', data);
    return response.data;
  },
  updateClass: async (id, data) => {
    const response = await apiClient.put(`/classes/${id}`, data);
    return response.data;
  },
  deleteClass: async (id) => {
    const response = await apiClient.delete(`/classes/${id}`);
    return response.data;
  },

  // Sections
  getSections: async (classId = null) => {
    const params = classId ? { classId } : {};
    const response = await apiClient.get('/sections', { params });
    return response.data;
  },
  createSection: async (data) => {
    const response = await apiClient.post('/sections', data);
    return response.data;
  },
  updateSection: async (id, data) => {
    const response = await apiClient.put(`/sections/${id}`, data);
    return response.data;
  },
  deleteSection: async (id) => {
    const response = await apiClient.delete(`/sections/${id}`);
    return response.data;
  },

  // Subjects
  getSubjects: async () => {
    const response = await apiClient.get('/subjects');
    return response.data;
  },
  createSubject: async (data) => {
    const response = await apiClient.post('/subjects', data);
    return response.data;
  },
  updateSubject: async (id, data) => {
    const response = await apiClient.put(`/subjects/${id}`, data);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await apiClient.delete(`/subjects/${id}`);
    return response.data;
  },

  // Class Subjects (subjects assigned to a class for an academic year)
  getClassSubjects: async (params = {}) => {
    const response = await apiClient.get('/class-subjects', { params });
    return response.data;
  },
  assignSubjectToClass: async (data) => {
    const response = await apiClient.post('/class-subjects', data);
    return response.data;
  },
  updateClassSubject: async (id, data) => {
    const response = await apiClient.put(`/class-subjects/${id}`, data);
    return response.data;
  },
  removeSubjectFromClass: async (id) => {
    const response = await apiClient.delete(`/class-subjects/${id}`);
    return response.data;
  },
};
