// src/api/categories.js
import apiClient from './client';

export const categoryAPI = {
  /**
   * Get all categories (Public - no auth required)
   */
  getAll: async (params = {}) => {
    return await apiClient.get('/categories', params, false);
  },

  /**
   * Get categories by restaurant (Public - no auth required)
   */
  getByRestaurant: async (restaurantId) => {
    return await apiClient.get(`/categories/restaurant/${restaurantId}`, {}, false);
  },

  /**
   * Get category by ID (Public - no auth required)
   */
  getById: async (id) => {
    return await apiClient.get(`/categories/${id}`, {}, false);
  },

  /**
   * Create category (Auth required)
   */
  create: async (data) => {
    return await apiClient.post('/categories', data);
  },

  /**
   * Update category (Auth required)
   */
  update: async (id, data) => {
    return await apiClient.put(`/categories/${id}`, data);
  },

  /**
   * Delete category (Auth required)
   */
  delete: async (id) => {
    return await apiClient.delete(`/categories/${id}`);
  },
};