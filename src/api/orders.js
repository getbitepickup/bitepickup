// src/api/orders.js
import apiClient from "./client";

export const orderAPI = {
  /**
   * Get all orders (Admin only)
   */
  getAll: async (params = {}) => {
    try {
      return await apiClient.get("/orders", params);
    } catch (error) {
      console.warn("Failed to fetch orders:", error.message);
      // Return empty response instead of throwing
      return { success: true, data: [] };
    }
  },

  /**
   * Get orders by restaurant
   */
  getByRestaurant: async (restaurantId, params = {}) => {
    try {
      return await apiClient.get(`/orders/restaurant/${restaurantId}`, params);
    } catch (error) {
      console.warn("Failed to fetch orders by restaurant:", error.message);
      return { success: true, data: [] };
    }
  },

  /**
   * Get order by ID
   */
  getById: async (id) => {
    return await apiClient.get(`/orders/${id}`);
  },

  /**
   * Track order by reference (Public - no auth required)
   */
  trackByReference: async (reference) => {
    return await apiClient.get(`/orders/track/${reference}`, {}, false);
  },

  /**
   * Create order (Public - no auth required)
   */
  create: async (data) => {
    return await apiClient.post("/orders", data, false);
  },

  /**
   * Update order status
   */
  updateStatus: async (id, status) => {
    return await apiClient.put(`/orders/${id}/status`, { status });
  },

  /**
   * Get order statistics
   */
  getStatistics: async (restaurantId) => {
    try {
      return await apiClient.get(
        `/orders/restaurant/${restaurantId}/statistics`,
      );
    } catch (error) {
      console.warn("Failed to fetch order statistics:", error.message);
      return { success: true, data: null };
    }
  },

  /**
   * ✅ Get payment status for an order
   */
  getPaymentStatus: async (orderId) => {
    try {
      return await apiClient.get(`/orders/payment/${orderId}`);
    } catch (error) {
      console.warn("Failed to fetch payment status:", error.message);
      return { success: true, data: null };
    }
  },
};
