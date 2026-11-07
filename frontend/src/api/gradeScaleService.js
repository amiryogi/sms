import apiClient from "./apiClient";

/**
 * Grade scales (admin only). Other roles receive the scale a report card was
 * graded on inside the report-card payload as `gradeReference`.
 *
 * A scale body is { name, passPercent, bands: [{ min, max, grade, gpa, description, isPassing }] }.
 */
export const gradeScaleService = {
  getAll: () => apiClient.get("/grade-scales"),
  getPresets: () => apiClient.get("/grade-scales/presets"),
  create: (data) => apiClient.post("/grade-scales", data),
  update: (id, data) => apiClient.put(`/grade-scales/${id}`, data),
  setDefault: (id) => apiClient.put(`/grade-scales/${id}/default`),
  remove: (id) => apiClient.delete(`/grade-scales/${id}`),
};
