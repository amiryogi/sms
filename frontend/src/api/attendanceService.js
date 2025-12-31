import apiClient from './apiClient';

export const attendanceService = {
  getAttendance: async (params) => {
    const response = await apiClient.get('/attendance', { params });
    return response.data;
  },
  
  markAttendance: async (data) => {
    const response = await apiClient.post('/attendance', data);
    return response.data;
  },
  
  getStudentAttendanceSummary: async (studentId) => {
    const response = await apiClient.get(`/attendance/student/${studentId}`);
    return response.data;
  },
};
