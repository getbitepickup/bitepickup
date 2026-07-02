import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  // Get the current restaurant from the activeRestaurantId
  const currentRestaurant =
    restaurants.find((r) => r.id === activeRestaurantId) || null;

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
        // 1. From URL param
        // 2. From user context (if restaurant owner)
        // 3. From localStorage
        // 4. Use first restaurant as fallback
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

        // If still no ID, try to match by slug/subdomain from the owner record
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

          // Load categories, menu items, and orders for this restaurant
          const catData = await getCategories(restaurantId);
          setCategories(catData);
          console.log("📂 Categories loaded:", catData.length);

          const menuData = await getMenuItems(restaurantId);
          setMenuItems(menuData);
          console.log("🍽️ Menu items loaded:", menuData.length);

          const ordersData = await getOrders(restaurantId);
          setOrders(ordersData);
          console.log("📦 Orders loaded:", ordersData.length);
        } else {
          console.warn("⚠️ No restaurant ID found!");
        }
      } catch (error) {
        console.error("❌ Failed to load restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only load if auth is not loading
    if (!authLoading) {
      loadData();
    }
  }, [id, user, authLoading]);

  // Audio synthesizer double beep
  const playWebBeep = () => {
    try {
      const context = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      const beep = (freq: number, duration: number, onset: number) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, context.currentTime + onset);
        osc.connect(gain);
        gain.connect(context.destination);
        gain.gain.setValueAtTime(0.12, context.currentTime + onset);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          context.currentTime + onset + duration,
        );
        osc.start(context.currentTime + onset);
        osc.stop(context.currentTime + onset + duration);
      };

      beep(880, 0.15, 0);
      beep(1046, 0.2, 0.18);
    } catch (e) {
      console.log("Web Audio context blocked or unsupported", e);
    }
  };

  // Active restaurant orders
  const activeRestaurantOrders = orders.filter(
    (o) => o.restaurantId === currentRestaurant?.id,
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

  // Trigger sound alert on mount of any brand new order
  useEffect(() => {
    if (newOrders.length > 0) {
      playWebBeep();
    }
  }, [newOrders.length]);

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
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "PREPARING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "READY":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "COMPLETED":
        return "bg-blue-100 text-blue-700 border-blue-200";
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

      // Refresh restaurant data
      const resData = await getRestaurants();
      setRestaurants(resData);
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
        // Update existing category
        result = await updateCategory(editingCatId, {
          name: catNameInput.trim(),
        });
        console.log("✅ Category updated:", result);
      } else {
        // Create new category - let MongoDB generate the ID
        result = await addCategory({
          restaurantId: currentRestaurant.id,
          name: catNameInput.trim(),
        });
        console.log("✅ Category created:", result);
      }

      // Refresh categories
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

    // Validate required fields
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

    // Build the payload with ALL fields explicitly set
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

      // Refresh menu items
      const menuData = await getMenuItems(currentRestaurant.id);
      setMenuItems(menuData);
      setShowItemModal(false);

      // Reset form
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
      console.error("❌ Error message:", error.message);
      console.error("❌ Full error:", error);
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold">No Restaurant Found</h2>
          <p className="text-gray-400 text-xs mt-1 max-w-sm">
            {user?.role === "restaurant_owner"
              ? "You do not have a restaurant assigned to your account. Please contact the platform administrator."
              : "Please select a restaurant from the admin panel first."}
          </p>
          {user?.role === "admin" ? (
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 px-6 py-2 rounded-lg font-semibold"
            >
              Go to Admin Panel
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 px-6 py-2 rounded-lg font-semibold"
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grouped active items inside active categories helper
  const storeCategories = categories.filter(
    (c) => c.restaurantId === currentRestaurant.id,
  );
  const storeItems = menuItems.filter(
    (i) => i.restaurantId === currentRestaurant.id,
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 font-sans pb-16">
      {/* Dynamic Sub-header Context Banner */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden flex-shrink-0">
            <img
              referrerPolicy="no-referrer"
              src={currentRestaurant.logo}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {currentRestaurant.name} Dashboard
              </h2>
              <span
                className={`h-2.5 w-2.5 rounded-full ${currentRestaurant.isActive ? "bg-emerald-500" : "bg-red-500"}`}
                title={
                  currentRestaurant.isActive ? "Active Store" : "Inactive Store"
                }
              ></span>
            </div>
            <p className="text-xs text-neutral-400">
              Manage order feeds, categories, menu pricing, and graphics layout.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex border-b border-neutral-800 overflow-x-auto">
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
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-neutral-800 text-amber-400 text-[10px] py-0.5 px-2 rounded-full border border-neutral-700">
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
                      "border-l-4 border-rose-500 bg-rose-950/25 text-rose-400",
                  },
                  {
                    label: "Cooking",
                    count: preparingOrders.length,
                    color:
                      "border-l-4 border-amber-500 bg-amber-950/25 text-amber-400",
                  },
                  {
                    label: "Awaiting Pickup",
                    count: readyOrders.length,
                    color:
                      "border-l-4 border-emerald-500 bg-emerald-950/25 text-emerald-400",
                  },
                  {
                    label: "Total Historical Orders",
                    count: activeRestaurantOrders.length,
                    color:
                      "border-l-4 border-neutral-700 bg-neutral-900/40 text-neutral-400",
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border border-neutral-800/80 ${stat.color}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {stat.label}
                    </div>
                    <div className="text-2xl font-extrabold mt-1">
                      {stat.count}
                    </div>
                  </div>
                ))}
              </div>

              {/* Kitchen Pipeline Board */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUMN 1: NEW INCOMING ORDERS */}
                <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      <h3 className="font-bold text-white text-sm">
                        NEW INCOMING FEED
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-950 text-rose-400 px-2 py-0.5 rounded-md border border-rose-800">
                      {newOrders.length} ticket
                      {newOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {newOrders.length === 0 ? (
                      <div className="text-center py-16 text-neutral-500">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs">No pending unread orders.</p>
                      </div>
                    ) : (
                      newOrders.map((order) => (
                        <div
                          id={`order-card-${order.id}`}
                          key={order.id}
                          className="bg-neutral-900 border-2 border-rose-500 rounded-xl p-4 space-y-4 shadow-lg"
                        >
                          <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-rose-400">
                                {order.id}
                              </span>
                              <h4 className="font-sans text-xs text-neutral-400 font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-neutral-200"
                              >
                                <span className="font-bold text-neutral-100">
                                  {item.quantity}x{" "}
                                  <span className="font-normal text-neutral-300">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-neutral-800 pt-2 flex justify-between font-extrabold text-white">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-neutral-950 rounded-lg text-neutral-400 border border-neutral-800">
                            <div>
                              <span className="block font-semibold">
                                Timing Type:
                              </span>
                              <span className="text-rose-400 font-bold">
                                {order.pickupTimeOption === "ASAP"
                                  ? "ASAP"
                                  : order.scheduledTime}
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold">
                                Payment:
                              </span>
                              <span className="capitalize">
                                {order.paymentMethod === "online"
                                  ? "Credit Paid"
                                  : "Cash at Desk"}
                              </span>
                            </div>
                          </div>

                          {order.specialInstructions && (
                            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] rounded-lg">
                              <span className="block font-bold">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

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
                              }}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-extrabold py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Accept & Prepare
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: ACTIVE PREPARING ORDERS */}
                <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <h3 className="font-bold text-white text-sm">
                        PREPARING IN KITCHEN
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-950 text-amber-400 px-2 py-0.5 rounded-md border border-amber-800">
                      {preparingOrders.length} ticket
                      {preparingOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {preparingOrders.length === 0 ? (
                      <div className="text-center py-16 text-neutral-500">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs">No orders cooking presently.</p>
                      </div>
                    ) : (
                      preparingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-neutral-900 border-2 border-amber-500 rounded-xl p-4 space-y-4 shadow-lg"
                        >
                          <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-amber-400">
                                {order.id}
                              </span>
                              <h4 className="font-sans text-xs text-neutral-400 font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-neutral-200"
                              >
                                <span className="font-bold text-neutral-100">
                                  {item.quantity}x{" "}
                                  <span className="text-neutral-300 font-normal">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-neutral-800 pt-2 flex justify-between font-extrabold text-white">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-neutral-950 rounded-lg text-neutral-400 border border-neutral-800">
                            <div>
                              <span className="block font-semibold">
                                Timing Type:
                              </span>
                              <span className="text-amber-400 font-bold">
                                {order.pickupTimeOption === "ASAP"
                                  ? "ASAP"
                                  : order.scheduledTime}
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold">
                                Phone:
                              </span>
                              <span className="font-mono">
                                {order.customerPhone}
                              </span>
                            </div>
                          </div>

                          {order.specialInstructions && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] rounded-lg">
                              <span className="block font-bold">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

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
                              }}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-extrabold py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Ready for Pickup
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 3: READY ORDERS */}
                <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="font-bold text-white text-sm">
                        AWAITING CORNER PICKUP
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800">
                      {readyOrders.length} ticket
                      {readyOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {readyOrders.length === 0 ? (
                      <div className="text-center py-16 text-neutral-500">
                        <CheckSquare className="w-8 h-8 mx-auto stroke-1 opacity-45 mb-2" />
                        <p className="text-xs">No orders pending pick-up.</p>
                      </div>
                    ) : (
                      readyOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-neutral-900 border-2 border-emerald-500 rounded-xl p-4 space-y-4 shadow-lg animate-pulse"
                        >
                          <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
                            <div>
                              <span className="font-mono text-xs font-semibold text-emerald-400">
                                {order.id}
                              </span>
                              <h4 className="font-sans text-xs text-neutral-400 font-bold mt-0.5">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {new Date(order.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-neutral-200"
                              >
                                <span className="font-bold text-neutral-100">
                                  {item.quantity}x{" "}
                                  <span className="font-normal text-neutral-300">
                                    {item.name}
                                  </span>
                                </span>
                                <span>
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-neutral-800 pt-2 flex justify-between font-extrabold text-white">
                              <span>Total Net:</span>
                              <span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-neutral-950 rounded-lg text-neutral-200 border border-neutral-800">
                            <div>
                              <span className="block font-semibold">
                                Ready Status:
                              </span>
                              <span className="text-emerald-400 font-bold">
                                READY TO HANDOFF
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold">
                                Phone:
                              </span>
                              <span className="font-mono">
                                {order.customerPhone}
                              </span>
                            </div>
                          </div>

                          {order.specialInstructions && (
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] rounded-lg">
                              <span className="block font-bold">
                                Special Instructions:
                              </span>
                              <p className="italic mt-0.5">
                                "{order.specialInstructions}"
                              </p>
                            </div>
                          )}

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
                              }}
                              className="flex-1 bg-neutral-850 border border-neutral-700 hover:bg-neutral-800 text-white text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer"
                            >
                              Arrived & Completed
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
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                  <div className="text-xs text-neutral-400">
                    Total Completed Orders
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {completedOrders.length}
                  </div>
                </div>
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                  <div className="text-xs text-neutral-400">Total Revenue</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    $
                    {completedOrders
                      .reduce((sum, o) => sum + (o.totalPrice || 0), 0)
                      .toFixed(2)}
                  </div>
                </div>
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                  <div className="text-xs text-neutral-400">
                    Average Order Value
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search past orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-neutral-200 focus:outline-none focus:border-amber-500 placeholder-neutral-500"
                  />
                </div>
                <span className="text-xs text-neutral-500">
                  {filteredCompletedOrders.length} orders found
                </span>
              </div>

              {/* Orders Table */}
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-800/50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Items</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredCompletedOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-neutral-500"
                          >
                            {searchQuery
                              ? "No past orders matching your search."
                              : "No completed orders yet."}
                          </td>
                        </tr>
                      ) : (
                        filteredCompletedOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="hover:bg-neutral-800/40"
                          >
                            <td className="px-6 py-4 font-mono text-[11px] font-semibold text-amber-400">
                              #{order.orderReference || order.id?.slice(-6)}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-white">
                                  {order.customerName}
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  {order.customerPhone}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                {order.items
                                  ?.slice(0, 2)
                                  .map((item: any, idx: number) => (
                                    <div key={idx} className="text-neutral-300">
                                      {item.quantity}x {item.name}
                                    </div>
                                  ))}
                                {order.items?.length > 2 && (
                                  <div className="text-neutral-500 text-[10px]">
                                    +{order.items.length - 2} more items
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-white">
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
                            <td className="px-6 py-4 text-neutral-400">
                              {new Date(
                                order.createdAt || order.timestamp,
                              ).toLocaleDateString()}
                              <br />
                              <span className="text-[10px] text-neutral-500">
                                {new Date(
                                  order.createdAt || order.timestamp,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
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
              <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Dishes and Menu Items
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Total catalog dishes configured: {storeItems.length} items
                  </p>
                </div>
                <button
                  id="add-dish-btn"
                  onClick={handleOpenAddItem}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
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
                      className="bg-neutral-900 border border-neutral-850 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-40 bg-neutral-800 relative">
                          <img
                            referrerPolicy="no-referrer"
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="bg-neutral-950/80 backdrop-blur-md text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full border border-neutral-800">
                              {catName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                (item.availability || "available") ===
                                "out_of_stock"
                                  ? "bg-amber-950/80 text-amber-400 border-amber-800"
                                  : (item.availability || "available") ===
                                      "hidden"
                                    ? "bg-red-950/80 text-red-400 border-red-800"
                                    : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
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
                            <h4 className="font-bold text-white text-sm leading-tight">
                              {item.name}
                            </h4>
                            <span className="text-amber-400 font-extrabold font-mono text-sm">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-neutral-850 p-3 bg-neutral-900/40 flex justify-between gap-2">
                        <div className="flex-1 flex gap-1 justify-between bg-neutral-950/60 p-1 rounded-xl border border-neutral-800">
                          {[
                            {
                              value: "available",
                              label: "In Stock",
                              bgActive:
                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            },
                            {
                              value: "out_of_stock",
                              label: "Out",
                              bgActive:
                                "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            },
                            {
                              value: "hidden",
                              label: "Hide",
                              bgActive:
                                "bg-red-500/10 text-red-500 border-red-500/20",
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
                                className={`flex-1 text-[9px] font-bold py-1 px-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? `${state.bgActive} border-opacity-100 font-extrabold shadow-sm`
                                    : "border-transparent text-neutral-400 hover:text-neutral-200"
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
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg border border-neutral-700 cursor-pointer"
                            title="Edit specifications"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-item-${item.id}`}
                            onClick={() => handleDeleteItem(item.id)}
                            className="bg-neutral-850 hover:bg-red-950 hover:text-red-400 hover:border-red-900 text-neutral-400 p-2 rounded-lg border border-neutral-700 cursor-pointer"
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
                  <div className="col-span-full text-center py-16 bg-neutral-900 rounded-2xl border border-dashed border-neutral-800">
                    <Coffee className="w-12 h-12 text-neutral-600 mx-auto mb-3 stroke-1" />
                    <p className="text-neutral-400 text-xs">
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
              <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Menu Food Categories
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Setup specific groupings (e.g. "Wood-Fired Pizza", "Soft
                    Beverages").
                  </p>
                </div>
                <button
                  id="add-category-btn"
                  onClick={handleOpenAddCat}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </button>
              </div>

              {/* Categories list table */}
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-850 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="px-6 py-4">Category Handle ID</th>
                      <th className="px-6 py-4">Title Heading Name</th>
                      <th className="px-6 py-4">Dishes Nested</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {storeCategories.map((cat) => {
                      const dishesCount = storeItems.filter(
                        (i) => i.categoryId === cat.id,
                      ).length;
                      return (
                        <tr key={cat.id} className="hover:bg-neutral-850/40">
                          <td className="px-6 py-4 font-mono text-neutral-500">
                            {cat.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">
                            {cat.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md border border-neutral-750 text-[10px] font-bold">
                              {dishesCount} nested recipes
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2.5">
                            <button
                              id={`edit-cat-${cat.id}`}
                              onClick={() => handleOpenEditCat(cat)}
                              className="text-amber-400 hover:text-amber-500 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <span className="text-neutral-700">|</span>
                            <button
                              id={`delete-cat-${cat.id}`}
                              onClick={() => handleDeleteCat(cat.id)}
                              className="text-neutral-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
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
                          className="text-center py-12 text-neutral-500 italic"
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
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6"
              >
                <div>
                  <h3 className="text-base font-bold text-white">
                    Store Profile & Digital Identity
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Configure layout, cover banners, and contact coordinates for
                    the customer storefront.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentRestaurant.name}
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-500 cursor-not-allowed focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Name can only be configured by Platform Owner admins.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Store URL
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentRestaurant.subdomain}
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      placeholder="Chef-crafted specialty foods..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Logo URL
                      </label>
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Cover Image URL
                      </label>
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-800">
                  <button
                    id="save-profile-btn"
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
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
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* 1. Pause Ordering Settings Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-amber-500" />
                        <span>Interactive Ordering Status</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Temporarily pause incoming tickets during busy rush
                        hours or seasonal holidays.
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      {isOrderingPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                          Ordering Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          Accepting Orders
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-white">
                        Pause Ordering Instantly
                      </span>
                      <span className="block text-[11px] text-neutral-500 mt-0.5">
                        Toggle to prevent checkout and warn visitors
                        immediately.
                      </span>
                    </div>
                    <button
                      type="button"
                      id="toggle-pause-ordering-btn"
                      onClick={() => setIsOrderingPaused(!isOrderingPaused)}
                      className={`w-14 h-8 rounded-full transition-all relative p-1 cursor-pointer focus:outline-none ${isOrderingPaused ? "bg-amber-500" : "bg-neutral-850"}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md transition-all transform ${isOrderingPaused ? "translate-x-6" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Business Hours Setup Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-400" />
                      <span>Weekly Store Business Hours</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
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
                          className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 bg-neutral-950/40 hover:bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800/60 transition-all text-xs"
                        >
                          <div className="sm:col-span-4 flex items-center justify-between">
                            <span className="font-bold text-white text-xs min-w-[80px]">
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
                              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                                dayHours.isOpen
                                  ? "bg-indigo-950 text-indigo-400 border-indigo-900 hover:bg-indigo-900/65"
                                  : "bg-neutral-850 text-neutral-500 border-neutral-800 hover:bg-neutral-850"
                              }`}
                            >
                              {dayHours.isOpen ? "Open Day" : "Closed"}
                            </button>
                          </div>

                          <div className="sm:col-span-8 flex items-center gap-3">
                            {dayHours.isOpen ? (
                              <>
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                                    Opens at
                                  </label>
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
                                    className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                                  >
                                    {[
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
                                    ].map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <span className="text-neutral-600 mt-4 font-bold">
                                  to
                                </span>
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                                    Closes at
                                  </label>
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
                                    className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                                  >
                                    {[
                                      "05:00 PM",
                                      "06:00 PM",
                                      "07:00 PM",
                                      "08:00 PM",
                                      "09:00 PM",
                                      "10:00 PM",
                                      "11:00 PM",
                                      "11:59 PM",
                                      "01:00 AM",
                                      "02:00 AM",
                                    ].map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 bg-neutral-950/60 text-center py-2 text-neutral-600 font-medium italic rounded-lg border border-neutral-900">
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
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>Pickup Strategy Coordinations</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Configure pickup logistics, advanced scheduling
                      restrictions, and kitchen dispatch times.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-white">
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
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-normal">
                        Show ASAP estimate and recommend pickups at earliest
                        convenience.
                      </p>
                    </div>

                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-white">
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
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-normal">
                        Allow customers to pick exact schedules on future hours
                        of open days.
                      </p>
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl">
                    <label className="block text-xs font-bold text-white mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none text-neutral-300 text-xs"
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
                    <p className="text-[10px] text-neutral-500 mt-1.5">
                      Used to render precise estimated availability on the
                      customer success ticket receipt.
                    </p>
                  </div>
                </div>

                {/* 4. Taxes & Fees Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-sky-400" />
                      <span>SaaS Platform Taxes & Flat Fees</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Set state business taxation and platform flat processing
                      fee percentages.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                        className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-800">
                  <button
                    id="save-restaurant-settings-btn"
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save All Restaurant Settings</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CATEGORY DIALOG MODAL LAYOUT */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-neutral-850 p-4 border-b border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
              <span>
                {editingCatId ? "Edit Food Category" : "Create Food Category"}
              </span>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCat} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category Name
                </label>
                <input
                  id="cat-name-modal-input"
                  type="text"
                  required
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="e.g. Handmade Tacos"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-xs text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-4 py-2 rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  id="save-cat-modal-btn"
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs px-4 py-2 rounded-lg cursor-pointer font-bold"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-neutral-850 p-4 border-b border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
              <span>
                {editingItemId ? "Edit Catalog Dish" : "Add Catalog Dish"}
              </span>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none text-neutral-300"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Image URL
                </label>
                <input
                  id="item-image-modal-input"
                  type="text"
                  value={itemForm.image}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, image: e.target.value }))
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl focus:outline-none text-neutral-300"
                >
                  <option value="available">🟢 Available (On Menu)</option>
                  <option value="out_of_stock">
                    🟡 Out of Stock (Disabled but visible)
                  </option>
                  <option value="hidden">🔴 Hidden (Removed entirely)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-4 py-2 rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  id="save-item-modal-btn"
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs px-4 py-2 rounded-lg cursor-pointer font-bold"
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
