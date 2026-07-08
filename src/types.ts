export interface DailyHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BusinessHours {
  Monday: DailyHours;
  Tuesday: DailyHours;
  Wednesday: DailyHours;
  Thursday: DailyHours;
  Friday: DailyHours;
  Saturday: DailyHours;
  Sunday: DailyHours;
}

export interface PickupSettings {
  allowAsap: boolean;
  allowScheduled: boolean;
  prepTimeMinutes: number;
}

export interface TaxesFeesSettings {
  taxRatePercent: number;
  serviceFeeAmount: number;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  description: string;
  coverImage: string;
  logo: string;
  phone: string;
  address: string;
  isActive: boolean;
  
  // Custom Settings
  isOrderingPaused?: boolean;
  businessHours?: BusinessHours;
  pickupSettings?: PickupSettings;
  taxesAndFees?: TaxesFeesSettings;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
  
  // Custom Settings
  availability?: 'available' | 'out_of_stock' | 'hidden';
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string; // NEW: Added for email notifications
  items: OrderItem[];
  totalPrice: number;
  pickupTimeOption: 'ASAP' | 'scheduled';
  scheduledTime?: string;
  paymentMethod: 'online' | 'pickup';
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  timestamp: string;
  
  // Custom Settings
  specialInstructions?: string;
  taxAmount?: number;
  serviceFee?: number;
  finalTotal?: number;
  orderReference?: string; // NEW: Added for tracking
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'restaurant_owner' | 'customer';
  restaurantId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}