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
  Key,
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
    newPassword: "",
    confirmNewPassword: "",
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
    ? `${slugify(resForm.name)}.hinarok.com`
    : "restaurantname.hinarok.com";

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
      newPassword: "",
      confirmNewPassword: "",
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
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (ownerErr) {
      console.warn("Could not load owner info for edit modal:", ownerErr);
      setOwnerForm({
        firstName: "Restaurant",
        lastName: "Owner",
        email: `owner@${res.slug}.com`,
        phone: res.phone,
        password: "••••••••",
        newPassword: "",
        confirmNewPassword: "",
      });
    }

    setCreateSuccess(null);
    setErrorMessage(null);
    setShowResModal(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!resForm.name.trim()) {
      setErrorMessage("Restaurant name is required");
      return;
    }
    setIsSubmitting(true);

    const resSlug = slugify(resForm.name);
    const subdomain = `${resSlug}.hinarok.com`;

    const dataPayload: any = {
      name: resForm.name.trim(),
      description: resForm.description.trim(),
      phone: resForm.phone.trim(),
      address: resForm.address.trim(),
      logo: resForm.logo.trim(),
      coverImage: resForm.coverImage.trim(),
      isActive: resForm.isActive,
      slug: resSlug,
      subdomain: subdomain,
    };

    // Include password change if provided
    if (ownerForm.newPassword && ownerForm.newPassword === ownerForm.confirmNewPassword) {
      dataPayload.ownerPassword = ownerForm.newPassword;
    }

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

          // Refresh restaurants and UPDATE the subdomain display
          const resData = await getRestaurants();
          // Fix the subdomain display for the newly created restaurant
          const updatedResData = resData.map((r: any) => {
            // If the restaurant has the old .platform.com subdomain, update it for display
            if (r.subdomain && r.subdomain.includes('.platform.com')) {
              const slug = r.slug || slugify(r.name);
              return { ...r, subdomain: `${slug}.hinarok.com` };
            }
            return r;
          });
          setRestaurants(updatedResData);

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
            newPassword: "",
            confirmNewPassword: "",
          });
        } else {
          const resData = await getRestaurants();
          const updatedResData = resData.map((r: any) => {
            if (r.subdomain && r.subdomain.includes('.platform.com')) {
              const slug = r.slug || slugify(r.name);
              return { ...r, subdomain: `${slug}.hinarok.com` };
            }
            return r;
          });
          setRestaurants(updatedResData);
          setShowResModal(false);
          alert("✅ Restaurant created successfully!");
        }
      } catch (error: any) {
        console.error("Failed to create restaurant:", error);
        // Show the error message in the UI
        if (error.message && error.message.includes('email already registered')) {
          setErrorMessage("This email is already registered. Please use a different email address.");
        } else if (error.message && error.message.includes('subdomain already exists')) {
          setErrorMessage("A restaurant with this name already exists. Please use a different name.");
        } else {
          setErrorMessage(error.message || "Failed to create restaurant. Please try again.");
        }
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
      <div className="min-h-screen bg-[#FAF3EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C42348]"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg border border-[#E7C7CF]">
          <AlertCircle className="w-16 h-16 text-[#C42348] mx-auto mb-4" />
          <h2 className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] mb-2">
            Authentication Error
          </h2>
          <p className="text-[#8C6B76] text-sm mb-4 font-['Inter','Segoe UI',system-ui,sans-serif]">
            Please log out and log back in to refresh your session.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/#/login";
            }}
            className="bg-[#C42348] hover:bg-[#E84C6B] text-white px-6 py-2 rounded-xl font-semibold transition-all font-['Inter','Segoe UI',system-ui,sans-serif]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif] pb-12">
      {/* Premium Header Brand Banner */}
      <div className="bg-white border-b border-[#E7C7CF] py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#C42348] p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] tracking-tight">
                  Hinarok Admin Center
                </h1>
                <span className="text-[10px] font-bold bg-[#C42348]/10 text-[#C42348] px-2 py-0.5 rounded-full border border-[#C42348]/20 uppercase tracking-widest font-['Inter','Segoe UI',system-ui,sans-serif]">
                  SaaS ROOT
                </span>
              </div>
              <p className="text-xs text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                Scale restaurants, oversee cumulative transacting volume,
                configure onboarding tiers.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              id="add-restaurant-btn"
              onClick={handleOpenAddRes}
              className="bg-[#C42348] hover:bg-[#E84C6B] active:translate-y-px text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer text-center font-['Inter','Segoe UI',system-ui,sans-serif]"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Restaurant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Toggles Structure Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex border-b border-[#E7C7CF] overflow-x-auto scrollbar-none">
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
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 font-['Inter','Segoe UI',system-ui,sans-serif] ${
                activeTab === tab.id
                  ? "border-[#C42348] text-[#C42348]"
                  : "border-transparent text-[#8C6B76] hover:text-[#33101F]"
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
                <div className="bg-white border border-[#E7C7CF] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-[#8C6B76]">
                    <span className="text-xs font-bold uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Total Restaurants
                    </span>
                    <Globe className="w-4 h-4 text-[#8C6B76]" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#33101F] mt-1.5 font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    {totalRestaurants}
                  </div>
                  <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Succeeding sub-domains
                  </p>
                </div>

                {/* Active Restaurants */}
                <div className="bg-white border border-[#E7C7CF] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-[#8C6B76] font-medium">
                    <span className="text-xs font-bold uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Active Outlets
                    </span>
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#33101F] mt-1.5 font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    {activeRestaurants}
                  </div>
                  <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Live customer channels
                  </p>
                </div>

                {/* Total order counts placed */}
                <div className="bg-white border border-[#E7C7CF] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-[#8C6B76]">
                    <span className="text-xs font-bold uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Cumulative Orders
                    </span>
                    <ShoppingBag className="w-4 h-4 text-[#C42348]" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#33101F] mt-1.5 font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    {orders.length}
                  </div>
                  <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Continuous live intake
                  </p>
                </div>

                {/* Monthly Platform Revenue estimate */}
                <div className="bg-white border border-[#E7C7CF] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-[#8C6B76]">
                    <span className="text-xs font-bold uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Monthly SaaS Revenue
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#33101F] mt-1.5 font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    $0.00
                  </div>
                  <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Coming soon
                  </p>
                </div>
              </div>

              {/* Main table and directory list of onboarded stores */}
              <div className="bg-white border border-[#E7C7CF] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-[#E7C7CF] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                      Onboarded Outlets Directory
                    </h3>
                    <p className="text-xs text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Control active stores, login routes, or provision menus.
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-[#FAF3EA] text-[#8C6B76] px-3 py-1 rounded-full border border-[#E7C7CF] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    {restaurants.length} Registered Stores
                  </span>
                </div>

                {/* Grid list or sleek table of stores */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <thead className="bg-[#FAF3EA] text-[10px] font-bold uppercase tracking-wider text-[#8C6B76] border-b border-[#E7C7CF]">
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
                    <tbody className="divide-y divide-[#E7C7CF] font-medium">
                      {restaurants.map((res) => (
                        <tr key={res.id} className="hover:bg-[#FAF3EA]/50">
                          {/* Logo title */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#FAF3EA] border border-[#E7C7CF] overflow-hidden flex-shrink-0">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={res.logo}
                                  alt={res.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-[#33101F] font-['Baloo_2','Trebuchet_MS',sans-serif]">
                                  {res.name}
                                </h4>
                                <span className="text-[10px] text-[#8C6B76] font-mono">
                                  ID: {res.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Subdomain */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 bg-[#C42348]/10 text-[#C42348] px-2 py-0.5 rounded border border-[#C42348]/20 font-mono text-[10px]">
                              <Globe className="w-3 h-3 text-[#C42348]" />
                              {res.subdomain}
                            </span>
                          </td>

                          {/* Address & contact details */}
                          <td className="px-6 py-4 space-y-0.5">
                            <div className="flex items-center gap-1 font-medium text-[#33101F]">
                              <Phone className="w-3 h-3 text-[#8C6B76]" />
                              <span>{res.phone}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[#8C6B76] text-[11px]">
                              <MapPin className="w-3 h-3 text-[#8C6B76]" />
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
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif] ${
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
                              {/* Open storefront Link - Use subdomain or slug */}
                              <a
                                href={res.subdomain ? `https://${res.subdomain}` : `/restaurant/${res.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8C6B76] hover:text-[#C42348] transition-colors p-1"
                                title="Browse Customer storefront"
                              >
                                <Eye className="w-4 h-4" />
                              </a>

                              {/* Onboard kitchen selection */}
                              <button
                                onClick={() => {
                                  setCurrentRestaurantId(res.id);
                                  navigate("/restaurant-dashboard");
                                }}
                                className="text-[#8C6B76] hover:text-[#E8A13B] transition-colors p-1"
                                title="Open Kitchen Portal"
                              >
                                <Settings className="w-4 h-4" />
                              </button>

                              {/* Edit details */}
                              <button
                                id={`edit-restaurant-${res.id}`}
                                onClick={() => handleOpenEditRes(res)}
                                className="text-[#8C6B76] hover:text-[#33101F] transition-colors p-1"
                                title="Edit Onboarding Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete store */}
                              <button
                                id={`delete-restaurant-${res.id}`}
                                onClick={() => handleDeleteRestaurant(res.id)}
                                className="text-[#8C6B76] hover:text-[#C42348] transition-colors p-1"
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
                            className="text-center py-12 text-[#8C6B76]"
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
              <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-[#E7C7CF] pb-3">
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                    Merchant Subscription Plans
                  </h3>
                  <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Recurring cash bundles collected monthly from platform
                    businesses.
                  </p>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full border border-amber-250 font-bold uppercase">
                        Prototype Preview
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
                      This subscription tiers panel manages recurring automated
                      payouts and platform commissions. This is a visual-only
                      mockup demonstrating future SaaS capabilities—all payment
                      actions and real-time processing are disabled.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Tier 1 */}
                  <div className="border border-[#E7C7CF] rounded-xl p-5 space-y-4 bg-[#FAF3EA]/50 opacity-75 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-[#8C6B76] uppercase font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Starter Tier
                      </span>
                      <h4 className="text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] mt-1">
                        Single Outlet
                      </h4>
                      <p className="text-[11px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Perfect for local boutique artisan cafes.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-[#E7C7CF]">
                      <div className="text-xl font-black text-[#33101F]">
                        $49
                        <span className="text-xs text-[#8C6B76] font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Included: 1 store slot, 2% order commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-[#FAF3EA] text-[#8C6B76] border border-[#E7C7CF] text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="border border-[#E7C7CF] opacity-90 rounded-xl p-5 space-y-4 bg-white shadow-xs flex flex-col justify-between relative">
                    <span className="absolute top-2.5 right-2.5 bg-[#C42348]/10 text-[#C42348] font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Popular
                    </span>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-[#C42348] uppercase font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Growth Plan
                      </span>
                      <h4 className="text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] mt-1">
                        Pro Multi-Outlet
                      </h4>
                      <p className="text-[11px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Designed for scaling fast casual concepts.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-[#E7C7CF]">
                      <div className="text-xl font-black text-[#C42348]">
                        $99
                        <span className="text-xs text-[#8C6B76] font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Included: Up to 5 stores, 1% commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-[#FAF3EA] text-[#8C6B76] border border-[#E7C7CF] text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="border border-[#E7C7CF] rounded-xl p-5 space-y-4 bg-[#FAF3EA]/50 opacity-75 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-[#8C6B76] uppercase font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Enterprise
                      </span>
                      <h4 className="text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] mt-1">
                        Franchise Collective
                      </h4>
                      <p className="text-[11px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Unlimited scale for continental restaurant chains.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-[#E7C7CF]">
                      <div className="text-xl font-black text-[#33101F]">
                        $249
                        <span className="text-xs text-[#8C6B76] font-medium">
                          /mo
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Included: Unlimited stores, 0% platform commission.
                      </span>
                      <button
                        disabled
                        className="mt-4 w-full bg-[#FAF3EA] text-[#8C6B76] border border-[#E7C7CF] text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
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
              <div className="bg-white border border-[#E7C7CF] p-6 sm:p-8 rounded-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-[#C42348]/10 text-[#C42348] p-3 rounded-full flex-shrink-0 border border-[#C42348]/20">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                      Sub-Merchant Loyalty Programs
                    </h3>
                    <p className="text-xs text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Let merchants activate customizable spin wheel or punch
                      card strategies.
                    </p>
                  </div>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full border border-amber-250 font-bold uppercase">
                        Prototype Preview
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Customizable loyalty spin wheels, user points punch cards,
                      and target reward engines are part of the future feature
                      roadmap. Merchants will be able to opt in and configure
                      reward redemption thresholds. No logic has been built for
                      this placeholder module.
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF3EA] rounded-xl p-6 border border-[#E7C7CF] relative overflow-hidden">
                  <div className="space-y-4 filter blur-[1px] select-none pointer-events-none opacity-40">
                    <div className="h-4 bg-[#E7C7CF] rounded w-1/4"></div>
                    <div className="h-10 bg-[#E7C7CF] rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 bg-[#E7C7CF] rounded"></div>
                      <div className="h-20 bg-[#E7C7CF] rounded"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-transparent">
                    <span className="bg-amber-150 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-250 bg-amber-100 shadow-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Coming Soon
                    </span>
                    <p className="text-xs text-[#8C6B76] font-semibold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
              <div className="bg-white border border-[#E7C7CF] rounded-2xl p-6 space-y-6 text-xs font-semibold">
                <div className="border-b border-[#E7C7CF] pb-2">
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                    System Parameters
                  </h3>
                  <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Configure core web triggers, platform logo descriptors, and
                    API connections.
                  </p>
                </div>

                {/* Coming Soon Alert Indicator */}
                <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span>Planned for Future SaaS Release</span>
                      <span className="bg-[#C42348]/10 text-[#C42348] text-[9px] px-2 py-0.5 rounded-full border border-[#C42348]/20 font-bold uppercase font-mono">
                        MVP ROOT LOCKED
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-1 leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Global platform-wide brand variables, custom SMTP hosts,
                      and commission settlements are configured at the sandbox
                      environment layer—making adjustments here is locked during
                      front-end deployment.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 opacity-60">
                  <div>
                    <label className="block text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Global Platform Branding Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Hinarok Online Order SaaS"
                      className="w-full px-3 py-2 border border-[#E7C7CF] rounded-xl bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Master Settlement Commission fee (%)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="2.00 %"
                      className="w-full px-3 py-2 border border-[#E7C7CF] rounded-xl bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
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
        <div className="fixed inset-0 z-50 bg-[#33101F]/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E7C7CF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FAF3EA] px-5 py-4 border-b border-[#E7C7CF] flex justify-between items-center text-sm font-bold text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                className="text-[#8C6B76] hover:text-[#33101F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createSuccess ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <Check className="w-5 h-5" />
                    {createSuccess.message}
                  </div>
                </div>
                <div className="bg-[#C42348]/10 border border-[#C42348]/20 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-[#C42348] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Owner Credentials
                  </h4>
                  <div className="space-y-1 text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <p>
                      <span className="font-semibold text-[#33101F]">
                        Email:
                      </span>{" "}
                      <span className="font-mono text-[#C42348]">
                        {createSuccess.credentials?.email}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#33101F]">
                        Password:
                      </span>{" "}
                      <span className="font-mono text-[#C42348]">
                        {createSuccess.credentials?.password}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#33101F]">
                        Login URL:
                      </span>{" "}
                      <span className="font-mono text-[#C42348]">
                        {createSuccess.credentials?.loginUrl}
                      </span>
                    </p>
                  </div>
                  <p className="text-[10px] text-[#8C6B76] mt-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    ⚠️ Save these credentials now. The password won't be shown
                    again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseSuccess}
                    className="flex-1 bg-[#C42348] hover:bg-[#E84C6B] text-white px-4 py-2 rounded-lg font-bold text-sm font-['Inter','Segoe UI',system-ui,sans-serif]"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setCreateSuccess(null);
                    }}
                    className="flex-1 bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#33101F] px-4 py-2 rounded-lg font-bold text-sm font-['Inter','Segoe UI',system-ui,sans-serif]"
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                    className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                </div>

                {/* Real-time reactive subdomain generator feedback panel */}
                <div className="bg-[#C42348]/10 border border-[#C42348]/20 rounded-xl p-3">
                  <span className="block font-bold text-[10px] uppercase tracking-wider text-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Simulated Store URL mapping:
                  </span>
                  <span
                    id="subdomain-preview-badge"
                    className="block text-xs font-mono font-bold mt-1 text-[#C42348] truncate"
                  >
                    https://{simulatedSubdomain}
                  </span>
                </div>

                <div>
                  <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                    className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                      className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                      className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                      className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#33101F] mb-1 font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                      className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none font-['Inter','Segoe UI',system-ui,sans-serif]"
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
                    className="w-4 h-4 rounded text-[#C42348] accent-[#C42348]"
                  />
                  <label className="text-[#8C6B76] text-[10px] uppercase font-bold tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Immediately open for public customer sales
                  </label>
                </div>

                {/* Owner Account Section */}
                <div className="border-t border-[#E7C7CF] pt-4 mt-2">
                  <h4 className="text-xs font-bold text-[#33101F] uppercase tracking-wider mb-3 flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <User className="w-3.5 h-3.5" />
                    {isEditingMode
                      ? "Owner Information (View Only)"
                      : "Restaurant Owner Account"}
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                        className={`w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-['Inter','Segoe UI',system-ui,sans-serif] ${isEditingMode ? "bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                        className={`w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-['Inter','Segoe UI',system-ui,sans-serif] ${isEditingMode ? "bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Owner Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C6B76]" />
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
                          className={`w-full px-8 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-['Inter','Segoe UI',system-ui,sans-serif] ${isEditingMode ? "bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed" : ""}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
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
                        className={`w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-['Inter','Segoe UI',system-ui,sans-serif] ${isEditingMode ? "bg-[#FAF3EA] text-[#8C6B76] cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Password Change Section - Admin Only */}
                  {isEditingMode && (
                    <div className="mt-3 border-t border-[#E7C7CF] pt-3">
                      <h5 className="text-xs font-bold text-[#C42348] uppercase tracking-wider mb-2 font-['Inter','Segoe UI',system-ui,sans-serif] flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" />
                        Change Owner Password (Optional)
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                            New Password
                          </label>
                          <input
                            id="owner-new-password-input"
                            type="text"
                            value={ownerForm.newPassword}
                            onChange={(e) =>
                              setOwnerForm((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="Enter new password"
                            className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-mono font-['Inter','Segoe UI',system-ui,sans-serif]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                            Confirm New Password
                          </label>
                          <input
                            id="owner-confirm-password-input"
                            type="text"
                            value={ownerForm.confirmNewPassword}
                            onChange={(e) =>
                              setOwnerForm((prev) => ({
                                ...prev,
                                confirmNewPassword: e.target.value,
                              }))
                            }
                            placeholder="Confirm new password"
                            className="w-full px-3 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-mono font-['Inter','Segoe UI',system-ui,sans-serif]"
                          />
                        </div>
                      </div>
                      {ownerForm.newPassword && ownerForm.confirmNewPassword && ownerForm.newPassword !== ownerForm.confirmNewPassword && (
                        <p className="text-[#C42348] text-[10px] mt-1 font-medium font-['Inter','Segoe UI',system-ui,sans-serif]">
                          Passwords do not match!
                        </p>
                      )}
                      <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Leave blank to keep current password.
                      </p>
                    </div>
                  )}

                  {!isEditingMode && (
                    <div className="mt-2">
                      <label className="block text-[#33101F] mb-1 font-bold text-[10px] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Owner Password
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C6B76]" />
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
                            placeholder="Auto-generated or custom password"
                            className="w-full px-8 py-2 border border-[#E7C7CF] focus:border-[#C42348] rounded-xl focus:outline-none text-sm font-mono font-['Inter','Segoe UI',system-ui,sans-serif]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-3 py-2 bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#33101F] rounded-xl text-xs font-semibold whitespace-nowrap font-['Inter','Segoe UI',system-ui,sans-serif]"
                        >
                          Generate
                        </button>
                      </div>
                      <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Give this password to the restaurant owner for login
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-[#E7C7CF]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResModal(false);
                      setCreateSuccess(null);
                      setErrorMessage(null);
                    }}
                    className="bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#33101F] px-4 py-2 rounded-lg cursor-pointer font-bold font-['Inter','Segoe UI',system-ui,sans-serif]"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-res-modal-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className={`bg-[#C42348] hover:bg-[#E84C6B] text-white px-4 py-2 rounded-lg cursor-pointer font-bold font-['Inter','Segoe UI',system-ui,sans-serif] ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
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