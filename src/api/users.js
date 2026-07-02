// src/api/users.js
import apiClient from "./client";

export const userAPI = {
  getAll: async (params = {}) => {
    return await apiClient.get("/users", params);
  },

  getById: async (id) => {
    return await apiClient.get(`/users/${id}`);
  },
};
