import apiClient from './apiClient';

export const programService = {
  // Get all programs with optional filters
  getPrograms: async (params = {}) => {
    const response = await apiClient.get('/programs', { params });
    return response.data;
  },

  // Get single program with details
  getProgram: async (id) => {
    const response = await apiClient.get(`/programs/${id}`);
    return response.data;
  },

  // Create new program
  createProgram: async (data) => {
    const response = await apiClient.post('/programs', data);
    return response.data;
  },

  // Update program
  updateProgram: async (id, data) => {
    const response = await apiClient.put(`/programs/${id}`, data);
    return response.data;
  },

  // Delete program
  deleteProgram: async (id) => {
    const response = await apiClient.delete(`/programs/${id}`);
    return response.data;
  },

  // Assign subjects to program
  assignSubjects: async (programId, classSubjectIds, isCompulsory = true) => {
    const response = await apiClient.put(`/programs/${programId}/subjects`, {
      classSubjectIds,
      isCompulsory
    });
    return response.data;
  },

  // Get students by program
  getStudentsByProgram: async (programId) => {
    const response = await apiClient.get(`/programs/${programId}/students`);
    return response.data;
  },

  // Assign student to program
  assignStudentToProgram: async (programId, studentClassId) => {
    const response = await apiClient.post(`/programs/${programId}/students`, {
      studentClassId
    });
    return response.data;
  },

  // Remove student from program
  removeStudentFromProgram: async (programId, studentClassId) => {
    const response = await apiClient.delete(`/programs/${programId}/students/${studentClassId}`);
    return response.data;
  },

  // Get programs for a specific class
  getProgramsByClass: async (classId, academicYearId = null) => {
    const params = academicYearId ? { academicYearId } : {};
    const response = await apiClient.get(`/programs/by-class/${classId}`, { params });
    return response.data;
  }
};
