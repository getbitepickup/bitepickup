// src/store/apiStore.ts
import { restaurantAPI } from "../api/restaurants";
import { categoryAPI } from "../api/categories";
import { menuItemAPI } from "../api/menuItems";
import { orderAPI } from "../api/orders";
import { settingsAPI } from "../api/settings";
import { Restaurant, Category, MenuItem, Order } from "../types";

const toIdString = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      (record._id as string) ||
      (record.id as string) ||
      (record.value as string) ||
      ""
    );
  }
  return String(value);
};

const normalizeRestaurant = (restaurant: any): Restaurant => ({
  ...restaurant,
  id: toIdString(restaurant?.id || restaurant?._id),
  slug: restaurant?.slug || "",
  subdomain: restaurant?.subdomain || "",
  description: restaurant?.description || "",
  coverImage: restaurant?.coverImage || "",
  logo: restaurant?.logo || "",
  phone: restaurant?.phone || "",
  address: restaurant?.address || "",
  isActive: Boolean(restaurant?.isActive),
  isOrderingPaused: Boolean(restaurant?.isOrderingPaused),
  businessHours: restaurant?.businessHours,
  pickupSettings: restaurant?.pickupSettings,
  taxesAndFees: restaurant?.taxesAndFees || {
    taxRatePercent: 8.5,
    serviceFeeAmount: 0, // ✅ FIX: Default to 0
  },
  stripeConnect: restaurant?.stripeConnect || {
    accountId: null,
    accountStatus: "pending",
    connectedAt: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  },
});

const normalizeCategory = (category: any): Category => ({
  ...category,
  id: toIdString(category?.id || category?._id),
  restaurantId: toIdString(category?.restaurantId),
  name: category?.name || "",
});

const normalizeMenuItem = (item: any): MenuItem => ({
  ...item,
  id: toIdString(item?.id || item?._id),
  restaurantId: toIdString(item?.restaurantId),
  categoryId: toIdString(item?.categoryId),
  name: item?.name || "",
  description: item?.description || "",
  price: Number(item?.price) || 0,
  image: item?.image || "",
  isAvailable: Boolean(item?.isAvailable),
  availability: item?.availability,
});

const normalizeOrder = (order: any): Order => ({
  ...order,
  id: toIdString(order?.id || order?._id),
  restaurantId: toIdString(order?.restaurantId),
  restaurantName: order?.restaurantName || "",
  customerName: order?.customerName || "",
  customerPhone: order?.customerPhone || "",
  customerEmail: order?.customerEmail || "",
  items: Array.isArray(order?.items) ? order.items : [],
  totalPrice: Number(order?.totalPrice) || 0,
  pickupTimeOption: order?.pickupTimeOption || "ASAP",
  scheduledTime: order?.scheduledTime,
  paymentMethod: order?.paymentMethod || "pickup",
  status: order?.status || "NEW",
  timestamp: order?.timestamp || new Date().toISOString(),
  specialInstructions: order?.specialInstructions || "",
  taxAmount: order?.taxAmount || 0,
  serviceFee: order?.serviceFee || 0, // ✅ FIX: Ensure serviceFee defaults to 0
  finalTotal: order?.finalTotal || 0,
  orderReference: order?.orderReference || "",
  // ✅ Stripe Payment Fields
  paymentStatus: order?.paymentStatus || "pending",
  stripePaymentIntentId: order?.stripePaymentIntentId,
  stripePaymentStatus: order?.stripePaymentStatus,
  stripeClientSecret: order?.stripeClientSecret,
  stripeAccountId: order?.stripeAccountId,
  paymentAmount: order?.paymentAmount,
  paymentCurrency: order?.paymentCurrency,
});

// ============ RESTAURANTS ============
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await restaurantAPI.getAll();
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeRestaurant) : [];
  } catch (error) {
    console.error("Failed to fetch restaurants:", error);
    return [];
  }
};

export const getActiveRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await restaurantAPI.getActive();
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeRestaurant) : [];
  } catch (error) {
    console.error("Failed to fetch active restaurants:", error);
    return [];
  }
};

export const getRestaurantById = async (
  id: string,
): Promise<Restaurant | null> => {
  try {
    const response = await restaurantAPI.getById(id);
    return response.data ? normalizeRestaurant(response.data) : null;
  } catch (error) {
    console.error("Failed to fetch restaurant:", error);
    return null;
  }
};

export const getRestaurantBySubdomain = async (
  subdomain: string,
): Promise<Restaurant | null> => {
  try {
    const response = await restaurantAPI.getBySubdomain(subdomain);
    return response.data ? normalizeRestaurant(response.data) : null;
  } catch (error) {
    console.error("Failed to fetch restaurant by subdomain:", error);
    return null;
  }
};

export const addRestaurant = async (data: any): Promise<any> => {
  try {
    const response = await restaurantAPI.create(data);
    return response.data || response;
  } catch (error: any) {
    console.error("Failed to create restaurant:", error);
    // Extract the actual error message from the response
    let errorMessage = "Failed to create restaurant";

    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Preserve the original error message
    const customError = new Error(errorMessage);
    (customError as any).originalError = error;
    throw customError;
  }
};

export const updateRestaurant = async (
  id: string,
  data: Partial<Restaurant>,
): Promise<Restaurant | null> => {
  try {
    const response = await restaurantAPI.update(id, data);
    return response.data || null;
  } catch (error) {
    console.error("Failed to update restaurant:", error);
    throw error;
  }
};

export const deleteRestaurant = async (id: string): Promise<void> => {
  try {
    await restaurantAPI.delete(id);
  } catch (error) {
    console.error("Failed to delete restaurant:", error);
    throw error;
  }
};

export const toggleRestaurantActive = async (id: string): Promise<void> => {
  try {
    await restaurantAPI.toggleActive(id);
  } catch (error) {
    console.error("Failed to toggle restaurant status:", error);
    throw error;
  }
};

// ============ CATEGORIES ============
export const getCategories = async (
  restaurantId?: string,
): Promise<Category[]> => {
  try {
    const params = restaurantId ? { restaurantId } : {};
    const response = await categoryAPI.getAll(params);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeCategory) : [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
};

export const getCategoriesByRestaurant = async (
  restaurantId: string,
): Promise<Category[]> => {
  try {
    const response = await categoryAPI.getByRestaurant(restaurantId);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeCategory) : [];
  } catch (error) {
    console.error("Failed to fetch categories by restaurant:", error);
    return [];
  }
};

export const createCategory = async (
  data: Partial<Category>,
): Promise<Category | null> => {
  try {
    const response = await categoryAPI.create(data);
    return response.data || null;
  } catch (error) {
    console.error("Failed to create category:", error);
    throw error;
  }
};

export const addCategory = createCategory;

export const updateCategory = async (
  id: string,
  data: Partial<Category>,
): Promise<Category | null> => {
  try {
    const response = await categoryAPI.update(id, data);
    return response.data || null;
  } catch (error) {
    console.error("Failed to update category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await categoryAPI.delete(id);
  } catch (error) {
    console.error("Failed to delete category:", error);
    throw error;
  }
};

// ============ MENU ITEMS ============
export const getMenuItems = async (params?: {
  restaurantId?: string;
  categoryId?: string;
}): Promise<MenuItem[]> => {
  try {
    const response = await menuItemAPI.getAll(params);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeMenuItem) : [];
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    return [];
  }
};

export const getMenuItemsByRestaurant = async (
  restaurantId: string,
  includeHidden?: boolean,
): Promise<MenuItem[]> => {
  try {
    const params = includeHidden ? { includeHidden: "true" } : {};
    const response = await menuItemAPI.getByRestaurant(restaurantId, params);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeMenuItem) : [];
  } catch (error) {
    console.error("Failed to fetch menu items by restaurant:", error);
    return [];
  }
};

export const createMenuItem = async (
  data: Partial<MenuItem>,
): Promise<MenuItem | null> => {
  try {
    const response = await menuItemAPI.create(data);
    return response.data || null;
  } catch (error) {
    console.error("Failed to create menu item:", error);
    throw error;
  }
};

export const addMenuItem = createMenuItem;

export const updateMenuItem = async (
  id: string,
  data: Partial<MenuItem>,
): Promise<MenuItem | null> => {
  try {
    const response = await menuItemAPI.update(id, data);
    return response.data || null;
  } catch (error) {
    console.error("Failed to update menu item:", error);
    throw error;
  }
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  try {
    await menuItemAPI.delete(id);
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    throw error;
  }
};

// ============ ORDERS ============
export const getOrders = async (params?: {
  restaurantId?: string;
  status?: string;
}): Promise<Order[]> => {
  try {
    const response = await orderAPI.getAll(params);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeOrder) : [];
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return [];
  }
};

export const getOrdersByRestaurant = async (
  restaurantId: string,
  status?: string,
): Promise<Order[]> => {
  try {
    const params = status ? { status } : {};
    const response = await orderAPI.getByRestaurant(restaurantId, params);
    const data = response.data || [];
    return Array.isArray(data) ? data.map(normalizeOrder) : [];
  } catch (error) {
    console.error("Failed to fetch orders by restaurant:", error);
    return [];
  }
};

export const addOrder = async (data: any): Promise<any> => {
  try {
    const response = await orderAPI.create(data);
    return response.data || response;
  } catch (error: any) {
    console.error("Failed to create order:", error);
    throw new Error(error.message || "Failed to create order");
  }
};

export const updateOrderStatus = async (
  orderId: string,
  status: Order["status"],
): Promise<Order | null> => {
  try {
    const response = await orderAPI.updateStatus(orderId, status);
    return response.data || null;
  } catch (error) {
    console.error("Failed to update order status:", error);
    throw error;
  }
};

export const getOrderStatistics = async (restaurantId: string) => {
  try {
    const response = await orderAPI.getStatistics(restaurantId);
    return response.data || null;
  } catch (error) {
    console.error("Failed to fetch order statistics:", error);
    return null;
  }
};

export const trackOrder = async (reference: string) => {
  try {
    const response = await orderAPI.trackByReference(reference);
    return response.data || null;
  } catch (error) {
    console.error("Failed to track order:", error);
    return null;
  }
};

// ✅ Get payment status for an order
export const getPaymentStatus = async (orderId: string) => {
  try {
    const response = await orderAPI.getPaymentStatus(orderId);
    return response.data || null;
  } catch (error) {
    console.error("Failed to get payment status:", error);
    return null;
  }
};

// ============ SETTINGS ============
export const getRestaurantSettings = async (restaurantId: string) => {
  try {
    const response = await settingsAPI.getRestaurantSettings(restaurantId);
    return response.data || null;
  } catch (error) {
    console.error("Failed to fetch restaurant settings:", error);
    return null;
  }
};

export const updateRestaurantSettings = async (
  restaurantId: string,
  data: any,
) => {
  try {
    const response = await settingsAPI.updateRestaurantSettings(
      restaurantId,
      data,
    );
    return response.data || null;
  } catch (error) {
    console.error("Failed to update restaurant settings:", error);
    throw error;
  }
};

export const toggleOrderingPause = async (restaurantId: string) => {
  try {
    const response = await settingsAPI.toggleOrderingPause(restaurantId);
    return response.data || null;
  } catch (error) {
    console.error("Failed to toggle ordering pause:", error);
    throw error;
  }
};

// ============ LEGACY FUNCTIONS ============
export const getCurrentRestaurantId = () => {
  return localStorage.getItem("currentRestaurantId") || "";
};

export const setCurrentRestaurantId = (id: string) => {
  localStorage.setItem("currentRestaurantId", id);
};

export const subscribeToStore = (callback: () => void) => {
  const interval = setInterval(callback, 5000);
  return () => clearInterval(interval);
};

export const initializeStore = async () => {
  console.log("API Store initialized");
};
