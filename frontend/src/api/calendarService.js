import apiClient from "./apiClient";

/**
 * School calendar (/api/v1/calendar). Dates go out and come back as AD
 * "YYYY-MM-DD"; the browser shows them in BS (lib/calendar).
 */
export const calendarService = {
  /** Everything dated in [from, to] that this person may see. `sources`: array of feed sources. */
  getFeed: ({ from, to, sources } = {}) =>
    apiClient.get("/calendar/feed", { params: { from, to, ...(sources?.length ? { sources: sources.join(",") } : {}) } }),
  getOverview: () => apiClient.get("/calendar/overview"),
  getMeta: () => apiClient.get("/calendar/meta"),

  getEvents: (params) => apiClient.get("/calendar/events", { params }),
  getEvent: (id) => apiClient.get(`/calendar/events/${id}`),
  createEvent: (data) => apiClient.post("/calendar/events", data),
  updateEvent: (id, data) => apiClient.put(`/calendar/events/${id}`, data),
  deleteEvent: (id) => apiClient.delete(`/calendar/events/${id}`),

  getSettings: () => apiClient.get("/calendar/settings"),
  updateSettings: (config) => apiClient.put("/calendar/settings", { config }),
  resetSettings: () => apiClient.delete("/calendar/settings"),

  /** Is this a working day (for a class)? { isWorkingDay, reason, blocksAttendance } */
  getWorkingDay: (params) => apiClient.get("/calendar/working-day", { params }),

  getHolidaySources: () => apiClient.get("/calendar/holidays/sources"),
  previewHolidayImport: (data) => apiClient.post("/calendar/holidays/import/preview", data),
  importHolidays: (data) => apiClient.post("/calendar/holidays/import", data),
};
