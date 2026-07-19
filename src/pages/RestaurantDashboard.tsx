import React, { useState, useEffect, useRef } from "react";
import {
  getRestaurants,
  getCategories,
  getMenuItems,
  getOrders,
  addOrder,
  updateOrderStatus,
  addCategory,
  updateCategory,
  deleteCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateRestaurant,
  subscribeToStore,
  getCurrentRestaurantId,
  setCurrentRestaurantId,
} from "../store/apiStore";
import { userAPI } from "../api/users";
import { Restaurant, Category, MenuItem, Order, OrderItem } from "../types";
import {
  Play,
  Plus,
  Trash2,
  Edit,
  Check,
  Eye,
  X,
  FastForward,
  Sliders,
  Layers,
  Coffee,
  Phone,
  MapPin,
  Camera,
  Save,
  Info,
  AlertTriangle,
  CheckSquare,
  Clock,
  Settings,
  Settings2,
  EyeOff,
  DollarSign,
  Percent,
  Shield,
  ShoppingBag,
  Store,
  History,
  Search,
  Filter,
  Wifi,
  WifiOff,
  RefreshCw,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Upload,
  Loader2,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Audio Context - created on user interaction (outside component to persist)
let audioContext: AudioContext | null = null;

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "orders" | "pastorders" | "menu" | "categories" | "profile" | "settings"
  >("orders");

  // Database bindings
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrderCountRef = useRef<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  // Stripe Connect State
  const [stripeStatus, setStripeStatus] = useState<{
    isConnected: boolean;
    accountId?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    status?: string;
  }>({
    isConnected: false,
  });
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // ✅ Image Upload States
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Get the current restaurant from the activeRestaurantId
  const currentRestaurant =
    restaurants.find((r) => r.id === activeRestaurantId) || null;

  // ============================================
  // 🔊 AUDIO - Beep sound that works after user interaction
  // ============================================

  // Initialize AudioContext on user interaction
  const ensureAudioContext = () => {
    if (!audioContext) {
      try {
        audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        console.log("🔊 AudioContext created");
      } catch (e) {
        console.log("Web Audio not supported", e);
      }
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
      console.log("🔊 AudioContext resumed");
    }
    return audioContext;
  };

  // Play beep sound - works after user interaction
  const playWebBeep = () => {
    try {
      const context = ensureAudioContext();
      if (!context) {
        console.log("🔊 No audio context available");
        return;
      }

      const beep = (freq: number, duration: number, onset: number) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, context.currentTime + onset);
        osc.connect(gain);
        gain.connect(context.destination);
        gain.gain.setValueAtTime(0.15, context.currentTime + onset);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          context.currentTime + onset + duration,
        );
        osc.start(context.currentTime + onset);
        osc.stop(context.currentTime + onset + duration);
      };

      beep(880, 0.15, 0);
      beep(1046, 0.2, 0.18);
      console.log("🔊 Beep played!");
    } catch (e) {
      console.log("Web Audio context blocked or unsupported", e);
    }
  };

  // Initialize audio on first user click
  useEffect(() => {
    const handleFirstClick = () => {
      ensureAudioContext();
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        console.log("🔄 Loading restaurant dashboard data...");
        console.log("👤 User from auth:", user);
        console.log("🔑 Auth loading:", authLoading);

        // Get all restaurants
        const resData = await getRestaurants();
        setRestaurants(resData);
        console.log("📋 All restaurants:", resData);

        // Get restaurant ID from multiple sources:
        let restaurantId = null;

        // Check URL param first
        if (id) {
          restaurantId = id;
          console.log("📍 Restaurant ID from URL:", restaurantId);
        }

        // Check user context (if restaurant owner)
        if (!restaurantId && user && user.role === "restaurant_owner") {
          const candidate = user.restaurantId;
          if (candidate) {
            restaurantId =
              typeof candidate === "object"
                ? candidate._id || candidate.id || candidate.value || null
                : candidate;
            console.log("📍 Restaurant ID from user context:", restaurantId);
          }
        }

        // Check localStorage
        if (!restaurantId) {
          restaurantId = getCurrentRestaurantId();
          console.log("📍 Restaurant ID from localStorage:", restaurantId);
        }

        // If still no ID, try to match by slug/subdomain
        if (
          !restaurantId ||
          !resData.find(
            (r) =>
              r.id === restaurantId ||
              r.slug === restaurantId ||
              r.subdomain === restaurantId,
          )
        ) {
          const matchedRestaurant = resData.find((restaurant) => {
            if (!user || user.role !== "restaurant_owner") return false;
            const ownerRestaurantId =
              typeof user.restaurantId === "object"
                ? user.restaurantId._id ||
                  user.restaurantId.id ||
                  user.restaurantId.value ||
                  null
                : user.restaurantId;
            return (
              restaurant.id === ownerRestaurantId ||
              restaurant.slug === ownerRestaurantId ||
              restaurant.subdomain === ownerRestaurantId
            );
          });

          if (matchedRestaurant) {
            restaurantId = matchedRestaurant.id;
            console.log(
              "📍 Restaurant ID resolved from restaurant list match:",
              restaurantId,
            );
          } else {
            restaurantId = resData.length > 0 ? resData[0].id : null;
            console.log("📍 Restaurant ID fallback to first:", restaurantId);
          }
        }

        if (restaurantId) {
          setActiveRestaurantId(restaurantId);
          setCurrentRestaurantId(restaurantId);

          console.log("✅ Loading data for restaurant ID:", restaurantId);

          const foundRestaurant = resData.find((r) => r.id === restaurantId);
          if (foundRestaurant) {
            const restaurantData = {
              name: foundRestaurant.name,
              logo: foundRestaurant.logo || "",
              id: foundRestaurant.id,
              slug: foundRestaurant.slug,
              subdomain: foundRestaurant.subdomain,
            };
            localStorage.setItem(
              "currentRestaurant",
              JSON.stringify(restaurantData),
            );
            console.log(
              "✅ Restaurant data saved to localStorage:",
              restaurantData,
            );
          }

          if (user?.role === "restaurant_owner" && !user.restaurantId) {
            try {
              const ownerProfile = await userAPI.getById(user.id || user._id);
              const ownerRestaurantId = ownerProfile?.data?.restaurantId;
              if (ownerRestaurantId) {
                const resolvedId =
                  typeof ownerRestaurantId === "object"
                    ? ownerRestaurantId._id ||
                      ownerRestaurantId.id ||
                      ownerRestaurantId.value ||
                      null
                    : ownerRestaurantId;
                if (resolvedId) {
                  setCurrentRestaurantId(resolvedId);
                  setActiveRestaurantId(resolvedId);
                  restaurantId = resolvedId;
                }
              }
            } catch (ownerErr) {
              console.warn("Could not refresh owner restaurant ID:", ownerErr);
            }
          }

          // Load categories, menu items, and orders
          const catData = await getCategories(restaurantId);
          setCategories(catData);
          console.log("📂 Categories loaded:", catData.length);

          const menuData = await getMenuItems(restaurantId);
          setMenuItems(menuData);
          console.log("🍽️ Menu items loaded:", menuData.length);

          const ordersData = await getOrders({ restaurantId: restaurantId });
          setOrders(ordersData);
          console.log("📦 Orders loaded:", ordersData.length);

          // Set initial order count for polling
          lastOrderCountRef.current = ordersData.length;
          isFirstLoadRef.current = false;
        } else {
          console.warn("⚠️ No restaurant ID found!");
        }
      } catch (error) {
        console.error("❌ Failed to load restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [id, user, authLoading]);

  // ============================================
  // ✅ POLLING - Reliable order updates (works on all domains)
  // ============================================
  const startPolling = () => {
    if (!activeRestaurantId || !isAuthenticated) {
      console.log(
        "📡 Polling: Skipping - no active restaurant ID or not authenticated",
      );
      return;
    }

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    console.log("📡 Polling: Started for restaurant", activeRestaurantId);
    setIsPolling(true);
    setPollingError(null);

    // Function to check for new orders
    const checkForNewOrders = async () => {
      if (!activeRestaurantId) return;

      try {
        const freshOrders = await getOrders({
          restaurantId: activeRestaurantId,
        });
        const currentCount = freshOrders.length;

        // If we have more orders than before, there's a new one
        if (currentCount > lastOrderCountRef.current) {
          console.log("📡 Polling: New order detected!");

          // Find the new orders (the ones at the beginning since they're sorted by date)
          const newOrdersCount = currentCount - lastOrderCountRef.current;
          const newOrders = freshOrders.slice(0, newOrdersCount);

          // Add new orders to state
          setOrders((prevOrders) => {
            const existingIds = new Set(prevOrders.map((o) => o.id || o._id));
            const ordersToAdd = newOrders.filter((o) => {
              const id = o.id || o._id;
              return !existingIds.has(id);
            });

            if (ordersToAdd.length > 0) {
              console.log(
                "📡 Adding new orders via polling:",
                ordersToAdd.length,
              );
              // Play beep for new orders
              ordersToAdd.forEach(() => {
                console.log("🔊 Playing beep for new order");
                playWebBeep();
              });

              // Show notification for first new order
              const firstOrder = ordersToAdd[0];
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("🆕 New Order Received!", {
                  body: `Order from ${firstOrder.customerName} - $${firstOrder.totalPrice?.toFixed(2) || "0.00"}`,
                  icon: "/hinarok-app-icon.png",
                });
              }

              return [...ordersToAdd, ...prevOrders];
            }
            return prevOrders;
          });

          // Update last count
          lastOrderCountRef.current = currentCount;
        }
      } catch (error) {
        // Silent fail - don't spam console
        console.log("📡 Polling: Error checking orders");
      }
    };

    // Check immediately after a small delay
    setTimeout(() => {
      checkForNewOrders();
    }, 500);

    // Then check every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkForNewOrders();
    }, 5000);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    console.log("📡 Manual refresh triggered");
    if (activeRestaurantId) {
      getOrders({ restaurantId: activeRestaurantId })
        .then((freshOrders) => {
          setOrders(freshOrders);
          lastOrderCountRef.current = freshOrders.length;
          playWebBeep();
          console.log("📡 Manual refresh complete");
        })
        .catch((err) => {
          console.error("Manual refresh error:", err);
        });
    }
  };

  // Initialize polling
  useEffect(() => {
    console.log("📡 Polling useEffect triggered with:", {
      activeRestaurantId,
      isAuthenticated,
      isPolling,
    });

    const timer = setTimeout(() => {
      if (activeRestaurantId && isAuthenticated) {
        startPolling();
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, [activeRestaurantId, isAuthenticated]);

  // ============================================
  // STRIPE CONNECT FUNCTIONS - FIXED
  // ============================================

  const handleConnectStripe = async () => {
    if (!currentRestaurant || !currentRestaurant.id) {
      alert("Restaurant information is missing");
      return;
    }

    // ✅ FIX 1: Use 'accessToken' instead of 'token'
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Please login first");
      return;
    }

    try {
      setIsCheckingStripe(true);
      setStripeError(null);

      // ✅ FIX 2: Clean the API URL to avoid double /api/
      const API_URL =
        import.meta.env.VITE_API_URL ||
        "https://bitepickup-backend.onrender.com";
      const cleanApiUrl = API_URL.replace(/\/+$/, "");
      // If the URL already ends with /api, use it as is, otherwise add /api
      const baseUrl = cleanApiUrl.endsWith("/api")
        ? cleanApiUrl
        : `${cleanApiUrl}/api`;

      const response = await fetch(
        `${baseUrl}/stripe/connect/${currentRestaurant.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success && data.data.oauthLink) {
        // Redirect to Stripe OAuth
        window.location.href = data.data.oauthLink;
      } else if (data.data && data.data.isConnected) {
        alert("✅ Stripe is already connected!");
        await checkStripeStatus();
      } else {
        setStripeError(
          data.message || "Failed to generate Stripe connect link",
        );
      }
    } catch (error) {
      console.error("Connect Stripe error:", error);
      setStripeError("Failed to connect Stripe. Please try again.");
    } finally {
      setIsCheckingStripe(false);
    }
  };

  const checkStripeStatus = async () => {
    if (!currentRestaurant || !currentRestaurant.id) return;

    // ✅ FIX 1: Use 'accessToken' instead of 'token'
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      setIsCheckingStripe(true);

      // ✅ FIX 2: Clean the API URL to avoid double /api/
      const API_URL =
        import.meta.env.VITE_API_URL ||
        "https://bitepickup-backend.onrender.com";
      const cleanApiUrl = API_URL.replace(/\/+$/, "");
      const baseUrl = cleanApiUrl.endsWith("/api")
        ? cleanApiUrl
        : `${cleanApiUrl}/api`;

      const response = await fetch(
        `${baseUrl}/stripe/status/${currentRestaurant.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setStripeStatus({
          isConnected: data.data.isConnected,
          accountId: data.data.accountId,
          chargesEnabled: data.data.chargesEnabled,
          payoutsEnabled: data.data.payoutsEnabled,
          detailsSubmitted: data.data.detailsSubmitted,
          status: data.data.status,
        });
      }
    } catch (error) {
      console.error("Check Stripe status error:", error);
    } finally {
      setIsCheckingStripe(false);
    }
  };

  // Check stripe status on load
  useEffect(() => {
    if (currentRestaurant && currentRestaurant.id) {
      // Check URL params for Stripe callback
      const params = new URLSearchParams(window.location.search);
      const stripeStatusParam = params.get("stripe");

      if (stripeStatusParam === "connected") {
        alert("✅ Stripe account connected successfully!");
        // Remove the query param
        window.history.replaceState({}, "", window.location.pathname);
      } else if (stripeStatusParam === "error") {
        const errorMsg =
          params.get("message") || "Failed to connect Stripe account";
        setStripeError(errorMsg);
        window.history.replaceState({}, "", window.location.pathname);
      }

      checkStripeStatus();
    }
  }, [currentRestaurant?.id]);

  // ============================================
  // ✅ IMAGE UPLOAD FUNCTIONS
  // ============================================

  const handleImageUpload = async (
    file: File,
    endpoint: string,
    onSuccess: (url: string) => void,
    onError: (error: string) => void,
  ) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      onError("Please login first");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      onError("Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError("File is too large. Maximum size is 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const API_URL =
        import.meta.env.VITE_API_URL ||
        "https://bitepickup-backend.onrender.com";
      const cleanApiUrl = API_URL.replace(/\/+$/, "");
      const baseUrl = cleanApiUrl.endsWith("/api")
        ? cleanApiUrl
        : `${cleanApiUrl}/api`;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data.url);
        return data.data.url;
      } else {
        onError(data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      onError("Failed to upload image. Please try again.");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRestaurant) return;

    setUploadingLogo(true);
    setUploadError(null);

    await handleImageUpload(
      file,
      `/upload/restaurant/${currentRestaurant.id}/logo`,
      (url) => {
        setProfileForm((prev) => ({ ...prev, logo: url }));
        // Update restaurant in state
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === currentRestaurant.id ? { ...r, logo: url } : r,
          ),
        );
        // Update localStorage
        const stored = localStorage.getItem("currentRestaurant");
        if (stored) {
          const data = JSON.parse(stored);
          data.logo = url;
          localStorage.setItem("currentRestaurant", JSON.stringify(data));
        }
        alert(
          "✅ Logo uploaded successfully! Save your profile to apply changes.",
        );
      },
      (error) => {
        setUploadError(error);
        alert(`❌ Upload failed: ${error}`);
      },
    );

    setUploadingLogo(false);
    e.target.value = ""; // Reset input
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRestaurant) return;

    setUploadingCover(true);
    setUploadError(null);

    await handleImageUpload(
      file,
      `/upload/restaurant/${currentRestaurant.id}/cover`,
      (url) => {
        setProfileForm((prev) => ({ ...prev, coverImage: url }));
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === currentRestaurant.id ? { ...r, coverImage: url } : r,
          ),
        );
        alert(
          "✅ Cover image uploaded successfully! Save your profile to apply changes.",
        );
      },
      (error) => {
        setUploadError(error);
        alert(`❌ Upload failed: ${error}`);
      },
    );

    setUploadingCover(false);
    e.target.value = "";
  };

  // ✅ FIXED: Menu item image upload - only works for existing items
  // ✅ FIXED: Menu item image upload - only works when editing existing items
  const {
    uploadRestaurantLogo,
    uploadRestaurantCover,
    uploadMenuItemImage,
    deleteUploadedImage,
  } = require("../services/uploadService");
  const Restaurant = require("../models/Restaurant");
  const MenuItem = require("../models/MenuItem");
  const {
    HTTP_STATUS,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
  } = require("../utils/constants");
  const logger = require("../utils/logger");

  /**
   * Convert buffer to base64 for Cloudinary upload
   */
  const bufferToBase64 = (buffer) => {
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  };

  /**
   * @desc    Upload restaurant logo
   * @route   POST /api/upload/restaurant/:restaurantId/logo
   * @access  Admin or Restaurant Owner
   */
  exports.uploadRestaurantLogo = async (req, res) => {
    try {
      const { restaurantId } = req.params;

      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "No image file provided",
        });
      }

      // Check if restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
        });
      }

      // Convert buffer to base64
      const base64Image = bufferToBase64(req.file.buffer);

      // Upload to Cloudinary
      const result = await uploadRestaurantLogo(base64Image, restaurantId);

      // Update restaurant with new logo URL
      restaurant.logo = result.url;
      await restaurant.save();

      logger.info(`✅ Restaurant logo updated: ${restaurantId}`);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Restaurant logo uploaded successfully",
        data: {
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      logger.error(`❌ Upload restaurant logo error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to upload restaurant logo",
      });
    }
  };

  /**
   * @desc    Upload restaurant cover image
   * @route   POST /api/upload/restaurant/:restaurantId/cover
   * @access  Admin or Restaurant Owner
   */
  exports.uploadRestaurantCover = async (req, res) => {
    try {
      const { restaurantId } = req.params;

      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "No image file provided",
        });
      }

      // Check if restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
        });
      }

      // Convert buffer to base64
      const base64Image = bufferToBase64(req.file.buffer);

      // Upload to Cloudinary
      const result = await uploadRestaurantCover(base64Image, restaurantId);

      // Update restaurant with new cover URL
      restaurant.coverImage = result.url;
      await restaurant.save();

      logger.info(`✅ Restaurant cover updated: ${restaurantId}`);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Restaurant cover image uploaded successfully",
        data: {
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      logger.error(`❌ Upload restaurant cover error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to upload restaurant cover",
      });
    }
  };

  /**
   * @desc    Upload menu item image
   * @route   POST /api/upload/menu-item/:menuItemId
   * @access  Admin or Restaurant Owner
   */
  exports.uploadMenuItemImage = async (req, res) => {
    try {
      const { menuItemId } = req.params;

      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "No image file provided",
        });
      }

      // Check if menu item exists
      const menuItem = await MenuItem.findById(menuItemId);
      if (!menuItem) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND("Menu item"),
        });
      }

      // ✅ FIX: Ensure restaurantId exists on the menu item
      if (!menuItem.restaurantId) {
        logger.error(`❌ Menu item ${menuItemId} has no restaurantId`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message:
            "Restaurant ID is required. Please ensure the menu item has a restaurant associated.",
        });
      }

      // Convert buffer to base64
      const base64Image = bufferToBase64(req.file.buffer);

      // Upload to Cloudinary
      const result = await uploadMenuItemImage(
        base64Image,
        menuItem.restaurantId.toString(),
        menuItemId,
      );

      // Update menu item with new image URL
      menuItem.image = result.url;
      await menuItem.save();

      logger.info(`✅ Menu item image updated: ${menuItemId}`);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Menu item image uploaded successfully",
        data: {
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      logger.error(`❌ Upload menu item image error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to upload menu item image",
      });
    }
  };

  /**
   * @desc    Delete uploaded image
   * @route   DELETE /api/upload/:publicId
   * @access  Admin or Restaurant Owner
   */
  exports.deleteImage = async (req, res) => {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Public ID is required",
        });
      }

      const result = await deleteUploadedImage(publicId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Image deleted successfully",
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Delete image error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to delete image",
      });
    }
  };

  // Active restaurant orders
  const activeRestaurantOrders = orders.filter(
    (o) =>
      o.restaurantId === currentRestaurant?.id ||
      o.restaurantId === currentRestaurant?._id,
  );

  // Stats calculation
  const newOrders = activeRestaurantOrders.filter((o) => o.status === "NEW");
  const preparingOrders = activeRestaurantOrders.filter(
    (o) => o.status === "PREPARING",
  );
  const readyOrders = activeRestaurantOrders.filter(
    (o) => o.status === "READY",
  );
  const completedOrders = activeRestaurantOrders.filter(
    (o) => o.status === "COMPLETED",
  );

  // Filtered completed orders for search
  const filteredCompletedOrders = completedOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      order.customerName?.toLowerCase().includes(query) ||
      order.id?.toLowerCase().includes(query) ||
      order.orderReference?.toLowerCase().includes(query)
    );
  });

  // Categories & Menu Items administration forms
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNameInput, setCatNameInput] = useState("");

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    categoryId: "",
    description: "",
    price: "",
    image: "",
    isAvailable: true,
    availability: "available" as "available" | "out_of_stock" | "hidden",
  });

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    description: "",
    phone: "",
    address: "",
    logo: "",
    coverImage: "",
  });

  // Restaurant settings custom forms
  const [isOrderingPaused, setIsOrderingPaused] = useState(false);
  const [businessHours, setBusinessHours] = useState({
    Monday: { isOpen: true, openTime: "09:00 AM", closeTime: "10:00 PM" },
    Tuesday: { isOpen: true, openTime: "09:00 AM", closeTime: "10:00 PM" },
    Wednesday: { isOpen: true, openTime: "09:00 AM", closeTime: "10:00 PM" },
    Thursday: { isOpen: true, openTime: "09:00 AM", closeTime: "10:00 PM" },
    Friday: { isOpen: true, openTime: "09:00 AM", closeTime: "11:00 PM" },
    Saturday: { isOpen: true, openTime: "10:00 AM", closeTime: "11:00 PM" },
    Sunday: { isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM" },
  });

  const [pickupSettings, setPickupSettings] = useState({
    allowAsap: true,
    allowScheduled: true,
    prepTimeMinutes: 15,
  });

  const [taxesAndFees, setTaxesAndFees] = useState({
    taxRatePercent: 8.5,
    serviceFeeAmount: 2.5,
  });

  // ✅ Receipt Print State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (currentRestaurant) {
      setProfileForm({
        description: currentRestaurant.description,
        phone: currentRestaurant.phone,
        address: currentRestaurant.address,
        logo: currentRestaurant.logo,
        coverImage: currentRestaurant.coverImage,
      });

      setIsOrderingPaused(currentRestaurant.isOrderingPaused || false);

      if (currentRestaurant.businessHours) {
        setBusinessHours(currentRestaurant.businessHours);
      }

      if (currentRestaurant.pickupSettings) {
        setPickupSettings(currentRestaurant.pickupSettings);
      }

      if (currentRestaurant.taxesAndFees) {
        setTaxesAndFees(currentRestaurant.taxesAndFees);
      }
    }
  }, [currentRestaurant?.id]);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-[#C42348]/20 text-[#C42348] border-[#C42348]/30";
      case "PREPARING":
        return "bg-[#E8A13B]/20 text-[#E8A13B] border-[#E8A13B]/30";
      case "READY":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "COMPLETED":
        return "bg-[#33101F]/20 text-[#33101F] border-[#33101F]/30";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "NEW":
        return "New";
      case "PREPARING":
        return "Preparing";
      case "READY":
        return "Ready";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  // ✅ Receipt Print Handler
  const handlePrintReceipt = (order: Order) => {
    setReceiptOrder(order);
    setShowReceiptModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant) return;

    try {
      await updateRestaurant(currentRestaurant.id, {
        ...currentRestaurant,
        isOrderingPaused,
        businessHours,
        pickupSettings,
        taxesAndFees,
      });
      alert("Restaurant settings updated successfully!");
    } catch (error) {
      console.error("Failed to update settings:", error);
      alert("Failed to update settings. Please try again.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant) return;

    try {
      await updateRestaurant(currentRestaurant.id, {
        ...currentRestaurant,
        description: profileForm.description,
        phone: profileForm.phone,
        address: profileForm.address,
        logo: profileForm.logo,
        coverImage: profileForm.coverImage,
      });
      alert("Restaurant branding profile updated successfully!");

      const resData = await getRestaurants();
      setRestaurants(resData);

      const updatedRestaurant = resData.find(
        (r) => r.id === currentRestaurant.id,
      );
      if (updatedRestaurant) {
        const restaurantData = {
          name: updatedRestaurant.name,
          logo: updatedRestaurant.logo || "",
          id: updatedRestaurant.id,
          slug: updatedRestaurant.slug,
          subdomain: updatedRestaurant.subdomain,
        };
        localStorage.setItem(
          "currentRestaurant",
          JSON.stringify(restaurantData),
        );
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  // CATEGORY HANDLING
  const handleOpenAddCat = () => {
    setEditingCatId(null);
    setCatNameInput("");
    setShowCatModal(true);
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatNameInput(cat.name);
    setShowCatModal(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim() || !currentRestaurant) return;

    try {
      let result;
      if (editingCatId) {
        result = await updateCategory(editingCatId, {
          name: catNameInput.trim(),
        });
        console.log("✅ Category updated:", result);
      } else {
        result = await addCategory({
          restaurantId: currentRestaurant.id,
          name: catNameInput.trim(),
        });
        console.log("✅ Category created:", result);
      }

      const catData = await getCategories(currentRestaurant.id);
      setCategories(catData);
      setShowCatModal(false);
      setCatNameInput("");
      alert("✅ Category saved successfully!");
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category. Please try again.");
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (
      window.confirm(
        "Delete this category? ALL associated menu items inside this category will also be deleted.",
      )
    ) {
      try {
        await deleteCategory(id);
        const catData = await getCategories(currentRestaurant?.id || "");
        setCategories(catData);
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert("Failed to delete category. Please try again.");
      }
    }
  };

  // MENU ITEMS HANDLING
  const handleOpenAddItem = () => {
    setEditingItemId(null);
    const storeCats = categories.filter(
      (c) => c.restaurantId === currentRestaurant?.id,
    );
    setItemForm({
      name: "",
      categoryId: storeCats[0]?.id || "",
      description: "",
      price: "",
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
      isAvailable: true,
      availability: "available",
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
      isAvailable: item.isAvailable,
      availability:
        item.availability || (item.isAvailable ? "available" : "out_of_stock"),
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔍 handleSaveItem called with form data:", itemForm);

    if (!itemForm.name.trim()) {
      alert("Please enter a dish name");
      return;
    }

    if (!itemForm.price || itemForm.price === "") {
      alert("Please enter a price");
      return;
    }

    const priceNum = parseFloat(itemForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid price");
      return;
    }

    if (!itemForm.categoryId) {
      alert("Please select a category");
      return;
    }

    if (!currentRestaurant) {
      alert("No restaurant selected");
      return;
    }

    const dataPayload = {
      restaurantId: currentRestaurant.id,
      categoryId: itemForm.categoryId,
      name: itemForm.name.trim(),
      description: itemForm.description ? itemForm.description.trim() : "",
      price: priceNum,
      image:
        itemForm.image && itemForm.image.trim()
          ? itemForm.image.trim()
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
      availability: itemForm.availability || "available",
      isAvailable: itemForm.availability !== "hidden",
    };

    console.log("📤 Sending payload:", JSON.stringify(dataPayload, null, 2));

    try {
      let result;
      if (editingItemId) {
        console.log("📝 Updating menu item:", editingItemId);
        result = await updateMenuItem(editingItemId, dataPayload);
      } else {
        console.log("📝 Creating new menu item");
        result = await addMenuItem(dataPayload);
      }

      console.log("✅ Success:", result);

      const menuData = await getMenuItems(currentRestaurant.id);
      setMenuItems(menuData);
      setShowItemModal(false);

      const firstCategory = storeCategories[0]?.id || "";
      setItemForm({
        name: "",
        categoryId: firstCategory,
        description: "",
        price: "",
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
        isAvailable: true,
        availability: "available",
      });

      alert("✅ Menu item saved successfully!");
    } catch (error: any) {
      console.error("❌ Failed to save menu item:", error);
      alert(error.message || "Failed to save menu item. Please try again.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Delete this dish item?")) {
      try {
        await deleteMenuItem(id);
        const menuData = await getMenuItems(currentRestaurant?.id || "");
        setMenuItems(menuData);
      } catch (error) {
        console.error("Failed to delete menu item:", error);
        alert("Failed to delete menu item. Please try again.");
      }
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C42348]"></div>
      </div>
    );
  }

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] text-[#33101F] flex items-center justify-center p-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-[#C42348] mx-auto mb-3" />
          <h2 className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
            No Restaurant Found
          </h2>
          <p className="text-[#8C6B76] text-xs mt-1 max-w-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
            {user?.role === "restaurant_owner"
              ? "You do not have a restaurant assigned to your account. Please contact the platform administrator."
              : "Please select a restaurant from the admin panel first."}
          </p>
          {user?.role === "admin" ? (
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 bg-[#C42348] hover:bg-[#E84C6B] text-white px-6 py-2 rounded-lg font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]"
            >
              Go to Admin Panel
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="mt-4 bg-[#C42348] hover:bg-[#E84C6B] text-white px-6 py-2 rounded-lg font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]"
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const storeCategories = categories.filter(
    (c) => c.restaurantId === currentRestaurant.id,
  );
  const storeItems = menuItems.filter(
    (i) => i.restaurantId === currentRestaurant.id,
  );

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif] pb-16">
      {/* Dynamic Sub-header Context Banner */}
      <div className="bg-white border-b border-[#E7C7CF] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FAF3EA] border border-[#E7C7CF] overflow-hidden flex-shrink-0">
            <img
              referrerPolicy="no-referrer"
              src={currentRestaurant.logo}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] tracking-tight">
                {currentRestaurant.name} Dashboard
              </h2>
              <span
                className={`h-2.5 w-2.5 rounded-full ${currentRestaurant.isActive ? "bg-emerald-500" : "bg-[#C42348]"}`}
                title={
                  currentRestaurant.isActive ? "Active Store" : "Inactive Store"
                }
              ></span>
              {/* Polling Status Indicator */}
              <div className="flex items-center gap-1">
                <span
                  className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    isPolling
                      ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                      : "bg-[#E8A13B]/20 text-[#E8A13B] border-[#E8A13B]/30 animate-pulse"
                  }`}
                >
                  {isPolling ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      LIVE
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      CONNECTING
                    </>
                  )}
                </span>
                <button
                  onClick={handleManualRefresh}
                  className="text-[8px] bg-[#C42348] hover:bg-[#E84C6B] text-white px-2 py-0.5 rounded-full transition-colors"
                  title="Refresh orders manually"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
              Manage order feeds, categories, menu pricing, and graphics layout.
              {isPolling
                ? " ✅ Auto-refresh every 5 seconds"
                : " ⏳ Starting..."}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex border-b border-[#E7C7CF] overflow-x-auto">
          {[
            {
              id: "orders",
              label: "Order Pipeline",
              badge: activeRestaurantOrders.filter(
                (o) => o.status !== "COMPLETED",
              ).length,
            },
            {
              id: "pastorders",
              label: "Past Orders",
              badge: completedOrders.length,
            },
            { id: "menu", label: "Menu List" },
            { id: "categories", label: "Categories" },
            { id: "profile", label: "Store Profile" },
            { id: "settings", label: "Restaurant Settings" },
          ].map((tab) => (
            <button
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap font-['Inter','Segoe UI',system-ui,sans-serif] ${
                activeTab === tab.id
                  ? "border-[#C42348] text-[#C42348]"
                  : "border-transparent text-[#8C6B76] hover:text-[#33101F]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-[#FAF3EA] text-[#C42348] text-[10px] py-0.5 px-2 rounded-full border border-[#E7C7CF]">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <AnimatePresence mode="wait">
          {/* SECTION A: ORDERS PIPELINE SECTION */}
          {activeTab === "orders" && (
            <motion.div
              key="orders-pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Quick statistics widgets strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Unread / New",
                    count: newOrders.length,
                    color:
                      "border-l-4 border-[#C42348] bg-[#C42348]/10 text-[#C42348]",
                  },
                  {
                    label: "Cooking",
                    count: preparingOrders.length,
                    color:
                      "border-l-4 border-[#E8A13B] bg-[#E8A13B]/10 text-[#E8A13B]",
                  },
                  {
                    label: "Awaiting Pickup",
                    count: readyOrders.length,
                    color:
                      "border-l-4 border-emerald-500 bg-emerald-500/10 text-emerald-500",
                  },
                  {
                    label: "Total Historical Orders",
                    count: activeRestaurantOrders.length,
                    color:
                      "border-l-4 border-[#E7C7CF] bg-white/40 text-[#8C6B76]",
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border border-[#E7C7CF] ${stat.color}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      {stat.label}
                    </div>
                    <div className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold mt-1">
                      {stat.count}
                    </div>
                  </div>
                ))}
              </div>

              {/* Kitchen Pipeline Board */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUMN 1: NEW INCOMING ORDERS */}
                <div className="bg-white/50 rounded-2xl border border-[#E7C7CF] p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7C7CF] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C42348] animate-pulse"></span>
                      <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                        NEW INCOMING FEED
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-[#C42348]/10 text-[#C42348] px-2 py-0.5 rounded-md border border-[#C42348]/20 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      {newOrders.length} ticket
                      {newOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {newOrders.length === 0 ? (
                      <div className="text-center py-16 text-[#8C6B76]">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                          No pending unread orders.
                        </p>
                      </div>
                    ) : (
                      newOrders.map((order) => (
                        <div
                          id={`order-card-${order.id}`}
                          key={order.id}
                          className="bg-white border-2 border-[#C42348] rounded-xl p-4 space-y-4 shadow-lg"
                        >
                          <div className="flex justify-between items-start border-b border-[#E7C7CF] pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-[#C42348]">
                                {order.id || order._id}
                              </span>
                              <h4 className="font-sans text-xs text-[#8C6B76] font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-[#8C6B76]">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id || item._id}
                                className="flex justify-between text-[#33101F]"
                              >
                                <span className="font-bold text-[#33101F]">
                                  {item.quantity}x{" "}
                                  <span className="font-normal text-[#8C6B76]">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-[#E7C7CF] pt-2 flex justify-between font-extrabold text-[#33101F]">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* ✅ FIX: Special Instructions Display */}
                          {order.specialInstructions && (
                            <div className="p-2 bg-[#C42348]/10 border border-[#C42348]/20 text-[#C42348] text-[10px] rounded-lg">
                              <span className="block font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-[#FAF3EA] rounded-lg text-[#8C6B76] border border-[#E7C7CF]">
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Timing Type:
                              </span>
                              <span className="text-[#C42348] font-bold">
                                {order.pickupTimeOption === "ASAP"
                                  ? "ASAP"
                                  : order.scheduledTime}
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Payment:
                              </span>
                              <span className="capitalize">
                                {order.paymentMethod === "online"
                                  ? "Credit Paid"
                                  : "Cash at Desk"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              id={`accept-order-btn-${order.id}`}
                              onClick={async () => {
                                await updateOrderStatus(order.id, "PREPARING");
                                playWebBeep();
                                const ordersData = await getOrders(
                                  currentRestaurant.id,
                                );
                                setOrders(ordersData);
                                lastOrderCountRef.current = ordersData.length;
                              }}
                              className="flex-1 bg-[#E8A13B] hover:bg-[#F0B84D] text-[#33101F] text-xs font-extrabold py-2 rounded-lg transition-colors cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                            >
                              Accept & Prepare
                            </button>
                            {/* ✅ Print Receipt Button for New Orders */}
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] p-2 rounded-lg border border-[#E7C7CF] transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: ACTIVE PREPARING ORDERS */}
                <div className="bg-white/50 rounded-2xl border border-[#E7C7CF] p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7C7CF] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E8A13B] animate-pulse"></span>
                      <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                        PREPARING IN KITCHEN
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-[#E8A13B]/10 text-[#E8A13B] px-2 py-0.5 rounded-md border border-[#E8A13B]/20 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      {preparingOrders.length} ticket
                      {preparingOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {preparingOrders.length === 0 ? (
                      <div className="text-center py-16 text-[#8C6B76]">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                          No orders cooking presently.
                        </p>
                      </div>
                    ) : (
                      preparingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border-2 border-[#E8A13B] rounded-xl p-4 space-y-4 shadow-lg"
                        >
                          <div className="flex justify-between items-start border-b border-[#E7C7CF] pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-[#E8A13B]">
                                {order.id || order._id}
                              </span>
                              <h4 className="font-sans text-xs text-[#8C6B76] font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-[#8C6B76]">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id || item._id}
                                className="flex justify-between text-[#33101F]"
                              >
                                <span className="font-bold text-[#33101F]">
                                  {item.quantity}x{" "}
                                  <span className="font-normal text-[#8C6B76]">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-[#E7C7CF] pt-2 flex justify-between font-extrabold text-[#33101F]">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* ✅ FIX: Special Instructions Display */}
                          {order.specialInstructions && (
                            <div className="p-2 bg-[#E8A13B]/10 border border-[#E8A13B]/20 text-[#E8A13B] text-[10px] rounded-lg">
                              <span className="block font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-[#FAF3EA] rounded-lg text-[#8C6B76] border border-[#E7C7CF]">
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Timing Type:
                              </span>
                              <span className="text-[#E8A13B] font-bold">
                                {order.pickupTimeOption === "ASAP"
                                  ? "ASAP"
                                  : order.scheduledTime}
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Phone:
                              </span>
                              <span className="font-mono">
                                {order.customerPhone}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              id={`mark-ready-btn-${order.id}`}
                              onClick={async () => {
                                await updateOrderStatus(order.id, "READY");
                                playWebBeep();
                                const ordersData = await getOrders(
                                  currentRestaurant.id,
                                );
                                setOrders(ordersData);
                                lastOrderCountRef.current = ordersData.length;
                              }}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold py-2 rounded-lg transition-colors cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                            >
                              Ready for Pickup
                            </button>
                            {/* ✅ Print Receipt Button for Preparing Orders */}
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] p-2 rounded-lg border border-[#E7C7CF] transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 3: READY ORDERS */}
                <div className="bg-white/50 rounded-2xl border border-[#E7C7CF] p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7C7CF] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                        AWAITING CORNER PICKUP
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md border border-emerald-500/20 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      {readyOrders.length} ticket
                      {readyOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {readyOrders.length === 0 ? (
                      <div className="text-center py-16 text-[#8C6B76]">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                          No orders pending pick-up.
                        </p>
                      </div>
                    ) : (
                      readyOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border-2 border-emerald-500 rounded-xl p-4 space-y-4 shadow-lg animate-pulse"
                        >
                          <div className="flex justify-between items-start border-b border-[#E7C7CF] pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-emerald-500">
                                {order.id || order._id}
                              </span>
                              <h4 className="font-sans text-xs text-[#8C6B76] font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-[#8C6B76]">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id || item._id}
                                className="flex justify-between text-[#33101F]"
                              >
                                <span className="font-bold text-[#33101F]">
                                  {item.quantity}x{" "}
                                  <span className="font-normal text-[#8C6B76]">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-[#E7C7CF] pt-2 flex justify-between font-extrabold text-[#33101F]">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* ✅ FIX: Special Instructions Display */}
                          {order.specialInstructions && (
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-[10px] rounded-lg">
                              <span className="block font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-[#FAF3EA] rounded-lg text-[#8C6B76] border border-[#E7C7CF]">
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Ready Status:
                              </span>
                              <span className="text-emerald-500 font-bold">
                                READY TO HANDOFF
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Phone:
                              </span>
                              <span className="font-mono">
                                {order.customerPhone}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              id={`complete-order-btn-${order.id}`}
                              onClick={async () => {
                                await updateOrderStatus(order.id, "COMPLETED");
                                playWebBeep();
                                const ordersData = await getOrders(
                                  currentRestaurant.id,
                                );
                                setOrders(ordersData);
                                lastOrderCountRef.current = ordersData.length;
                              }}
                              className="flex-1 bg-[#FAF3EA] border border-[#E7C7CF] hover:bg-[#E7C7CF] text-[#33101F] text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                            >
                              Arrived & Completed
                            </button>
                            {/* ✅ Print Receipt Button for Ready Orders */}
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] p-2 rounded-lg border border-[#E7C7CF] transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION A2: PAST ORDERS (COMPLETED ORDERS) */}
          {activeTab === "pastorders" && (
            <motion.div
              key="past-orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/50 rounded-xl border border-[#E7C7CF] p-4">
                  <div className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Total Completed Orders
                  </div>
                  <div className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                    {completedOrders.length}
                  </div>
                </div>
                <div className="bg-white/50 rounded-xl border border-[#E7C7CF] p-4">
                  <div className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Total Revenue
                  </div>
                  <div className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-emerald-500">
                    $
                    {completedOrders
                      .reduce((sum, o) => sum + (o.totalPrice || 0), 0)
                      .toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/50 rounded-xl border border-[#E7C7CF] p-4">
                  <div className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Average Order Value
                  </div>
                  <div className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#E8A13B]">
                    $
                    {completedOrders.length > 0
                      ? (
                          completedOrders.reduce(
                            (sum, o) => sum + (o.totalPrice || 0),
                            0,
                          ) / completedOrders.length
                        ).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6B76]" />
                  <input
                    type="text"
                    placeholder="Search past orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#E7C7CF] rounded-xl text-sm text-[#33101F] focus:outline-none focus:border-[#C42348] placeholder-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                </div>
                <span className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                  {filteredCompletedOrders.length} orders found
                </span>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-2xl border border-[#E7C7CF] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <thead className="bg-[#FAF3EA] text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] border-b border-[#E7C7CF]">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Items</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7C7CF]/60">
                      {filteredCompletedOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-12 text-[#8C6B76]"
                          >
                            {searchQuery
                              ? "No past orders matching your search."
                              : "No completed orders yet."}
                          </td>
                        </tr>
                      ) : (
                        filteredCompletedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-[#FAF3EA]/40">
                            <td className="px-6 py-4 font-mono text-[11px] font-semibold text-[#C42348]">
                              #{order.orderReference || order.id?.slice(-6)}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-[#33101F]">
                                  {order.customerName}
                                </div>
                                <div className="text-[10px] text-[#8C6B76]">
                                  {order.customerPhone}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                {order.items
                                  ?.slice(0, 2)
                                  .map((item: any, idx: number) => (
                                    <div key={idx} className="text-[#8C6B76]">
                                      {item.quantity}x {item.name}
                                    </div>
                                  ))}
                                {order.items?.length > 2 && (
                                  <div className="text-[#8C6B76] text-[10px]">
                                    +{order.items.length - 2} more items
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-[#33101F]">
                              ${order.totalPrice?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                                  order.status,
                                )}`}
                              >
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#8C6B76]">
                              {new Date(
                                order.createdAt || order.timestamp,
                              ).toLocaleDateString()}
                              <br />
                              <span className="text-[10px] text-[#8C6B76]">
                                {new Date(
                                  order.createdAt || order.timestamp,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handlePrintReceipt(order)}
                                className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] p-1.5 rounded-lg border border-[#E7C7CF] transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION B: MENU LIST MANAGEMENT */}
          {activeTab === "menu" && (
            <motion.div
              key="menu-management"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E7C7CF]">
                <div>
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                    Dishes and Menu Items
                  </h3>
                  <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Total catalog dishes configured: {storeItems.length} items
                  </p>
                </div>
                <button
                  id="add-dish-btn"
                  onClick={handleOpenAddItem}
                  className="bg-[#C42348] hover:bg-[#E84C6B] text-white px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Dish</span>
                </button>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeItems.map((item) => {
                  const catName =
                    storeCategories.find((c) => c.id === item.categoryId)
                      ?.name || "Unassigned";
                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E7C7CF] rounded-2xl overflow-hidden shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-40 bg-[#FAF3EA] relative">
                          <img
                            referrerPolicy="no-referrer"
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#C42348] px-2 py-0.5 rounded-full border border-[#E7C7CF] font-['Inter','Segoe UI',system-ui,sans-serif]">
                              {catName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-['Inter','Segoe UI',system-ui,sans-serif] ${
                                (item.availability || "available") ===
                                "out_of_stock"
                                  ? "bg-[#E8A13B]/20 text-[#E8A13B] border-[#E8A13B]/30"
                                  : (item.availability || "available") ===
                                      "hidden"
                                    ? "bg-[#C42348]/20 text-[#C42348] border-[#C42348]/30"
                                    : "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                              }`}
                            >
                              {(item.availability || "available") ===
                              "out_of_stock"
                                ? "Out of Stock"
                                : (item.availability || "available") ===
                                    "hidden"
                                  ? "Hidden"
                                  : "Available"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm leading-tight">
                              {item.name}
                            </h4>
                            <span className="text-[#C42348] font-extrabold font-mono text-sm">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-[#8C6B76] line-clamp-2 leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#E7C7CF] p-3 bg-white/40 flex justify-between gap-2">
                        <div className="flex-1 flex gap-1 justify-between bg-[#FAF3EA] p-1 rounded-xl border border-[#E7C7CF]">
                          {[
                            {
                              value: "available",
                              label: "In Stock",
                              bgActive:
                                "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            },
                            {
                              value: "out_of_stock",
                              label: "Out",
                              bgActive:
                                "bg-[#E8A13B]/10 text-[#E8A13B] border-[#E8A13B]/20",
                            },
                            {
                              value: "hidden",
                              label: "Hide",
                              bgActive:
                                "bg-[#C42348]/10 text-[#C42348] border-[#C42348]/20",
                            },
                          ].map((state) => {
                            const isSelected =
                              (item.availability || "available") ===
                              state.value;
                            return (
                              <button
                                key={state.value}
                                onClick={async () => {
                                  await updateMenuItem(item.id, {
                                    ...item,
                                    availability: state.value as any,
                                    isAvailable: state.value === "available",
                                  });
                                  const menuData = await getMenuItems(
                                    currentRestaurant.id,
                                  );
                                  setMenuItems(menuData);
                                }}
                                className={`flex-1 text-[9px] font-bold py-1 px-1.5 rounded-lg border transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif] ${
                                  isSelected
                                    ? `${state.bgActive} border-opacity-100 font-extrabold shadow-sm`
                                    : "border-transparent text-[#8C6B76] hover:text-[#33101F]"
                                }`}
                              >
                                {state.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            id={`edit-item-${item.id}`}
                            onClick={() => handleOpenEditItem(item)}
                            className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] p-2 rounded-lg border border-[#E7C7CF] cursor-pointer"
                            title="Edit specifications"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-item-${item.id}`}
                            onClick={() => handleDeleteItem(item.id)}
                            className="bg-[#FAF3EA] hover:bg-[#C42348]/10 hover:text-[#C42348] hover:border-[#C42348]/30 text-[#8C6B76] p-2 rounded-lg border border-[#E7C7CF] cursor-pointer"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {storeItems.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-[#E7C7CF]">
                    <Coffee className="w-12 h-12 text-[#8C6B76] mx-auto mb-3 stroke-1" />
                    <p className="text-[#8C6B76] text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                      No food items added to the catalog feed.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SECTION C: CATEGORY LIST MANAGEMENT */}
          {activeTab === "categories" && (
            <motion.div
              key="categories-management"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E7C7CF]">
                <div>
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                    Menu Food Categories
                  </h3>
                  <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Setup specific groupings (e.g. "Wood-Fired Pizza", "Soft
                    Beverages").
                  </p>
                </div>
                <button
                  id="add-category-btn"
                  onClick={handleOpenAddCat}
                  className="bg-[#C42348] hover:bg-[#E84C6B] text-white px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </button>
              </div>

              {/* Categories list table */}
              <div className="bg-white rounded-2xl border border-[#E7C7CF] overflow-hidden">
                <table className="w-full text-left text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                  <thead className="bg-[#FAF3EA] text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] border-b border-[#E7C7CF]">
                    <tr>
                      <th className="px-6 py-4">Category Handle ID</th>
                      <th className="px-6 py-4">Title Heading Name</th>
                      <th className="px-6 py-4">Dishes Nested</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7C7CF]/80">
                    {storeCategories.map((cat) => {
                      const dishesCount = storeItems.filter(
                        (i) => i.categoryId === cat.id,
                      ).length;
                      return (
                        <tr key={cat.id} className="hover:bg-[#FAF3EA]/40">
                          <td className="px-6 py-4 font-mono text-[#8C6B76]">
                            {cat.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#33101F] font-['Baloo_2','Trebuchet_MS',sans-serif]">
                            {cat.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-[#FAF3EA] text-[#8C6B76] px-2.5 py-1 rounded-md border border-[#E7C7CF] text-[10px] font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
                              {dishesCount} nested recipes
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2.5">
                            <button
                              id={`edit-cat-${cat.id}`}
                              onClick={() => handleOpenEditCat(cat)}
                              className="text-[#C42348] hover:text-[#E84C6B] font-semibold flex items-center gap-1 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <span className="text-[#E7C7CF]">|</span>
                            <button
                              id={`delete-cat-${cat.id}`}
                              onClick={() => handleDeleteCat(cat.id)}
                              className="text-[#8C6B76] hover:text-[#C42348] font-semibold flex items-center gap-1 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {storeCategories.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-12 text-[#8C6B76] italic font-['Inter','Segoe UI',system-ui,sans-serif]"
                        >
                          No categories structured. Create one to begin layout.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* SECTION D: BRAND PROFILE MANAGEMENTS */}
          {activeTab === "profile" && (
            <motion.div
              key="profile-branding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6"
              >
                <div>
                  <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                    Store Profile & Digital Identity
                  </h3>
                  <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Configure layout, cover banners, and contact coordinates for
                    the customer storefront.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Store Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentRestaurant.name}
                      className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] rounded-xl text-xs text-[#8C6B76] cursor-not-allowed focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                    <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Name can only be configured by Platform Owner admins.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Store URL
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentRestaurant.subdomain}
                      className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] rounded-xl text-xs text-[#8C6B76] cursor-not-allowed focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Store Description
                    </label>
                    <textarea
                      id="profile-desc-textarea"
                      value={profileForm.description}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                      placeholder="Chef-crafted specialty foods..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Store Phone
                      </label>
                      <input
                        id="profile-phone-input"
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Store Address
                      </label>
                      <input
                        id="profile-address-input"
                        type="text"
                        value={profileForm.address}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Logo
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="profile-logo-input"
                          type="text"
                          value={profileForm.logo}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              logo: e.target.value,
                            }))
                          }
                          className="flex-1 px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                          placeholder="https://example.com/logo.png"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                          <div
                            className={`bg-[#C42348] hover:bg-[#E84C6B] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${uploadingLogo ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Upload</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Upload a logo or enter a URL. Max 5MB (JPG, PNG, GIF,
                        WEBP).
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Cover Image
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="profile-cover-input"
                          type="text"
                          value={profileForm.coverImage}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              coverImage: e.target.value,
                            }))
                          }
                          className="flex-1 px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                          placeholder="https://example.com/cover.jpg"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            className="hidden"
                            disabled={uploadingCover}
                          />
                          <div
                            className={`bg-[#C42348] hover:bg-[#E84C6B] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${uploadingCover ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {uploadingCover ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Upload</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Upload a cover image or enter a URL. Max 5MB (JPG, PNG,
                        GIF, WEBP).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E7C7CF]">
                  <button
                    id="save-profile-btn"
                    type="submit"
                    className="bg-[#C42348] hover:bg-[#E84C6B] active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Branding Profile</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION E: RESTAURANT SPECIFIC SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="restaurant-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* ✅ FIX 3: Stripe Connect card moved OUTSIDE the form */}
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* 1. Pause Ordering Settings Card */}
                <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-[#C42348]" />
                        <span>Interactive Ordering Status</span>
                      </h3>
                      <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Temporarily pause incoming tickets during busy rush
                        hours or seasonal holidays.
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      {isOrderingPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8A13B]/10 text-[#E8A13B] border border-[#E8A13B]/20 animate-pulse font-['Inter','Segoe UI',system-ui,sans-serif]">
                          <span className="w-2 h-2 rounded-full bg-[#E8A13B] animate-ping"></span>
                          Ordering Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-['Inter','Segoe UI',system-ui,sans-serif]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Accepting Orders
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#FAF3EA] border border-[#E7C7CF] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Pause Ordering Instantly
                      </span>
                      <span className="block text-[11px] text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Toggle to prevent checkout and warn visitors
                        immediately.
                      </span>
                    </div>
                    <button
                      type="button"
                      id="toggle-pause-ordering-btn"
                      onClick={() => setIsOrderingPaused(!isOrderingPaused)}
                      className={`w-14 h-8 rounded-full transition-all relative p-1 cursor-pointer focus:outline-none ${isOrderingPaused ? "bg-[#E8A13B]" : "bg-[#E7C7CF]"}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md transition-all transform ${isOrderingPaused ? "translate-x-6" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Business Hours Setup Card - ✅ FIXED with full time picker */}
                <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#C42348]" />
                      <span>Weekly Store Business Hours</span>
                    </h3>
                    <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Set custom daily schedules. Closed days will be clearly
                      communicated on the storefront menu.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {(
                      [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ] as const
                    ).map((day) => {
                      const dayHours = businessHours[day] || {
                        isOpen: true,
                        openTime: "09:00 AM",
                        closeTime: "10:00 PM",
                      };
                      return (
                        <div
                          key={day}
                          className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 bg-[#FAF3EA]/40 hover:bg-[#FAF3EA] p-3.5 rounded-xl border border-[#E7C7CF]/60 transition-all text-xs"
                        >
                          <div className="sm:col-span-4 flex items-center justify-between">
                            <span className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-xs min-w-[80px]">
                              {day}
                            </span>
                            <button
                              type="button"
                              id={`toggle-${day.toLowerCase()}`}
                              onClick={() => {
                                setBusinessHours((prev) => ({
                                  ...prev,
                                  [day]: {
                                    ...dayHours,
                                    isOpen: !dayHours.isOpen,
                                  },
                                }));
                              }}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif] ${
                                dayHours.isOpen
                                  ? "bg-[#C42348]/10 text-[#C42348] border-[#C42348]/20 hover:bg-[#C42348]/20"
                                  : "bg-[#FAF3EA] text-[#8C6B76] border-[#E7C7CF] hover:bg-[#E7C7CF]"
                              }`}
                            >
                              {dayHours.isOpen ? "Open Day" : "Closed"}
                            </button>
                          </div>

                          <div className="sm:col-span-8 flex items-center gap-3">
                            {dayHours.isOpen ? (
                              <>
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase font-bold text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                                    Opens at
                                  </label>
                                  {/* ✅ FIX: Full time picker with all hours */}
                                  <select
                                    value={dayHours.openTime}
                                    onChange={(e) => {
                                      setBusinessHours((prev) => ({
                                        ...prev,
                                        [day]: {
                                          ...dayHours,
                                          openTime: e.target.value,
                                        },
                                      }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-[#FAF3EA] border border-[#E7C7CF] text-[#33101F] rounded-lg text-xs focus:outline-none focus:border-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif]"
                                  >
                                    {[
                                      "12:00 AM",
                                      "01:00 AM",
                                      "02:00 AM",
                                      "03:00 AM",
                                      "04:00 AM",
                                      "05:00 AM",
                                      "06:00 AM",
                                      "07:00 AM",
                                      "08:00 AM",
                                      "09:00 AM",
                                      "10:00 AM",
                                      "11:00 AM",
                                      "12:00 PM",
                                      "01:00 PM",
                                      "02:00 PM",
                                      "03:00 PM",
                                      "04:00 PM",
                                      "05:00 PM",
                                      "06:00 PM",
                                      "07:00 PM",
                                      "08:00 PM",
                                      "09:00 PM",
                                      "10:00 PM",
                                      "11:00 PM",
                                    ].map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <span className="text-[#8C6B76] mt-4 font-bold">
                                  to
                                </span>
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase font-bold text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                                    Closes at
                                  </label>
                                  {/* ✅ FIX: Full time picker with all hours */}
                                  <select
                                    value={dayHours.closeTime}
                                    onChange={(e) => {
                                      setBusinessHours((prev) => ({
                                        ...prev,
                                        [day]: {
                                          ...dayHours,
                                          closeTime: e.target.value,
                                        },
                                      }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-[#FAF3EA] border border-[#E7C7CF] text-[#33101F] rounded-lg text-xs focus:outline-none focus:border-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif]"
                                  >
                                    {[
                                      "12:00 AM",
                                      "01:00 AM",
                                      "02:00 AM",
                                      "03:00 AM",
                                      "04:00 AM",
                                      "05:00 AM",
                                      "06:00 AM",
                                      "07:00 AM",
                                      "08:00 AM",
                                      "09:00 AM",
                                      "10:00 AM",
                                      "11:00 AM",
                                      "12:00 PM",
                                      "01:00 PM",
                                      "02:00 PM",
                                      "03:00 PM",
                                      "04:00 PM",
                                      "05:00 PM",
                                      "06:00 PM",
                                      "07:00 PM",
                                      "08:00 PM",
                                      "09:00 PM",
                                      "10:00 PM",
                                      "11:00 PM",
                                    ].map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 bg-[#FAF3EA] text-center py-2 text-[#8C6B76] font-medium italic rounded-lg border border-[#E7C7CF] font-['Inter','Segoe UI',system-ui,sans-serif]">
                                Store is locked or deactivated on this day.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pickup Settings Card */}
                <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-500" />
                      <span>Pickup Strategy Coordinations</span>
                    </h3>
                    <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Configure pickup logistics, advanced scheduling
                      restrictions, and kitchen dispatch times.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FAF3EA] p-4 border border-[#E7C7CF] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
                          ASAP Ordering Option
                        </span>
                        <input
                          type="checkbox"
                          id="prep-test-asap"
                          checked={pickupSettings.allowAsap}
                          onChange={(e) =>
                            setPickupSettings((prev) => ({
                              ...prev,
                              allowAsap: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-[#C42348] accent-[#C42348] cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-[#8C6B76] leading-normal font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Show ASAP estimate and recommend pickups at earliest
                        convenience.
                      </p>
                    </div>

                    <div className="bg-[#FAF3EA] p-4 border border-[#E7C7CF] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
                          Advanced Scheduled Bookings
                        </span>
                        <input
                          type="checkbox"
                          id="prep-test-scheduled"
                          checked={pickupSettings.allowScheduled}
                          onChange={(e) =>
                            setPickupSettings((prev) => ({
                              ...prev,
                              allowScheduled: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-[#C42348] accent-[#C42348] cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-[#8C6B76] leading-normal font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Allow customers to pick exact schedules on future hours
                        of open days.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF3EA] p-4 border border-[#E7C7CF] rounded-xl">
                    <label className="block text-xs font-bold text-[#33101F] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Average Cooking/Preparation Time
                    </label>
                    <select
                      id="prep-time-selector"
                      value={pickupSettings.prepTimeMinutes}
                      onChange={(e) =>
                        setPickupSettings((prev) => ({
                          ...prev,
                          prepTimeMinutes: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-[#33101F] text-xs font-['Inter','Segoe UI',system-ui,sans-serif]"
                    >
                      <option value={15}>
                        ⚡ ASAP Express Estimate (15 min)
                      </option>
                      <option value={30}>⏳ Normal standard (30 min)</option>
                      <option value={45}>
                        🍲 High complexity cooking (45 min)
                      </option>
                      <option value={60}>
                        🍗 Elaborate slow roasted recipes (60 min)
                      </option>
                    </select>
                    <p className="text-[10px] text-[#8C6B76] mt-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Used to render precise estimated availability on the
                      customer success ticket receipt.
                    </p>
                  </div>
                </div>

                {/* 4. Taxes & Fees Card */}
                <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-[#C42348]" />
                      <span>SaaS Platform Taxes & Flat Fees</span>
                    </h3>
                    <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Set state business taxation and platform flat processing
                      fee percentages.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        State/Local Sales Tax (%)
                      </label>
                      <input
                        type="number"
                        id="setting-tax-percent"
                        step="0.1"
                        value={taxesAndFees.taxRatePercent}
                        onChange={(e) =>
                          setTaxesAndFees((prev) => ({
                            ...prev,
                            taxRatePercent: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Flat Web Service Fee ($)
                      </label>
                      <input
                        type="number"
                        id="setting-service-fee"
                        step="0.01"
                        value={taxesAndFees.serviceFeeAmount}
                        onChange={(e) =>
                          setTaxesAndFees((prev) => ({
                            ...prev,
                            serviceFeeAmount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E7C7CF]">
                  <button
                    id="save-restaurant-settings-btn"
                    type="submit"
                    className="bg-[#C42348] hover:bg-[#E84C6B] active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md font-['Inter','Segoe UI',system-ui,sans-serif]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save All Restaurant Settings</span>
                  </button>
                </div>
              </form>

              {/* ✅ FIX 3: STRIPE CONNECT CARD - MOVED OUTSIDE THE FORM */}
              <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#C42348]" />
                    <span>Stripe Payment Connect</span>
                  </h3>
                  <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Connect your Stripe account to receive online payments
                    directly from customers. No platform fees or commissions —
                    you receive the full amount.
                  </p>
                </div>

                <div className="bg-[#FAF3EA] rounded-xl p-4 border border-[#E7C7CF]">
                  {/* Status Display */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${stripeStatus.isConnected ? "bg-emerald-500" : "bg-[#8C6B76]"}`}
                      ></div>
                      <span className="font-semibold text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                        {isCheckingStripe ? (
                          <span className="text-[#8C6B76]">
                            Checking status...
                          </span>
                        ) : stripeStatus.isConnected ? (
                          <span className="text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Connected
                          </span>
                        ) : stripeStatus.status === "onboarding" ? (
                          <span className="text-[#E8A13B] flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" /> Onboarding in
                            progress
                          </span>
                        ) : (
                          <span className="text-[#8C6B76]">Not connected</span>
                        )}
                      </span>
                    </div>

                    {stripeStatus.isConnected && stripeStatus.accountId && (
                      <span className="text-[10px] font-mono text-[#8C6B76] bg-white px-2 py-1 rounded border border-[#E7C7CF]">
                        ID: {stripeStatus.accountId.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {/* Status Details */}
                  {stripeStatus.isConnected && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#8C6B76]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${stripeStatus.chargesEnabled ? "bg-emerald-500" : "bg-[#C42348]"}`}
                        ></span>
                        Charges:{" "}
                        {stripeStatus.chargesEnabled
                          ? "✅ Enabled"
                          : "⏳ Pending"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${stripeStatus.payoutsEnabled ? "bg-emerald-500" : "bg-[#C42348]"}`}
                        ></span>
                        Payouts:{" "}
                        {stripeStatus.payoutsEnabled
                          ? "✅ Enabled"
                          : "⏳ Pending"}
                      </div>
                    </div>
                  )}

                  {stripeError && (
                    <div className="mt-3 bg-[#C42348]/10 border border-[#C42348]/20 text-[#C42348] p-3 rounded-xl text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                      ⚠️ {stripeError}
                    </div>
                  )}

                  {/* Info Messages */}
                  {!stripeStatus.isConnected &&
                    stripeStatus.status !== "onboarding" && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-xl text-[10px] text-blue-700 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        <p className="font-semibold">💡 Why connect Stripe?</p>
                        <ul className="mt-1 space-y-0.5 list-disc list-inside">
                          <li>
                            Receive online payments directly to your bank
                            account
                          </li>
                          <li>Zero platform fees — you keep 100%</li>
                          <li>Secure payment processing for your customers</li>
                        </ul>
                      </div>
                    )}

                  {stripeStatus.isConnected &&
                    stripeStatus.detailsSubmitted === false && (
                      <div className="mt-3 bg-[#E8A13B]/10 border border-[#E8A13B]/20 text-[#E8A13B] p-3 rounded-xl text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                        ⚠️ Please complete your Stripe account setup by
                        submitting your business details.
                        <button
                          onClick={() =>
                            window.open(
                              "https://dashboard.stripe.com/account",
                              "_blank",
                            )
                          }
                          className="block mt-1 text-[#C42348] font-semibold hover:underline flex items-center gap-1"
                        >
                          Complete setup on Stripe{" "}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!stripeStatus.isConnected ? (
                      <button
                        onClick={handleConnectStripe}
                        disabled={isCheckingStripe}
                        className={`bg-[#C42348] hover:bg-[#E84C6B] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif] ${
                          isCheckingStripe
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        {isCheckingStripe
                          ? "Connecting..."
                          : "Connect Stripe Account"}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            window.open(
                              "https://dashboard.stripe.com",
                              "_blank",
                            )
                          }
                          className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#33101F] px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Go to Stripe Dashboard
                        </button>
                        <button
                          onClick={checkStripeStatus}
                          disabled={isCheckingStripe}
                          className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] px-4 py-2.5 rounded-xl text-xs font-bold transition-all font-['Inter','Segoe UI',system-ui,sans-serif]"
                        >
                          Refresh Status
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#8C6B76] mt-3 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    🔒 Your payment data is secure. Stripe handles all payment
                    processing and compliance.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ✅ RECEIPT MODAL */}
      {showReceiptModal && receiptOrder && (
        <div className="fixed inset-0 z-50 bg-[#33101F]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-[#E7C7CF] pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                    {currentRestaurant?.name || "Restaurant"}
                  </h2>
                  <p className="text-[10px] text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    {currentRestaurant?.address || ""}
                  </p>
                  <p className="text-[10px] text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    {currentRestaurant?.phone || ""}
                  </p>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-[#8C6B76] hover:text-[#33101F] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Content */}
              <div className="space-y-4" id="receipt-content">
                <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                  <span className="text-[#8C6B76]">Order #</span>
                  <span className="font-bold text-[#33101F]">
                    {receiptOrder.orderReference || receiptOrder.id?.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                  <span className="text-[#8C6B76]">Customer</span>
                  <span className="font-bold text-[#33101F]">
                    {receiptOrder.customerName}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                  <span className="text-[#8C6B76]">Pickup Time</span>
                  <span className="font-bold text-[#33101F]">
                    {receiptOrder.pickupTimeOption === "ASAP"
                      ? "ASAP"
                      : receiptOrder.scheduledTime || "ASAP"}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                  <span className="text-[#8C6B76]">Payment</span>
                  <span className="font-bold text-[#33101F] capitalize">
                    {receiptOrder.paymentMethod === "online"
                      ? "Card (Paid)"
                      : "Cash at Pickup"}
                  </span>
                </div>

                <div className="border-t border-[#E7C7CF] my-2"></div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Items
                  </div>
                  {receiptOrder.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-bold text-[#33101F]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E7C7CF] my-2"></div>

                {/* Totals */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <span className="text-[#8C6B76]">Subtotal</span>
                    <span>
                      ${receiptOrder.totalPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  {receiptOrder.taxAmount && receiptOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span className="text-[#8C6B76]">Tax</span>
                      <span>${receiptOrder.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {receiptOrder.serviceFee && receiptOrder.serviceFee > 0 && (
                    <div className="flex justify-between text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span className="text-[#8C6B76]">Service Fee</span>
                      <span>${receiptOrder.serviceFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#33101F] pt-1 border-t border-[#E7C7CF] font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    <span>Total</span>
                    <span>
                      ${receiptOrder.totalPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                {/* ✅ FIX: Special Instructions on Receipt */}
                {receiptOrder.specialInstructions && (
                  <div className="mt-2 p-2 bg-[#FAF3EA] rounded-lg border border-[#E7C7CF]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Special Instructions
                    </div>
                    <p className="text-xs text-[#33101F] mt-0.5">
                      {receiptOrder.specialInstructions}
                    </p>
                  </div>
                )}

                <div className="text-center text-[10px] text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif] border-t border-[#E7C7CF] pt-4 mt-4">
                  <p>Thank you for your order!</p>
                  <p className="mt-0.5">{new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-[#E7C7CF]">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-[#C42348] hover:bg-[#E84C6B] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] px-4 py-2.5 rounded-xl text-xs font-bold transition-colors font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY DIALOG MODAL LAYOUT */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-[#33101F]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7C7CF] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#FAF3EA] p-4 border-b border-[#E7C7CF] flex justify-between items-center text-sm font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
              <span>
                {editingCatId ? "Edit Food Category" : "Create Food Category"}
              </span>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-[#8C6B76] hover:text-[#33101F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCat} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Category Name
                </label>
                <input
                  id="cat-name-modal-input"
                  type="text"
                  required
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="e.g. Handmade Tacos"
                  className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl text-xs text-[#33101F] focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] text-xs px-4 py-2 rounded-lg cursor-pointer font-medium font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Cancel
                </button>
                <button
                  id="save-cat-modal-btn"
                  type="submit"
                  className="bg-[#C42348] hover:bg-[#E84C6B] text-white text-xs px-4 py-2 rounded-lg cursor-pointer font-bold font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM DIALOG MODAL LAYOUT */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-[#33101F]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7C7CF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FAF3EA] p-4 border-b border-[#E7C7CF] flex justify-between items-center text-sm font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
              <span>
                {editingItemId ? "Edit Catalog Dish" : "Add Catalog Dish"}
              </span>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-[#8C6B76] hover:text-[#33101F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Dish Name
                  </label>
                  <input
                    id="item-name-modal-input"
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Classic cheeseburger"
                    className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Price ($)
                  </label>
                  <input
                    id="item-price-modal-input"
                    type="number"
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="e.g. 14.50"
                    className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-mono font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Category
                  </label>
                  <select
                    id="item-cat-modal-select"
                    value={itemForm.categoryId}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]"
                  >
                    {storeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                    {storeCategories.length === 0 && (
                      <option value="">No categories constructed</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Description
                </label>
                <textarea
                  id="item-desc-modal-textarea"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Double beef patty cheddar pickles signature sauce..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="item-image-modal-input"
                    type="text"
                    value={itemForm.image}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        image: e.target.value,
                      }))
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMenuItemImageUpload}
                      className="hidden"
                      disabled={uploadingItemImage}
                    />
                    <div
                      className={`bg-[#C42348] hover:bg-[#E84C6B] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap ${uploadingItemImage ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {uploadingItemImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Upload an image or enter a URL. Max 5MB (JPG, PNG, GIF, WEBP).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Availability Status
                </label>
                <select
                  id="item-availability-modal-select"
                  value={itemForm.availability}
                  onChange={(e) =>
                    setItemForm((prev) => ({
                      ...prev,
                      availability: e.target.value as any,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF3EA] border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  <option value="available">🟢 Available (On Menu)</option>
                  <option value="out_of_stock">
                    🟡 Out of Stock (Disabled but visible)
                  </option>
                  <option value="hidden">🔴 Hidden (Removed entirely)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[#E7C7CF]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#8C6B76] text-xs px-4 py-2 rounded-lg cursor-pointer font-medium font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Cancel
                </button>
                <button
                  id="save-item-modal-btn"
                  type="submit"
                  className="bg-[#C42348] hover:bg-[#E84C6B] text-white text-xs px-4 py-2 rounded-lg cursor-pointer font-bold font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
