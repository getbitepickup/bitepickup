// src/api/auth.js
import apiClient from './client';

export const authAPI = {
  /**
   * Register a new user (Public - no auth required)
   */
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData, false);
    if (response.success && response.data?.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response;
  },

  /**
   * Login user (Public - no auth required)
   */
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password }, false);
    if (response.success && response.data?.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response;
  },

  /**
   * Logout user
   */
  logout: () => {
    apiClient.setToken(null);
    localStorage.removeItem('user');
  },

  /**
   * Get current user (Auth required)
   */
  getCurrentUser: async () => {
    return await apiClient.get('/auth/me');
  },

  /**
   * Refresh token (Auth required)
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });
    if (response.success && response.data?.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response;
  },

  /**
   * Forgot password (Public - no auth required)
   */
  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', { email }, false);
  },

  /**
   * Reset password (Public - no auth required)
   */
  resetPassword: async (token, password) => {
    return await apiClient.post('/auth/reset-password', { token, password }, false);
  },
};