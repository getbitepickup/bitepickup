// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../api/auth";

const getRestaurantIdFromUser = (userData) => {
  if (!userData) return null;

  const { restaurantId } = userData;
  if (!restaurantId) return null;

  if (typeof restaurantId === "object") {
    return restaurantId._id || restaurantId.id || restaurantId.value || null;
  }

  if (typeof restaurantId === "string") {
    return restaurantId;
  }

  return null;
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(userData));

        // If user is a restaurant owner, store their restaurant ID
        if (userData.role === "restaurant_owner") {
          const restaurantId = getRestaurantIdFromUser(userData);
          if (restaurantId) {
            localStorage.setItem("currentRestaurantId", restaurantId);
            console.log("✅ Set restaurant ID for owner:", restaurantId);
          } else {
            localStorage.removeItem("currentRestaurantId");
          }
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      authAPI.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    if (response.success) {
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(userData));

      console.log("🔐 Login successful, user data:", userData);

      // If user is a restaurant owner, store their restaurant ID
      if (userData.role === "restaurant_owner") {
        const restaurantId = getRestaurantIdFromUser(userData);
        if (restaurantId) {
          localStorage.setItem("currentRestaurantId", restaurantId);
          console.log("✅ Set restaurant ID for owner on login:", restaurantId);
        } else {
          localStorage.removeItem("currentRestaurantId");
          console.log(
            "ℹ️ Restaurant owner login response did not include a restaurant ID",
          );
        }
      } else {
        console.log("ℹ️ User is not a restaurant owner, role:", userData.role);
      }

      return response;
    }
    throw new Error(response.message || "Login failed");
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    if (response.success) {
      const newUser = response.data.user;
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(newUser));
      return response;
    }
    throw new Error(response.message || "Registration failed");
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("currentRestaurantId");
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
