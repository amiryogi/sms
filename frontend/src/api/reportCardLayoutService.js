import apiClient from "./apiClient";

/**
 * Report-card layout (admin only). Other roles receive the layout inside every
 * report-card payload as `layout`.
 *
 * GET returns { config, isCustom, presets, templateFields, sample }.
 */
export const reportCardLayoutService = {
  get: () => apiClient.get("/report-card-layout"),
  save: (config) => apiClient.put("/report-card-layout", { config }),
  reset: () => apiClient.delete("/report-card-layout"),
};
