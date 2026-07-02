import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Building2,
  Store,
  ShoppingBag,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  Smartphone,
  Flame,
  Pizza,
  Heart,
} from "lucide-react";
import AdminDashboard from "./pages/AdminDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import CustomerOrdering from "./pages/CustomerOrdering";
import LoginPage from "./pages/LoginPage";
import Header from "./components/Header";
import { useAuth } from "./context/AuthContext";
import { getActiveRestaurants } from "./store/apiStore";

// Modern Premium Landing Homepage
function LandingPortal() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await getActiveRestaurants();
        setRestaurants(data);
      } catch (error) {
        console.error("Failed to load restaurants:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center space-y-8">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Restaurant Online Ordering</span>
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Discover & Order from
            <span className="block text-indigo-400">Local Kitchens</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Browse restaurants, explore menus, and place orders for pickup.
          </p>
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-16 flex-1 w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700">
            <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No restaurants available yet.</p>
            <p className="text-gray-500 text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant, index) => (
              <div
                key={restaurant.id}
                className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700 hover:border-slate-600 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-500/10 group"
              >
                <Link to={`/restaurant/${restaurant.slug}`} className="block">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={restaurant.coverImage}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Open
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-700">
                        <img
                          src={restaurant.logo}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors">
                          {restaurant.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {restaurant.cuisine || "Local Cuisine"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                      {restaurant.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 text-gray-600">📍</span>
                        {restaurant.address}
                      </span>
                      <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold group-hover:gap-2 transition-all">
                        View Menu
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-gray-500 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>BitePickup © 2026. All rights reserved.</p>
          <div className="flex gap-4 items-center">
            <span className="text-emerald-400/60 text-[10px] uppercase font-mono font-bold tracking-wider">
              SaaS Platform
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 text-[10px] uppercase font-mono font-bold tracking-wider">
              v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Protected Route wrapper
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles?: string[];
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || "")) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <Header />
        <Routes>
          <Route path="/" element={<LandingPortal />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/restaurant/:slug" element={<CustomerOrdering />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant-dashboard/:id?"
            element={
              <ProtectedRoute allowedRoles={["admin", "restaurant_owner"]}>
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
