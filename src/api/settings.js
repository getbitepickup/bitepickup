// src/api/settings.js
import apiClient from './client';

export const settingsAPI = {
  /**
   * Get restaurant settings
   */
  getRestaurantSettings: async (restaurantId) => {
    return await apiClient.get(`/settings/restaurant/${restaurantId}`);
  },

  /**
   * Update restaurant settings
   */
  updateRestaurantSettings: async (restaurantId, data) => {
    return await apiClient.put(`/settings/restaurant/${restaurantId}`, data);
  },

  /**
   * Toggle ordering pause
   */
  toggleOrderingPause: async (restaurantId) => {
    return await apiClient.put(`/settings/restaurant/${restaurantId}/toggle-pause`);
  },
};