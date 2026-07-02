// src/api/menuItems.js
import apiClient from './client';

export const menuItemAPI = {
  /**
   * Get all menu items (Public - no auth required)
   */
  getAll: async (params = {}) => {
    return await apiClient.get('/menu-items', params, false);
  },

  /**
   * Get menu items by restaurant (Public - no auth required)
   */
  getByRestaurant: async (restaurantId, params = {}) => {
    return await apiClient.get(`/menu-items/restaurant/${restaurantId}`, params, false);
  },

  /**
   * Get menu item by ID (Public - no auth required)
   */
  getById: async (id) => {
    return await apiClient.get(`/menu-items/${id}`, {}, false);
  },

  /**
   * Create menu item (Auth required)
   */
  create: async (data) => {
    console.log('📤 menuItemAPI.create called with data:', JSON.stringify(data, null, 2));
    const response = await apiClient.post('/menu-items', data);
    console.log('📥 menuItemAPI.create response:', response);
    return response;
  },

  /**
   * Update menu item (Auth required)
   */
  update: async (id, data) => {
    console.log('📤 menuItemAPI.update called with data:', JSON.stringify(data, null, 2));
    return await apiClient.put(`/menu-items/${id}`, data);
  },

  /**
   * Delete menu item (Auth required)
   */
  delete: async (id) => {
    return await apiClient.delete(`/menu-items/${id}`);
  },
};