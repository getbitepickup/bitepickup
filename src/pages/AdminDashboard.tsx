import React, { useState, useEffect } from "react";
import {
  getRestaurants,
  getOrders,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getCurrentRestaurantId,
  setCurrentRestaurantId,
} from "../store/apiStore";
import { userAPI } from "../api/users";
import { Restaurant } from "../types";
import {
  ShieldCheck,
  LayoutDashboard,
  Plus,
  Edit,
  Trash2,
  Globe,
  ToggleLeft,
  ToggleRight,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Eye,
  Settings,
  Heart,
  Database,
  AlertCircle,
  X,
  Check,
  User,
  Mail,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "subscriptions" | "loyalty" | "settings"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const resData = await getRestaurants();
        console.log("Loaded restaurants from API:", resData);
        setRestaurants(resData);

        try {
          const ordersData = await getOrders();
          setOrders(ordersData);
        } catch (orderErr) {
          console.warn("Could not load orders:", orderErr);
          setOrders([]);
        }
      } catch (error: any) {
        console.error("Failed to load data:", error);
        if (error.message?.includes("Authentication")) {
          setAuthError(true);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Form states for Add/Edit Restaurants
  const [showResModal, setShowResModal] = useState(false);
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [resForm, setResForm] = useState({
    name: "",
    description: "",
    phone: "",
    address: "",
    logo: "",
    coverImage: "",
    isActive: true,
  });

  // Owner form state
  const [ownerForm, setOwnerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [createSuccess, setCreateSuccess] = useState<{
    message: string;
    credentials?: any;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Automatically slugify name for visual subdomain preview
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  const simulatedSubdomain = resForm.name
    ? `${slugify(resForm.name)}.platform.com`
    : "restaurantname.platform.com";

  // Generate random password
  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOwnerForm((prev) => ({ ...prev, password }));
  };

  const normalizeIdValue = (value: unknown) => {
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

  const findOwnerForRestaurant = (restaurant: Restaurant, owners: any[]) => {
    const restaurantId = normalizeIdValue(
      restaurant.id || (restaurant as any)._id,
    );
    const restaurantSlug = restaurant.slug;
    const restaurantSubdomain = restaurant.subdomain;
    const createdBy = (restaurant as any).createdBy;
    const createdById = normalizeIdValue(createdBy);

    return owners.find((candidate: any) => {
      const candidateId = normalizeIdValue(candidate?._id || candidate?.id);
      const ownerRestaurantId = normalizeIdValue(candidate?.restaurantId);
      const ownerRestaurantObjectId = normalizeIdValue(
        candidate?.restaurantId && typeof candidate.restaurantId === "object"
          ? candidate.restaurantId._id ||
              candidate.restaurantId.id ||
              candidate.restaurantId.value
          : null,
      );

      return (
        candidateId === createdById ||
        ownerRestaurantId === restaurantId ||
        ownerRestaurantObjectId === restaurantId ||
        ownerRestaurantId === restaurantSlug ||
        ownerRestaurantId === restaurantSubdomain ||
        ownerRestaurantObjectId === restaurantSlug ||
        ownerRestaurantObjectId === restaurantSubdomain
      );
    });
  };

  const handleOpenAddRes = () => {
    setEditingResId(null);
    setIsEditingMode(false);
    setResForm({
      name: "",
      description: "",
      phone: "",
      address: "",
      logo: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=100&auto=format&fit=crop&q=60",
      coverImage:
        "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&auto=format&fit=crop&q=80",
      isActive: true,
    });
    setOwnerForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    });
    setCreateSuccess(null);
    setErrorMessage(null);
    setShowResModal(true);
  };

  const handleOpenEditRes = async (res: Restaurant) => {
    setEditingResId(res.id);
    setIsEditingMode(true);
    setResForm({
      name: res.name,
      description: res.description,
      phone: res.phone,
      address: res.address,
      logo: res.logo,
      coverImage: res.coverImage,
      isActive: res.isActive,
    });

    try {
      const usersResponse = await userAPI.getAll({
        role: "restaurant_owner",
        limit: 100,
      });
      const owners = Array.isArray(usersResponse?.data)
        ? usersResponse.data
        : [];
      const owner = findOwnerForRestaurant(res, owners);

      setOwnerForm({
        firstName: owner?.firstName || "Restaurant",
        lastName: owner?.lastName || "Owner",
        email: owner?.email || `owner@${res.slug}.com`,
        phone: owner?.phone || res.phone,
        password: "••••••••",
      });
    } catch (ownerErr) {
      console.warn("Could not load owner info for edit modal:", ownerErr);
      setOwnerForm({
        firstName: "Restaurant",
        lastName: "Owner",
        email: `owner@${res.slug}.com`,
        phone: res.phone,
        password: "••••••••",
      });
    }

    setCreateSuccess(null);
    setErrorMessage(null);
    setShowResModal(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.name.trim()) {
      setErrorMessage("Restaurant name is required");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const resSlug = slugify(resForm.name);
    const domain = `${resSlug}.platform.com`;

    const dataPayload: any = {
      name: resForm.name.trim(),
      description: resForm.description.trim(),
      phone: resForm.phone.trim(),
      address: resForm.address.trim(),
      logo: resForm.logo.trim(),
      coverImage: resForm.coverImage.trim(),
      isActive: resForm.isActive,
    };

    if (editingResId) {
      try {
        await updateRestaurant(editingResId, dataPayload);
        const resData = await getRestaurants();
        setRestaurants(resData);
        setShowResModal(false);
        alert("Restaurant updated successfully!");
      } catch (error: any) {
        console.error("Failed to update restaurant:", error);
        setErrorMessage(
          error.message || "Failed to update restaurant. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (
        !ownerForm.email ||
        !ownerForm.password ||
        !ownerForm.firstName ||
        !ownerForm.lastName ||
        !ownerForm.phone
      ) {
        setErrorMessage("Please fill in all owner details");
        setIsSubmitting(false);
        return;
      }

      const ownerData = {
        ownerEmail: ownerForm.email.trim(),
        ownerPassword: ownerForm.password.trim(),
        ownerFirstName: ownerForm.firstName.trim(),
        ownerLastName: ownerForm.lastName.trim(),
        ownerPhone: ownerForm.phone.trim(),
      };

      try {
        const response = await addRestaurant({ ...dataPayload, ...ownerData });
        console.log("Add restaurant response:", response);

        let credentials = null;

        if (response && response.credentials) {
          credentials = response.credentials;
        } else if (response && response.data && response.data.credentials) {
          credentials = response.data.credentials;
        }

        if (credentials) {
          setCreateSuccess({
            message: "✅ Restaurant and owner account created successfully!",
            credentials: credentials,
          });

          const resData = await getRestaurants();
          setRestaurants(resData);

          setResForm({
            name: "",
            description: "",
            phone: "",
            address: "",
            logo: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=100&auto=format&fit=crop&q=60",
            coverImage:
              "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&auto=format&fit=crop&q=80",
            isActive: true,
          });
          setOwnerForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
          });
        } else {
          const resData = await getRestaurants();
          setRestaurants(resData);
          setShowResModal(false);
          alert("✅ Restaurant created successfully!");
        }
      } catch (error: any) {
        console.error("Failed to create restaurant:", error);
        setErrorMessage(
          error.message || "Failed to create restaurant. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (
      window.confirm(
        "Are you absolutely sure you want to remove this restaurant? This will also delete the owner account and all associated data.",
      )
    ) {
      try {
        await deleteRestaurant(id);
        const resData = await getRestaurants();
        setRestaurants(resData);
        alert("Restaurant deleted successfully!");
      } catch (error) {
        console.error("Failed to delete restaurant:", error);
        alert("Failed to delete restaurant. Please try again.");
      }
    }
  };

  const handleToggleActive = async (res: Restaurant) => {
    try {
      await updateRestaurant(res.id, { ...res, isActive: !res.isActive });
      const resData = await getRestaurants();
      setRestaurants(resData);
    } catch (error) {
      console.error("Failed to toggle restaurant status:", error);
      alert("Failed to update restaurant status. Please try again.");
    }
  };

  const handleCloseSuccess = () => {
    setCreateSuccess(null);
    setShowResModal(false);
  };

  const totalRestaurants = restaurants.length;
  const activeRestaurants = restaurants.filter((r) => r.isActive).length;
  const cumulativeOrdersValue = orders.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg border border-gray-200">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Please log out and log back in to refresh your session.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/#/login";
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      {/* Premium Header Brand Banner */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  Platform Owner Center
                </h1>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest">
                  SaaS ROOT
                </span>
              </div>
              <p className="text-xs text-gray-550 mt-0.5">
                Scale restaurants, oversee cumulative transacting volume,
                configure onboarding tiers.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              id="add-restaurant-btn"
              onClick={handleOpenAddRes}
              className="bg-indigo-600 hover:bg-indigo-700 active:translate-y-px text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer text-center"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Restaurant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Toggles Structure Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Overview & Stores", badge: null },
            { id: "subscriptions", label: "Subscription Tiers", badge: "Soon" },
            { id: "loyalty", label: "Loyalty Programs", badge: "Soon" },
            {
              id: "settings",
              label: "Global Configurations",
              badge: "Roadmap",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200 scale-95 uppercase tracking-tight">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <AnimatePresence mode="wait">
          {/* TAB 1: OVERVIEW & STORES MANAGEMENT */}
          {activeTab === "overview" && (
            <motion.div
              key="overview-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Metric Card Strips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Count Restaurants */}
                <div className="bg-white border border-gray-250 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Total Restaurants
                    </span>
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-gray-950 mt-1.5">
                    {totalRestaurants}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Succeeding sub-domains
                  </p>
                </div>

                {/* Active Restaurants */}
                <div className="bg-white border border-gray-250 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 font-medium">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Active Outlets
                    </span>
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-950 mt-1.5">
                    {activeRestaurants}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Live customer channels
                  </p>
                </div>

                {/* Total order counts placed */}
                <div className="bg-white border border-gray-250 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Cumulative Orders
                    </span>
                    <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-gray-950 mt-1.5">
                    {orders.length}
                  </div>
                  <p className="text-[10px] text-gray-550 mt-1">
                    Continuous live intake
                  </p>
                </div>

                {/* Monthly Platform Revenue estimate */}
                <div className="bg-white border border-gray-250 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Monthly SaaS Revenue
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-gray-950 mt-1.5">
                    $0.00
                  </div>
                  <p className="text-[10px] text-gray-550 mt-1">Coming soon</p>
                </div>
              </div>

              {/* Main table and directory list of onboarded stores */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-gray-150 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Onboarded Outlets Directory
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Control active stores, login routes, or provision menus.
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-150">
                    {restaurants.length} Registered Stores
                  </span>
                </div>

                {/* Grid list or sleek table of stores */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-150">
                      <tr>
                        <th className="px-6 py-4">Restaurant Brand</th>
                        <th className="px-6 py-4">Dynamic Subdomain mapping</th>
                        <th className="px-6 py-4">Address & Phone</th>
                        <th className="px-6 py-4">Live Status</th>
                        <th className="px-6 py-4 text-right">
                          Coordinate Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {restaurants.map((res) => (
                        <tr key={res.id} className="hover:bg-gray-50/50">
                          {/* Logo title */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-150 border border-gray-200 overflow-hidden flex-shrink-0">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={res.logo}
                                  alt={res.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-905">
                                  {res.name}
                                </h4>
                                <span className="text-[10px] text-gray-405 font-mono">
                                  ID: {res.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Subdomain */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-mono text-[10px]">
                              <Globe className="w-3 h-3 text-indigo-400" />
                              {res.subdomain}
                            </span>
                          </td>

                          {/* Address & contact details */}
                          <td className="px-6 py-4 space-y-0.5">
                            <div className="flex items-center gap-1 font-medium text-gray-805">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{res.phone}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-405 text-[11px]">
                              <MapPin className="w-3 h-3 text-gray-405" />
                              <span className="truncate max-w-[200px]">
                                {res.address}
                              </span>
                            </div>
                          </td>

                          {/* Toggle Active status */}
                          <td className="px-6 py-4">
                            <button
                              id={`toggle-status-btn-${res.id}`}
                              onClick={() => handleToggleActive(res)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                                res.isActive
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                              title={
                                res.isActive
                                  ? "Suspend store online sales"
                                  : "Open store online sales"
                              }
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${res.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                              />
                              <span>
                                {res.isActive ? "Active" : "Inactive"}
                              </span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Open storefront Link */}
                              <button
                                onClick={() => {
                                  setCurrentRestaurantId(res.id);
                                  navigate(`/restaurant/${res.slug}`);
                                }}
                                className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                title="Browse Customer storefront"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Onboard kitchen selection */}
                              <button
                                onClick={() => {
                                  setCurrentRestaurantId(res.id);
                                  navigate("/restaurant-dashboard");
                                }}
                                className="text-gray-400 hover:text-amber-500 transition-colors p-1"
                                title="Open Kitchen Portal"
                              >
                                <Settings className="w-4 h-4" />
                              </button>

                              {/* Edit details */}
                              <button
                                id={`edit-restaurant-${res.id}`}
                                onClick={() => handleOpenEditRes(res)}
                                className="text-gray-400 hover:text-gray-900 transition-colors p-1"
                                title="Edit Onboarding Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete store */}
                              <button
                                id={`delete-restaurant-${res.id}`}
                                onClick={() => handleDeleteRestaurant(res.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="De-provision restaurant completely"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {restaurants.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-12 text-gray-400"
                          >
                            No restaurants created yet. Click "Provision
                            Restaurant" to add one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SUBSCRIPTION PLANS (SaaS UI Only placeholder) */}
          {activeTab === "subscriptions" && (
            <motion.div
              key="subscriptions-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-gray-150 pb-3">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Merchant Subscription Plans
                  </h3>
                  <p className="text-xs text-gray-400">
                    Recurring cash bundles collected monthly from platform
                    businesses.
                  </p>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full border border-amber-250 font-bold uppercase">
                        Prototype Preview
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
                      This subscription tiers panel manages recurring automated
                      payouts and platform commissions. This is a visual-only
                      mockup demonstrating future SaaS capabilities—all payment
                      actions and real-time processing are disabled.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Tier 1 */}
                  <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50 opacity-75 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                        Starter Tier
                      </span>
                      <h4 className="text-lg font-bold text-gray-800 mt-1">
                        Single Outlet
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Perfect for local boutique artisan cafes.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-150">
                      <div className="text-xl font-black text-gray-650">
                        $49
                        <span className="text-xs text-gray-400 font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-gray-500 mt-1">
                        Included: 1 store slot, 2% order commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-gray-100 text-gray-400 border border-gray-200 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="border border-gray-250 opacity-90 rounded-xl p-5 space-y-4 bg-white shadow-xs flex flex-col justify-between relative">
                    <span className="absolute top-2.5 right-2.5 bg-gray-100 text-gray-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">
                        Growth Plan
                      </span>
                      <h4 className="text-lg font-bold text-gray-900 mt-1">
                        Pro Multi-Outlet
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Designed for scaling fast casual concepts.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-150">
                      <div className="text-xl font-black text-indigo-600">
                        $99
                        <span className="text-xs text-gray-400 font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-gray-500 mt-1">
                        Included: Up to 5 stores, 1% commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-gray-100 text-gray-400 border border-gray-200 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50 opacity-75 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                        Enterprise
                      </span>
                      <h4 className="text-lg font-bold text-gray-800 mt-1">
                        Franchise Collective
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Unlimited scale for continental restaurant chains.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-150">
                      <div className="text-xl font-black text-gray-650">
                        $249
                        <span className="text-xs text-gray-400 font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-gray-500 mt-1">
                        Included: Unlimited stores, 0% platform commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-gray-100 text-gray-400 border border-gray-200 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: LOYALTY PROGRAMS (SaaS UI Only placeholder) */}
          {activeTab === "loyalty" && (
            <motion.div
              key="loyalty-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white border border-gray-250 p-6 sm:p-8 rounded-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-rose-50 text-rose-400 p-3 rounded-full flex-shrink-0 border border-rose-100">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Sub-Merchant Loyalty Programs
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Let merchants activate customizable spin wheel or punch
                      card strategies.
                    </p>
                  </div>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full border border-amber-250 font-bold uppercase">
                        Prototype Preview
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
                      Customizable loyalty spin wheels, user points punch cards,
                      and target reward engines are part of the future feature
                      roadmap. Merchants will be able to opt in and configure
                      reward redemption thresholds. No logic has been built for
                      this placeholder module.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-150 relative overflow-hidden">
                  <div className="space-y-4 filter blur-[1px] select-none pointer-events-none opacity-40">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-transparent">
                    <span className="bg-amber-150 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-250 bg-amber-100 shadow-sm">
                      Coming Soon
                    </span>
                    <p className="text-xs text-gray-500 font-semibold">
                      Interactive Points & Customer Rewards Admin Panel is
                      locked.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: PLATFORM CONFIGURATION SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="settings-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="bg-white border border-gray-250 rounded-2xl p-6 space-y-6 text-xs font-semibold">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-bold text-gray-900 text-sm">
                    System Parameters
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configure core web triggers, platform logo descriptors, and
                    API connections.
                  </p>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full border border-indigo-200 font-bold uppercase font-mono">
                        MVP ROOT LOCKED
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
                      Global platform-wide brand variables, custom SMTP hosts,
                      and commission settlements are configured at the sandbox
                      environment layer—making adjustments here is locked during
                      front-end deployment.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 opacity-60">
                  <div>
                    <label className="block text-gray-700 mb-1">
                      Global Platform Branding Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Platform.com Online Order SaaS"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">
                      Master Settlement Commission fee (%)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="2.00 %"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MERCHANDISING DIALOG PROVISION MODAL AREA */}
      {showResModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-8">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-150 flex justify-between items-center text-sm font-bold text-gray-905">
              <span>
                {editingResId
                  ? "Edit Restaurant Parameters"
                  : "Onboard New Restaurant"}
              </span>
              <button
                onClick={() => {
                  setShowResModal(false);
                  setCreateSuccess(null);
                  setErrorMessage(null);
                }}
                className="text-gray-400 hover:text-gray-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createSuccess ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <Check className="w-5 h-5" />
                    {createSuccess.message}
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Owner Credentials
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-semibold text-gray-600">
                        Email:
                      </span>{" "}
                      <span className="font-mono text-indigo-700">
                        {createSuccess.credentials?.email}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-600">
                        Password:
                      </span>{" "}
                      <span className="font-mono text-indigo-700">
                        {createSuccess.credentials?.password}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-600">
                        Login URL:
                      </span>{" "}
                      <span className="font-mono text-indigo-700">
                        {createSuccess.credentials?.loginUrl}
                      </span>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    ⚠️ Save these credentials now. The password won't be shown
                    again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseSuccess}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setCreateSuccess(null);
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSaveRestaurant}
                className="p-5 space-y-4 text-xs font-medium max-h-[70vh] overflow-y-auto"
              >
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-gray-750 mb-1 font-bold">
                    Restaurant Operational Name
                  </label>
                  <input
                    id="res-name-modal-input"
                    type="text"
                    required
                    value={resForm.name}
                    onChange={(e) =>
                      setResForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Taco Stand"
                    className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Real-time reactive subdomain generator feedback panel */}
                <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 text-indigo-805">
                  <span className="block font-bold text-[10px] uppercase tracking-wider text-indigo-700">
                    Simulated Store URL mapping:
                  </span>
                  <span
                    id="subdomain-preview-badge"
                    className="block text-xs font-mono font-bold mt-1 text-indigo-809 truncate"
                  >
                    https://{simulatedSubdomain}
                  </span>
                </div>

                <div>
                  <label className="block text-gray-750 mb-1 font-bold">
                    Description Promo Caption
                  </label>
                  <textarea
                    id="res-desc-modal-textarea"
                    value={resForm.description}
                    onChange={(e) =>
                      setResForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="e.g. Spicy street tacos served with slow-cooked carnitas..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-750 mb-1 font-bold">
                      Store Phone Channel
                    </label>
                    <input
                      id="res-phone-modal-input"
                      type="text"
                      required
                      value={resForm.phone}
                      onChange={(e) =>
                        setResForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+1 (555) 123-1122"
                      className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-750 mb-1 font-bold">
                      Counter Address Coordinates
                    </label>
                    <input
                      id="res-address-modal-input"
                      type="text"
                      required
                      value={resForm.address}
                      onChange={(e) =>
                        setResForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="789 Taco Boulevard"
                      className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-750 mb-1 font-bold">
                      Square Logo picture (URL)
                    </label>
                    <input
                      id="res-logo-modal-input"
                      type="text"
                      value={resForm.logo}
                      onChange={(e) =>
                        setResForm((prev) => ({
                          ...prev,
                          logo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-750 mb-1 font-bold">
                      Cover Banner (URL)
                    </label>
                    <input
                      id="res-cover-modal-input"
                      type="text"
                      value={resForm.coverImage}
                      onChange={(e) =>
                        setResForm((prev) => ({
                          ...prev,
                          coverImage: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="res-active-modal-checkbox"
                    type="checkbox"
                    checked={resForm.isActive}
                    onChange={(e) =>
                      setResForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                    Immediately open for public customer sales
                  </label>
                </div>

                {/* Owner Account Section */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    {isEditingMode
                      ? "Owner Information (View Only)"
                      : "Restaurant Owner Account"}
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-750 mb-1 font-bold text-[10px] uppercase tracking-wider">
                        Owner First Name
                      </label>
                      <input
                        id="owner-firstname-modal-input"
                        type="text"
                        required={!isEditingMode}
                        value={ownerForm.firstName}
                        onChange={(e) =>
                          setOwnerForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        placeholder="John"
                        disabled={isEditingMode}
                        className={`w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none text-sm ${isEditingMode ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-750 mb-1 font-bold text-[10px] uppercase tracking-wider">
                        Owner Last Name
                      </label>
                      <input
                        id="owner-lastname-modal-input"
                        type="text"
                        required={!isEditingMode}
                        value={ownerForm.lastName}
                        onChange={(e) =>
                          setOwnerForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        placeholder="Doe"
                        disabled={isEditingMode}
                        className={`w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none text-sm ${isEditingMode ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-gray-750 mb-1 font-bold text-[10px] uppercase tracking-wider">
                        Owner Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          id="owner-email-modal-input"
                          type="email"
                          required={!isEditingMode}
                          value={ownerForm.email}
                          onChange={(e) =>
                            setOwnerForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="owner@restaurant.com"
                          disabled={isEditingMode}
                          className={`w-full px-8 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none text-sm ${isEditingMode ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-750 mb-1 font-bold text-[10px] uppercase tracking-wider">
                        Owner Phone
                      </label>
                      <input
                        id="owner-phone-modal-input"
                        type="text"
                        required={!isEditingMode}
                        value={ownerForm.phone}
                        onChange={(e) =>
                          setOwnerForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+1 (555) 000-0000"
                        disabled={isEditingMode}
                        className={`w-full px-3 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none text-sm ${isEditingMode ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-gray-750 mb-1 font-bold text-[10px] uppercase tracking-wider">
                      Owner Password
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          id="owner-password-modal-input"
                          type="text"
                          required={!isEditingMode}
                          value={ownerForm.password}
                          onChange={(e) =>
                            setOwnerForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder={
                            isEditingMode
                              ? "•••••••• (Masked)"
                              : "Auto-generated or custom password"
                          }
                          disabled={isEditingMode}
                          className={`w-full px-8 py-2 border border-gray-200 focus:border-indigo-600 rounded-xl focus:outline-none text-sm font-mono ${isEditingMode ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                        />
                      </div>
                      {!isEditingMode && (
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold whitespace-nowrap"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {isEditingMode
                        ? "Password is masked for security. To change, contact the restaurant owner directly."
                        : "Give this password to the restaurant owner for login"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResModal(false);
                      setCreateSuccess(null);
                      setErrorMessage(null);
                    }}
                    className="bg-gray-100 hover:bg-gray-250 text-gray-600 px-4 py-2 rounded-lg cursor-pointer font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-res-modal-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer font-bold ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : editingResId
                        ? "Save Changes"
                        : "Provision Merchant"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
