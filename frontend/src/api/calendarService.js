import apiClient from "./apiClient";

/**
 * School calendar (/api/v1/calendar). Dates go out and come back as AD
 * "YYYY-MM-DD"; the browser shows them in BS (lib/calendar).
 *
 * Like the other services, each call resolves to the response body:
 * { success, message, data } (plus `pagination` for lists).
 */
const body = (request) => request.then((response) => response.data);

export const calendarService = {
  /** Everything dated in [from, to] that this person may see. `sources`: array of feed sources. */
  getFeed: ({ from, to, sources } = {}) =>
    body(apiClient.get("/calendar/feed", { params: { from, to, ...(sources?.length ? { sources: sources.join(",") } : {}) } })),
  getOverview: () => body(apiClient.get("/calendar/overview")),
  getMeta: () => body(apiClient.get("/calendar/meta")),

  getEvents: (params) => body(apiClient.get("/calendar/events", { params })),
  getEvent: (id) => body(apiClient.get(`/calendar/events/${id}`)),
  createEvent: (data) => body(apiClient.post("/calendar/events", data)),
  updateEvent: (id, data) => body(apiClient.put(`/calendar/events/${id}`, data)),
  deleteEvent: (id) => body(apiClient.delete(`/calendar/events/${id}`)),

  getSettings: () => body(apiClient.get("/calendar/settings")),
  updateSettings: (config) => body(apiClient.put("/calendar/settings", { config })),
  resetSettings: () => body(apiClient.delete("/calendar/settings")),

  /** Is this a working day (for a class)? { isWorkingDay, reason, blocksAttendance } */
  getWorkingDay: (params) => body(apiClient.get("/calendar/working-day", { params })),

  getHolidaySources: () => body(apiClient.get("/calendar/holidays/sources")),
  previewHolidayImport: (data) => body(apiClient.post("/calendar/holidays/import/preview", data)),
  importHolidays: (data) => body(apiClient.post("/calendar/holidays/import", data)),
};
