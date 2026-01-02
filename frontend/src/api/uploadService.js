import apiClient from "./apiClient";

export const uploadService = {
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post("/uploads/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
