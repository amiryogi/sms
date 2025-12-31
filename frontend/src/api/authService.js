import apiClient from './apiClient';

export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    await apiClient.post('/auth/logout');
    localStorage.clear();
  },
};
