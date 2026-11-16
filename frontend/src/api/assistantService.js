import apiClient from "./apiClient";

/**
 * AI help assistant. The streaming chat lives in ./assistantStream.js (fetch: axios cannot
 * stream in the browser); everything else goes through apiClient.
 */
export const assistantService = {
  bootstrap: () => apiClient.get("/assistant/bootstrap"),
  /** Whole answer in one response; used when streaming is not available. */
  chat: (body, config) => apiClient.post("/assistant/chat", body, config),

  listConversations: (params) => apiClient.get("/assistant/conversations", { params }),
  getConversation: (id) => apiClient.get(`/assistant/conversations/${id}`),
  deleteConversation: (id) => apiClient.delete(`/assistant/conversations/${id}`),
  clearHistory: () => apiClient.delete("/assistant/conversations"),
  feedback: (messageId, value, comment) => apiClient.post(`/assistant/messages/${messageId}/feedback`, { value, comment }),

  // Administrators
  getSettings: () => apiClient.get("/assistant/admin/settings"),
  updateSettings: (settings) => apiClient.put("/assistant/admin/settings", settings),
  testProvider: (provider, model) => apiClient.post("/assistant/admin/test-provider", { provider, model }),
  getUsage: (params) => apiClient.get("/assistant/admin/usage", { params }),
};
