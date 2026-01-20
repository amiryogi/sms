import apiClient from "./apiClient";

export const teacherService = {
  // Teacher CRUD
  getTeachers: async (params = {}) => {
    const response = await apiClient.get("/teachers", { params });
    return response.data;
  },

  getTeacher: async (id) => {
    const response = await apiClient.get(`/teachers/${id}`);
    return response.data;
  },

  createTeacher: async (data) => {
    // Architecturally, Teachers are Users. Use the user creation endpoint.
    // Support custom role (default to TEACHER)
    const role = data.role || "TEACHER";
    const response = await apiClient.post("/users", {
      ...data,
      role,
    });
    return response.data;
  },

  updateTeacher: async (id, data) => {
    const response = await apiClient.put(`/teachers/${id}`, data);
    return response.data;
  },

  // Get staff members (Teachers and Exam Officers)
  getStaff: async (params = {}) => {
    const response = await apiClient.get("/users", { 
      params: {
        ...params,
        // Filter by staff roles
      }
    });
    return response.data;
  },

  // =====================================================
  // TEACHER SELF-SERVICE METHODS
  // =====================================================

  /**
   * Get students for teacher's assigned classes/sections
   * Returns students grouped by Class → Section
   * @param {Object} params - Optional query params
   * @param {number} params.academicYearId - Filter by academic year (defaults to current)
   * @returns {Promise<{summary: Object, classes: Array}>}
   */
  getMyStudents: async (params = {}) => {
    const response = await apiClient.get("/teachers/my-students", { params });
    return response.data;
  },

  // =====================================================
  // TEACHER-SUBJECT ASSIGNMENTS (Admin)
  // =====================================================

  // Teacher-Subject Assignments
  getTeacherAssignments: async (params = {}) => {
    const response = await apiClient.get("/teacher-subjects", { params });
    return response.data;
  },

  assignTeacher: async (data) => {
    const response = await apiClient.post("/teacher-subjects", data);
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
