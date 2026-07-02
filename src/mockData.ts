import { Restaurant, Category, MenuItem, Order } from './types';

export const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: 'burger-house',
    name: 'Burger House',
    slug: 'burger-house',
    subdomain: 'burgerhouse.platform.com',
    description: 'Chef-crafted smash burgers served on artisanal brioche buns with organic hand-cut fries and rich milkshakes.',
    coverImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&auto=format&fit=crop&q=60',
    phone: '+1 (555) 321-4923',
    address: '402 Brioche Blvd, Downtown Gastronomy, NY 10012',
    isActive: true,
  },
  {
    id: 'pizza-artisan',
    name: 'Pizza Artisan',
    slug: 'pizza-artisan',
    subdomain: 'pizzaartisan.platform.com',
    description: 'Traditional wood-fired sourdough pizzas with imported San Marzano tomatoes, fresh mozzarella bufala, and local herbs.',
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=100&auto=format&fit=crop&q=60',
    phone: '+1 (555) 789-0123',
    address: '89 Neapolitan Way, Stone Oven District, CA 94103',
    isActive: true,
  },
  {
    id: 'green-lab',
    name: 'Green Salad Lab',
    slug: 'green-lab',
    subdomain: 'greenlab.platform.com',
    description: 'Organic nutrient-dense greens, gourmet protein bowls, fresh superfood dressings, and organic cold-pressed wellness boosters.',
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=100&auto=format&fit=crop&q=60',
    phone: '+1 (555) 456-7890',
    address: '12 Leafy Greens Lane, Organic Park, OR 97201',
    isActive: false, // Starts deactivated to show Admin toggle functionality!
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Burger House Categories
  { id: 'bh-cat-1', restaurantId: 'burger-house', name: 'Signature Burgers' },
  { id: 'bh-cat-2', restaurantId: 'burger-house', name: 'Sides & Appetizers' },
  { id: 'bh-cat-3', restaurantId: 'burger-house', name: 'Artisanal Shakes' },
  { id: 'bh-cat-4', restaurantId: 'burger-house', name: 'Beverages' },

  // Pizza Artisan Categories
  { id: 'pa-cat-1', restaurantId: 'pizza-artisan', name: 'Red Stone Pizzas' },
  { id: 'pa-cat-2', restaurantId: 'pizza-artisan', name: 'White Stone Pizzas' },
  { id: 'pa-cat-3', restaurantId: 'pizza-artisan', name: 'Gourmet Starters' },
  { id: 'pa-cat-4', restaurantId: 'pizza-artisan', name: 'Drinks' },

  // Green Salad Lab Categories
  { id: 'gl-cat-1', restaurantId: 'green-lab', name: 'Superfood Bowls' },
  { id: 'gl-cat-2', restaurantId: 'green-lab', name: 'Cold-Pressed Wellness' },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Burger House Items
  {
    id: 'bh-item-1',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-1',
    name: 'The Truffle Majesty',
    description: 'Double 100% grass-fed Angus beef smash patties, molten Swiss gruyère, caramelized forest truffles, roasted garlic preserve on toasted artisan brioche.',
    price: 16.50,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-2',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-1',
    name: 'Classic Golden Gate',
    description: 'Charbroiled beef patty, house special sauce, crispy butter lettuce, heirloom tomato, premium cheddar, pickles.',
    price: 13.00,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-3',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-1',
    name: 'Spicy Avocado West',
    description: 'Handcrafted beef patty, molten pepper jack, jalapeño confit, smashed organic avocado, spicy chipotle aioli.',
    price: 14.50,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-4',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-2',
    name: 'Parmesan Truffle Fries',
    description: 'Crisp hand-cut skin-on Russet potatoes tossed in high-grade truffle oil, dynamic sea salt, micro-planed aged Reggiano.',
    price: 6.50,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-5',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-2',
    name: 'Crispy Sweet Spuds',
    description: 'Lightly battered golden sweet potato frites with maple mustard dipping nectar.',
    price: 5.50,
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-6',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-3',
    name: 'Himalayan Salted Caramel Shake',
    description: 'Organic Madagascan vanilla bean gelato blended with slow-simmered caramel, touch of pink Himalayan crystal salt, fresh whipped foam.',
    price: 7.00,
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-7',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-3',
    name: 'Double Dark Chocolate Dream',
    description: 'Decadent 72% Valrhona dark chocolate whip, house chocolate fudge glaze, topped with cacao nib crunch.',
    price: 7.50,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'bh-item-8',
    restaurantId: 'burger-house',
    categoryId: 'bh-cat-4',
    name: 'Cold-Brew Iced Tea',
    description: 'Black tea infused with organic lemon rind and fresh garden mint leaves.',
    price: 3.50,
    image: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },

  // Pizza Artisan Items
  {
    id: 'pa-item-1',
    restaurantId: 'pizza-artisan',
    categoryId: 'pa-cat-1',
    name: 'Margherita Regina',
    description: 'Crushed hand-milled San Marzano DOP tomatoes, sliced fresh fior di latte, fragrant wild basil sprigs, splash of organic extra virgin oil.',
    price: 15.00,
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'pa-item-2',
    restaurantId: 'pizza-artisan',
    categoryId: 'pa-cat-1',
    name: 'The Spicy Calabrian',
    description: 'Red marinara bed, molten mozzarella, spicy crumbled Calabrian nduja, cured spicy salami, hot honey drizzle.',
    price: 18.50,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'pa-item-3',
    restaurantId: 'pizza-artisan',
    categoryId: 'pa-cat-2',
    name: 'Four Forest Funghi',
    description: 'Creamy white truffle crema, roasted chanterelle, shiitake, oyster and cremini mushrooms, fontina block, baby arugula topper.',
    price: 19.00,
    image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'pa-item-4',
    restaurantId: 'pizza-artisan',
    categoryId: 'pa-cat-3',
    name: 'Wood-Fired Garlic Knots',
    description: 'Freshly baked sourdough knots coated in grass-fed garlic herb compound butter, sprinkled with fine parmesan dust.',
    price: 7.00,
    image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },

  // Green Salad Lab Items
  {
    id: 'gl-item-1',
    restaurantId: 'green-lab',
    categoryId: 'gl-cat-1',
    name: 'Avocado Quinoa Fuel',
    description: 'Steamed tri-color organic quinoa, smashed avocado, field baby spinach, wild heirloom tomatoes, spiced chickpeas, creamy tahini drizzle.',
    price: 14.00,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'gl-item-2',
    restaurantId: 'green-lab',
    categoryId: 'gl-cat-2',
    name: 'The Crimson Recharge',
    description: 'Pure cold-pressed extract of state beets, crisped carrots, ginger root, and organic green apples.',
    price: 8.50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'order-101',
    restaurantId: 'burger-house',
    restaurantName: 'Burger House',
    customerName: 'Marcus Cole',
    customerPhone: '+1 (555) 123-9876',
    items: [
      { id: 'oi-1', menuItemId: 'bh-item-1', name: 'The Truffle Majesty', price: 16.50, quantity: 2 },
      { id: 'oi-2', menuItemId: 'bh-item-4', name: 'Parmesan Truffle Fries', price: 6.50, quantity: 1 }
    ],
    totalPrice: 39.50,
    pickupTimeOption: 'ASAP',
    paymentMethod: 'online',
    status: 'NEW',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString() // 3 mins ago
  },
  {
    id: 'order-102',
    restaurantId: 'burger-house',
    restaurantName: 'Burger House',
    customerName: 'Samantha Green',
    customerPhone: '+1 (555) 443-8910',
    items: [
      { id: 'oi-3', menuItemId: 'bh-item-2', name: 'Classic Golden Gate', price: 13.00, quantity: 1 },
      { id: 'oi-4', menuItemId: 'bh-item-6', name: 'Himalayan Salted Caramel Shake', price: 7.00, quantity: 1 }
    ],
    totalPrice: 20.00,
    pickupTimeOption: 'scheduled',
    scheduledTime: '12:45 PM',
    paymentMethod: 'pickup',
    status: 'PREPARING',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString() // 15 mins ago
  },
  {
    id: 'order-103',
    restaurantId: 'pizza-artisan',
    restaurantName: 'Pizza Artisan',
    customerName: 'David Vance',
    customerPhone: '+1 (555) 303-3490',
    items: [
      { id: 'oi-5', menuItemId: 'pa-item-2', name: 'The Spicy Calabrian', price: 18.50, quantity: 1 }
    ],
    totalPrice: 18.50,
    pickupTimeOption: 'ASAP',
    paymentMethod: 'online',
    status: 'READY',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString() // 25 mins ago
  }
];
