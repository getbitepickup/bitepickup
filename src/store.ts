import { Restaurant, Category, MenuItem, Order } from './types';
import { INITIAL_RESTAURANTS, INITIAL_CATEGORIES, INITIAL_MENU_ITEMS, INITIAL_ORDERS } from './mockData';

// Storage Keys
const KEY_RESTAURANTS = 'saas_ordering_restaurants';
const KEY_CATEGORIES = 'saas_ordering_categories';
const KEY_MENU_ITEMS = 'saas_ordering_menu_items';
const KEY_ORDERS = 'saas_ordering_orders';
const KEY_CURRENT_RESTAURANT_ID = 'saas_ordering_current_restaurant_id';

const UPDATE_EVENT_NAME = 'saas-store-update';

// Initialize localStorage if not set
export function initializeStore() {
  if (!localStorage.getItem(KEY_RESTAURANTS)) {
    localStorage.setItem(KEY_RESTAURANTS, JSON.stringify(INITIAL_RESTAURANTS));
  }
  if (!localStorage.getItem(KEY_CATEGORIES)) {
    localStorage.setItem(KEY_CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(KEY_MENU_ITEMS)) {
    localStorage.setItem(KEY_MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
  }
  if (!localStorage.getItem(KEY_ORDERS)) {
    localStorage.setItem(KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
  }
  if (!localStorage.getItem(KEY_CURRENT_RESTAURANT_ID)) {
    localStorage.setItem(KEY_CURRENT_RESTAURANT_ID, 'burger-house');
  }
}

// Broadcast updates
function broadcastUpdate() {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
}

// Subscribe helper
export function subscribeToStore(callback: () => void) {
  window.addEventListener(UPDATE_EVENT_NAME, callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT_NAME, callback);
  };
}

// RESTAURANTS
export function getRestaurants(): Restaurant[] {
  initializeStore();
  return JSON.parse(localStorage.getItem(KEY_RESTAURANTS) || '[]');
}

export function saveRestaurants(restaurants: Restaurant[]) {
  localStorage.setItem(KEY_RESTAURANTS, JSON.stringify(restaurants));
  broadcastUpdate();
}

export function addRestaurant(restaurant: Restaurant) {
  const restaurants = getRestaurants();
  restaurants.push(restaurant);
  saveRestaurants(restaurants);
}

export function updateRestaurant(updated: Restaurant) {
  const restaurants = getRestaurants();
  const index = restaurants.findIndex(r => r.id === updated.id);
  if (index !== -1) {
    restaurants[index] = updated;
    saveRestaurants(restaurants);
  }
}

export function deleteRestaurant(id: string) {
  const restaurants = getRestaurants().filter(r => r.id !== id);
  saveRestaurants(restaurants);

  // Clean categories & menu items too
  const categories = getCategories().filter(c => c.restaurantId !== id);
  saveCategories(categories);
  
  const items = getMenuItems().filter(i => i.restaurantId !== id);
  saveMenuItems(items);
}

// CATEGORIES
export function getCategories(): Category[] {
  initializeStore();
  return JSON.parse(localStorage.getItem(KEY_CATEGORIES) || '[]');
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
  broadcastUpdate();
}

export function addCategory(category: Category) {
  const categories = getCategories();
  categories.push(category);
  saveCategories(categories);
}

export function updateCategory(updated: Category) {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === updated.id);
  if (index !== -1) {
    categories[index] = updated;
    saveCategories(categories);
  }
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter(c => c.id !== id);
  saveCategories(categories);
  
  // Clean menu items referencing this category
  const items = getMenuItems().filter(i => i.categoryId !== id);
  saveMenuItems(items);
}

// MENU ITEMS
export function getMenuItems(): MenuItem[] {
  initializeStore();
  return JSON.parse(localStorage.getItem(KEY_MENU_ITEMS) || '[]');
}

export function saveMenuItems(items: MenuItem[]) {
  localStorage.setItem(KEY_MENU_ITEMS, JSON.stringify(items));
  broadcastUpdate();
}

export function addMenuItem(item: MenuItem) {
  const items = getMenuItems();
  items.push(item);
  saveMenuItems(items);
}

export function updateMenuItem(updated: MenuItem) {
  const items = getMenuItems();
  const index = items.findIndex(i => i.id === updated.id);
  if (index !== -1) {
    items[index] = updated;
    saveMenuItems(items);
  }
}

export function deleteMenuItem(id: string) {
  const items = getMenuItems().filter(i => i.id !== id);
  saveMenuItems(items);
}

// ORDERS
export function getOrders(): Order[] {
  initializeStore();
  return JSON.parse(localStorage.getItem(KEY_ORDERS) || '[]');
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
  broadcastUpdate();
}

export function addOrder(order: Order) {
  const orders = getOrders();
  // Place new orders at position 0 to make them appear top of list
  orders.unshift(order);
  saveOrders(orders);
}

export function updateOrderStatus(orderId: string, status: Order['status']) {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], status };
    saveOrders(orders);
  }
}

// SELECTED / CURRENT ACTIVE CONTEXT
export function getCurrentRestaurantId(): string {
  initializeStore();
  return localStorage.getItem(KEY_CURRENT_RESTAURANT_ID) || 'burger-house';
}

export function setCurrentRestaurantId(id: string) {
  localStorage.setItem(KEY_CURRENT_RESTAURANT_ID, id);
  broadcastUpdate();
}
