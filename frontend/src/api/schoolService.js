import apiClient from "./apiClient";
import axios from "axios";

/**
 * School Settings Service
 * Handles school branding, logo, banner, and settings management
 */
export const schoolService = {
  /**
   * Get current user's school settings
   * @returns {Promise} School data
   */
  getMySchool: () => apiClient.get("/school"),

  /**
   * Update school settings (Admin only)
   * @param {Object} data - School settings to update
   * @returns {Promise} Updated school data
   */
  updateSchool: (data) => apiClient.put("/school", data),

  /**
   * Upload school logo (Admin only)
   * @param {File} file - Logo image file
   * @returns {Promise} Updated school with logo URL
   */
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiClient.post("/school/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Upload school banner (Admin only)
   * @param {File} file - Banner image file
   * @returns {Promise} Updated school with banner URL
   */
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("banner", file);
    return apiClient.post("/school/banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Get public school info by code (No auth required)
   * Used for login page branding
   * @param {string} code - School code
   * @returns {Promise} Public school branding info
   */
  getPublicSchoolByCode: (code) => {
    // Use axios directly without auth interceptor for public endpoint
    const apiUrl =
      import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
    return axios.get(`${apiUrl}/public/school/${code}`);
  },
};

export default schoolService;
