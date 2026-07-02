import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  Plus,
  Minus,
  Clock,
  CreditCard,
  ChevronRight,
  CheckCircle,
  MapPin,
  Phone,
  Info,
  Check,
  Utensils,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getRestaurants,
  getCategories,
  getMenuItems,
  addOrder,
  subscribeToStore,
  getCurrentRestaurantId,
  setCurrentRestaurantId,
} from "../store/apiStore";
import { Restaurant, Category, MenuItem, CartItem, Order } from "../types";

export default function CustomerOrdering() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Load state from API
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Find current restaurant
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(
    null,
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const resData = await getRestaurants();
        setRestaurants(resData);

        // Find restaurant by slug
        const found = resData.find((r) => r.slug === slug);
        if (found) {
          setCurrentRestaurant(found);
          setCurrentRestaurantId(found.id);

          // Load categories and menu items for this restaurant
          const catData = await getCategories(found.id);
          setCategories(catData);

          const menuData = await getMenuItems(found.id);
          setMenuItems(menuData);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [slug]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "menu" | "checkout" | "success"
  >("menu");

  // Checkout Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupOption, setPickupOption] = useState<"ASAP" | "scheduled">(
    "ASAP",
  );
  const [scheduledTime, setScheduledTime] = useState("12:00 PM");
  const [paymentChoice, setPaymentChoice] = useState<"online" | "pickup">(
    "online",
  );
  const [recentOrderId, setRecentOrderId] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placedOrderReceipt, setPlacedOrderReceipt] = useState<{
    subtotal: number;
    taxes: number;
    serviceFee: number;
    total: number;
    specialInstructions?: string;
  } | null>(null);

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  // Filter items & categories for this restaurant
  const filteredCategories = categories.filter(
    (c) => c.restaurantId === currentRestaurant?.id,
  );
  const filteredMenuItems = menuItems.filter((i) => {
    if (i.restaurantId !== currentRestaurant?.id) return false;
    const isHidden = i.availability === "hidden";
    return !isHidden;
  });

  // Set default pickup option based on allowed parameters
  useEffect(() => {
    if (currentRestaurant) {
      const asapAllowed = currentRestaurant.pickupSettings?.allowAsap !== false;
      const scheduledAllowed =
        currentRestaurant.pickupSettings?.allowScheduled !== false;
      if (!asapAllowed && scheduledAllowed) {
        setPickupOption("scheduled");
      } else {
        setPickupOption("ASAP");
      }
    }
  }, [currentRestaurant?.id]);

  // Default active category
  useEffect(() => {
    if (filteredCategories.length > 0 && !activeCategory) {
      setActiveCategory(filteredCategories[0].id);
    }
  }, [filteredCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 text-sm">Loading menu...</p>
      </div>
    );
  }

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Utensils className="w-12 h-12 text-gray-400 mb-3" />
        <h2 className="text-xl font-semibold text-gray-900">
          Restaurant Not Found
        </h2>
        <p className="text-gray-500 text-sm mt-1 max-w-xs">
          We couldn't locate this store. Please check the URL or go back to the
          homepage.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  // Cart Operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((i) => {
        if (i.menuItemId === menuItemId) {
          const newQty = i.quantity + delta;
          return { ...i, quantity: newQty < 1 ? 1 : newQty };
        }
        return i;
      });
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const itemsInCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Computed Taxes & Fees
  const taxRate =
    currentRestaurant?.taxesAndFees?.taxRatePercent !== undefined
      ? currentRestaurant.taxesAndFees.taxRatePercent
      : 8.5;
  const serviceFee =
    currentRestaurant?.taxesAndFees?.serviceFeeAmount !== undefined
      ? currentRestaurant.taxesAndFees.serviceFeeAmount
      : 2.5;
  const taxAmountValue = (cartTotal * taxRate) / 100;
  const finalTotalValue = cartTotal + taxAmountValue + serviceFee;

  // Checkout submission
  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!customerName.trim()) errors.name = "Please enter your full name";
    if (!customerPhone.trim())
      errors.phone = "Please enter a contact phone number";
    else if (customerPhone.replace(/\D/g, "").length < 8)
      errors.phone = "Please enter a valid phone number";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Ensure we have the correct restaurant ID
    if (!currentRestaurant || !currentRestaurant.id) {
      alert("Restaurant information is missing. Please try again.");
      return;
    }

    // Prepare order data with proper restaurant ID
    const orderData = {
      restaurantId: currentRestaurant.id, // This should be the ObjectId from MongoDB
      restaurantName: currentRestaurant.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      pickupTimeOption: pickupOption,
      scheduledTime: pickupOption === "scheduled" ? scheduledTime : undefined,
      paymentMethod: paymentChoice,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    console.log(
      "📤 Placing order with data:",
      JSON.stringify(orderData, null, 2),
    );

    try {
      const response = await addOrder(orderData);
      console.log("✅ Order placed successfully:", response);

      const newOrder = response.data || response;

      setPlacedOrderReceipt({
        subtotal: cartTotal,
        taxes: taxAmountValue,
        serviceFee: serviceFee,
        total: finalTotalValue,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      setRecentOrderId(newOrder.id || newOrder.orderReference || "");
      setCart([]);
      setCheckoutStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("❌ Failed to place order:", error);
      alert("Failed to place order. Please try again.");
    }
  };

  // Helper lists of pickup hours
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    let currentHour = now.getHours();
    let currentMin = now.getMinutes() > 30 ? 60 : 30;

    for (let i = 0; i < 12; i++) {
      if (currentMin === 60) {
        currentHour += 1;
        currentMin = 0;
      }
      if (currentHour >= 24) currentHour -= 24;

      const ampm = currentHour >= 12 ? "PM" : "AM";
      const dispHour = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const dispMin = currentMin === 0 ? "00" : currentMin;

      slots.push(`${dispHour}:${dispMin} ${ampm}`);
      currentMin += 30;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* 1. Header Banner & Restaurant Bio */}
      {checkoutStep === "menu" && (
        <>
          <div className="relative h-48 md:h-72 bg-gray-100 overflow-hidden">
            <img
              referrerPolicy="no-referrer"
              src={currentRestaurant.coverImage}
              alt={currentRestaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="max-w-5xl mx-auto px-4 relative pb-4 border-b border-gray-100">
            {/* BitePickup Branding Bar */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 rounded-lg p-1.5">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Powered by BitePickup
                </span>
              </div>
              <Link
                to={`/login?restaurant=${currentRestaurant.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
              >
                Restaurant Owner?
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {currentRestaurant.isOrderingPaused && (
              <div
                id="ordering-paused-sticky-banner"
                className="bg-amber-500 text-neutral-950 px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-sm border border-amber-600 my-4 animate-pulse"
              >
                <span className="w-2 h-2 rounded bg-neutral-950 animate-ping"></span>
                <span>
                  We are temporarily offline and pausing new incoming orders.
                  You can browse the menu, but checkout is disabled.
                </span>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 md:gap-4">
                {/* Logo floats gracefully with proper positive padding/margins beneath the banner rendering */}
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white p-1 shadow-md border border-gray-150 overflow-hidden flex-shrink-0 relative z-10">
                  <img
                    referrerPolicy="no-referrer"
                    src={currentRestaurant.logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="pb-1">
                  {currentRestaurant.isOrderingPaused ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-250 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Ordering Paused
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Accepting Orders
                    </span>
                  )}
                  <h1
                    id="shop-restaurant-name"
                    className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950 mt-1"
                  >
                    {currentRestaurant.name}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 py-1 font-medium bg-gray-50 rounded-lg p-2.5 max-w-sm border border-gray-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {currentRestaurant.subdomain}
                </span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {currentRestaurant.phone}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm md:text-base text-gray-600 max-w-3xl leading-relaxed">
              {currentRestaurant.description}
            </p>
          </div>
        </>
      )}

      {/* Main Grid: Menu Layout */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {checkoutStep === "menu" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Col: Menu categories & Items */}
            <div className="md:col-span-2 space-y-8">
              {/* Category buttons sticky slider */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-3 border-b border-gray-100 z-10 flex gap-2 overflow-x-auto scrollbar-none">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu lists grouped */}
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Utensils className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    No dishes added to this menu yet.
                  </p>
                </div>
              ) : (
                filteredCategories
                  .filter(
                    (cat) =>
                      activeCategory === null || cat.id === activeCategory,
                  )
                  .map((cat) => {
                    const categoryItems = filteredMenuItems.filter(
                      (i) => i.categoryId === cat.id,
                    );
                    return (
                      <div key={cat.id} className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-l-4 border-neutral-900 pl-3">
                          {cat.name}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                          {categoryItems.map((item) => (
                            <div
                              id={`menu-card-${item.id}`}
                              key={item.id}
                              className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
                            >
                              <div className="flex-1 space-y-1">
                                <h4 className="font-semibold text-gray-900 text-sm md:text-base">
                                  {item.name}
                                </h4>
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                                <div className="pt-2 text-sm md:text-base font-bold text-neutral-900">
                                  ${item.price.toFixed(2)}
                                </div>
                              </div>

                              <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gray-100 overflow-hidden relative flex-shrink-0">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  id={`add-btn-${item.id}`}
                                  onClick={() => addToCart(item)}
                                  className="absolute bottom-1 right-1 bg-white hover:bg-neutral-900 hover:text-white text-gray-900 w-7 h-7 rounded-full shadow-lg flex items-center justify-center font-bold transition-all border border-gray-100 cursor-pointer"
                                  title="Add to order"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {categoryItems.length === 0 && (
                            <p className="text-gray-400 text-xs italic py-2 pl-4">
                              No active dishes in this category.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Right Col: Standard Cart preview (Desktop) */}
            <div className="hidden md:block col-span-1">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150 sticky top-20">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <h3 className="font-bold flex items-center gap-2 text-gray-900">
                    <ShoppingBag className="w-4.5 h-4.5 text-gray-600" />
                    <span>Your Order</span>
                  </h3>
                  <span className="text-xs font-semibold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
                    {itemsInCartCount} items
                  </span>
                </div>

                <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">
                        Double tap any dish item to build your gourmet basket.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex items-start justify-between gap-2 text-xs py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {item.name}
                          </h4>
                          <span className="text-gray-500">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, -1)
                              }
                              className="px-1.5 py-1 text-gray-500 hover:bg-gray-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono text-gray-800 text-[11px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.menuItemId, 1)}
                              className="px-1.5 py-1 text-gray-500 hover:bg-gray-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
                    <div className="space-y-1.5 text-xs text-gray-600 border-b border-gray-100 pb-3">
                      <div className="flex justify-between items-center">
                        <span>Subtotal:</span>
                        <span className="font-medium text-gray-900">
                          ${cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Taxes ({taxRate}%):</span>
                        <span className="font-medium text-gray-900">
                          ${taxAmountValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Platform Service Fee:</span>
                        <span className="font-medium text-gray-900">
                          ${serviceFee.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                      <span>Grand Total:</span>
                      <span>${finalTotalValue.toFixed(2)}</span>
                    </div>

                    {currentRestaurant.isOrderingPaused ? (
                      <div className="p-3 bg-amber-50 text-amber-800 font-bold text-[10px] text-center uppercase rounded-lg border border-amber-200 leading-normal">
                        Ordering currently paused by {currentRestaurant.name}.
                      </div>
                    ) : (
                      <button
                        id="proceed-to-checkout-btn"
                        onClick={() => setCheckoutStep("checkout")}
                        className="w-full bg-neutral-900 hover:bg-neutral-800 active:translate-y-px text-white py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Proceed to Checkout</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Secure Checkout Interactive Page Form */}
        {checkoutStep === "checkout" && (
          <div className="max-w-2xl mx-auto">
            {/* Back to menu button */}
            <button
              onClick={() => setCheckoutStep("menu")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-xs tracking-wider uppercase mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Modify Order</span>
            </button>

            <div className="bg-white rounded-2xl border border-gray-150 p-6 sm:p-8 space-y-8">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Complete Pickup Order
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Provide your details to prepare pickup from{" "}
                  {currentRestaurant.name}
                </p>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-6">
                {/* Section A: Customer Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="customer-name-input"
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (e.target.value.trim())
                            setFormErrors((prev) => ({
                              ...prev,
                              name: undefined,
                            }));
                        }}
                        placeholder="John Doe"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                          formErrors.name
                            ? "border-rose-400 bg-rose-50/25"
                            : "border-gray-200"
                        }`}
                      />
                      {formErrors.name && (
                        <p
                          id="name-error-msg"
                          className="text-rose-500 text-[11px] mt-1 font-medium"
                        >
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Contact Phone Number{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="customer-phone-input"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (e.target.value.trim())
                            setFormErrors((prev) => ({
                              ...prev,
                              phone: undefined,
                            }));
                        }}
                        placeholder="(555) 000-0000"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                          formErrors.phone
                            ? "border-rose-400 bg-rose-50/25"
                            : "border-gray-200"
                        }`}
                      />
                      {formErrors.phone && (
                        <p
                          id="phone-error-msg"
                          className="text-rose-500 text-[11px] mt-1 font-medium"
                        >
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Pickup Scheduling */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Select Pickup Timing
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {currentRestaurant.pickupSettings?.allowAsap !== false && (
                      <button
                        id="pickup-asap-btn"
                        type="button"
                        onClick={() => setPickupOption("ASAP")}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          pickupOption === "ASAP"
                            ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Clock className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">
                            ASAP
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Ready in{" "}
                            {currentRestaurant.pickupSettings
                              ?.prepTimeMinutes || 15}{" "}
                            minutes
                          </p>
                        </div>
                      </button>
                    )}

                    {currentRestaurant.pickupSettings?.allowScheduled !==
                      false && (
                      <button
                        id="pickup-scheduled-btn"
                        type="button"
                        onClick={() => setPickupOption("scheduled")}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          pickupOption === "scheduled"
                            ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Clock className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">
                            Schedule Later
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Pick a designated today time
                          </p>
                        </div>
                      </button>
                    )}
                  </div>

                  {pickupOption === "scheduled" && (
                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Select Pickup Time
                      </label>
                      <select
                        id="scheduled-time-select"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section C: Payment Selection */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Choose Payment Option
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="pay-online-btn"
                      type="button"
                      onClick={() => setPaymentChoice("online")}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentChoice === "online"
                          ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-gray-900">
                          Pay Online
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Simulate digital clearing right now
                        </p>
                      </div>
                    </button>

                    <button
                      id="pay-at-pickup-btn"
                      type="button"
                      onClick={() => setPaymentChoice("pickup")}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentChoice === "pickup"
                          ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-gray-900">
                          Pay At Pickup
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Settle with store in cash/card
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                      4
                    </span>
                    Special Instructions (optional)
                  </h3>
                  <div>
                    <textarea
                      id="special-instructions-textarea"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Please specify allergies, request utensils, or add kitchen notes..."
                      rows={2}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                {/* Summary Cart Block */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 space-y-2">
                  <div className="font-bold text-gray-800 border-b border-gray-200 pb-1.5 text-sm">
                    Basket Summary:
                  </div>
                  <div className="space-y-1">
                    {cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex justify-between"
                      >
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-gray-150 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes ({taxRate}%):</span>
                      <span>${taxAmountValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee:</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-sm">
                    <span>Order Total:</span>
                    <span>${finalTotalValue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  {currentRestaurant.isOrderingPaused ? (
                    <div className="p-3 bg-amber-50 text-amber-805 text-amber-800 font-bold text-[10px] text-center uppercase rounded-lg border border-amber-200 leading-normal">
                      Checkout disabled - Ordering paused by{" "}
                      {currentRestaurant.name}
                    </div>
                  ) : (
                    <button
                      id="place-order-submit-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Place Order (${finalTotalValue.toFixed(2)})</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Success Receipt Notification */}
        {checkoutStep === "success" && (
          <div className="max-w-md mx-auto text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h2
              id="receipt-success-heading"
              className="text-2xl font-bold text-gray-900"
            >
              Order Placed Successfully!
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              Ticket Reference:{" "}
              <strong className="text-neutral-900">{recentOrderId}</strong>
            </p>

            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 my-6 text-left text-xs text-gray-600 space-y-3">
              <div className="text-center font-bold text-gray-800 border-b border-gray-200 pb-2 text-sm uppercase tracking-wider">
                {currentRestaurant.name} Pickup Ticket
              </div>

              <div className="grid grid-cols-2 gap-y-2">
                <div>Client Name:</div>
                <div className="text-right font-medium text-gray-900">
                  {customerName}
                </div>

                <div>Phone:</div>
                <div className="text-right font-medium text-gray-900">
                  {customerPhone}
                </div>

                <div>Pickup Timing:</div>
                <div className="text-right font-medium text-gray-900 capitalize">
                  {pickupOption === "ASAP"
                    ? `ASAP (${currentRestaurant.pickupSettings?.prepTimeMinutes || 15} min)`
                    : scheduledTime}
                </div>

                <div>Settlement Method:</div>
                <div className="text-right font-medium text-gray-900 capitalize text-emerald-600 font-bold">
                  {paymentChoice === "online"
                    ? "Paid Online"
                    : "Pay at Counter"}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-200 text-neutral-500">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal:</span>
                  <span>${(placedOrderReceipt?.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Estimated Taxes ({taxRate}%):</span>
                  <span>${(placedOrderReceipt?.taxes ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Processing Flat Service Fee:</span>
                  <span>
                    ${(placedOrderReceipt?.serviceFee ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-neutral-900 border-t border-gray-200 pt-1">
                  <span>Final Charged Total:</span>
                  <span>${(placedOrderReceipt?.total ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {placedOrderReceipt?.specialInstructions && (
                <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-805 text-[10px] rounded-lg">
                  <span className="block font-bold">Special Instructions:</span>
                  <p className="italic mt-0.5">
                    "{placedOrderReceipt.specialInstructions}"
                  </p>
                </div>
              )}

              <div className="border-t border-dashed border-gray-300 pt-2.5">
                <p className="text-[11px] leading-relaxed text-gray-500 text-center">
                  Your order has been received and is being prepared.
                  <br />
                  <span className="text-xs font-medium text-gray-400">
                    Thank you for ordering with {currentRestaurant.name}!
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep("menu");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold text-xs tracking-wide uppercase transition-all cursor-pointer"
              >
                Order More Food
              </button>

              <Link
                to={`/restaurant/${currentRestaurant.slug}`}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Floating Sticky Mobile Basket Footer */}
      {checkoutStep === "menu" && cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg z-30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">
              Total Basket Size
            </span>
            <span className="font-extrabold text-base text-gray-900">
              ${finalTotalValue.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setCheckoutStep("checkout")}
            className="bg-neutral-900 text-white font-bold text-xs tracking-wide uppercase px-5 py-3 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
