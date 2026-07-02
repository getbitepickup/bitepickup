// src/api/restaurants.js
import apiClient from './client';

export const restaurantAPI = {
  /**
   * Get all restaurants (Public - no auth required)
   */
  getAll: async (params = {}) => {
    return await apiClient.get('/restaurants', params, false);
  },

  /**
   * Get active restaurants (Public - no auth required)
   */
  getActive: async () => {
    return await apiClient.get('/restaurants/active', {}, false);
  },

  /**
   * Get restaurant by ID (Public - no auth required)
   */
  getById: async (id) => {
    return await apiClient.get(`/restaurants/${id}`, {}, false);
  },

  /**
   * Get restaurant by subdomain (Public - no auth required)
   */
  getBySubdomain: async (subdomain) => {
    return await apiClient.get(`/restaurants/by-subdomain/${subdomain}`, {}, false);
  },

  /**
   * Create restaurant with owner account (Admin only - auth required)
   */
  create: async (data) => {
    return await apiClient.post('/restaurants', data);
  },

  /**
   * Update restaurant (Admin or Owner - auth required)
   */
  update: async (id, data) => {
    return await apiClient.put(`/restaurants/${id}`, data);
  },

  /**
   * Delete restaurant (Admin only - auth required)
   */
  delete: async (id) => {
    return await apiClient.delete(`/restaurants/${id}`);
  },

  /**
   * Toggle restaurant active status (Admin or Owner - auth required)
   */
  toggleActive: async (id) => {
    return await apiClient.put(`/restaurants/${id}/toggle-active`);
  },
};