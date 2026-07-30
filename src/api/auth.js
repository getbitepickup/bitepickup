// src/api/auth.js
import apiClient from "./client";

export const authAPI = {
  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await apiClient.post(
      "/auth/login",
      { email, password },
      false,
    );

    console.log("📥 Login response:", response);

    // ✅ FIX: Save token to localStorage
    if (response.data?.token) {
      localStorage.setItem("accessToken", response.data.token);
      apiClient.setToken(response.data.token);
      console.log("✅ Token saved to localStorage from data.token");
    } else if (response.token) {
      localStorage.setItem("accessToken", response.token);
      apiClient.setToken(response.token);
      console.log("✅ Token saved to localStorage from response.token");
    } else if (response.data?.data?.token) {
      localStorage.setItem("accessToken", response.data.data.token);
      apiClient.setToken(response.data.data.token);
      console.log("✅ Token saved to localStorage from data.data.token");
    } else {
      console.warn("⚠️ No token found in login response");
      console.log("Response structure:", JSON.stringify(response, null, 2));
    }

    return response;
  },

  /**
   * Register user
   */
  register: async (userData) => {
    const response = await apiClient.post("/auth/register", userData, false);

    if (response.data?.token) {
      localStorage.setItem("accessToken", response.data.token);
      apiClient.setToken(response.data.token);
    } else if (response.token) {
      localStorage.setItem("accessToken", response.token);
      apiClient.setToken(response.token);
    }

    return response;
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    return await apiClient.get("/auth/me");
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await apiClient.post("/auth/logout", {}, true);
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      apiClient.setToken(null);
    }
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email) => {
    return await apiClient.post("/auth/forgot-password", { email }, false);
  },

  /**
   * Reset password
   */
  resetPassword: async (token, password) => {
    return await apiClient.post(
      "/auth/reset-password",
      { token, password },
      false,
    );
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Refresh token
   */
  refreshToken: async (refreshToken) => {
    return await apiClient.post("/auth/refresh-token", { refreshToken }, false);
  },
};
