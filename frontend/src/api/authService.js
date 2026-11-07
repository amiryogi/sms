import apiClient, { clearAuthStorage } from './apiClient';

// There is deliberately no register() here: POST /auth/register is admin-only.
// Staff and students are created by an admin through /users, /students, etc.
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuthStorage();
    }
  },
};
