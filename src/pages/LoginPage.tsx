import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Eye, EyeOff, Store, ArrowLeft } from "lucide-react";
import hinarokIcon from "../assets/hinarok-app-icon.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);
      console.log("Login response:", response);

      const userData =
        response?.data?.user ||
        JSON.parse(localStorage.getItem("user") || "{}");
      console.log("User role:", userData?.role);

      const queryRestaurantId = new URLSearchParams(location.search).get(
        "restaurant",
      );
      const restaurantId = userData?.restaurantId
        ? typeof userData.restaurantId === "object"
          ? userData.restaurantId._id ||
            userData.restaurantId.id ||
            userData.restaurantId.value ||
            null
          : userData.restaurantId
        : queryRestaurantId;

      if (userData?.role === "admin") {
        navigate("/admin");
      } else if (userData?.role === "restaurant_owner") {
        navigate(
          restaurantId
            ? `/restaurant-dashboard/${restaurantId}`
            : "/restaurant-dashboard",
        );
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#FAF3EA] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-[#E7C7CF]">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[#8C6B76] hover:text-[#33101F] text-xs mb-6 transition-colors font-['Inter','Segoe UI',system-ui,sans-serif]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <img 
            src={hinarokIcon} 
            alt="Hinarok" 
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
            Hinarok Admin Center
          </h2>
          <p className="text-[#8C6B76] text-sm mt-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
            Sign in to manage your restaurant
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 font-['Inter','Segoe UI',system-ui,sans-serif]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#33101F] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6B76]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#FAF3EA] border border-[#E7C7CF] text-[#33101F] rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#C42348] focus:border-transparent transition font-['Inter','Segoe UI',system-ui,sans-serif]"
                placeholder="owner@restaurant.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33101F] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6B76]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#FAF3EA] border border-[#E7C7CF] text-[#33101F] rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#C42348] focus:border-transparent transition font-['Inter','Segoe UI',system-ui,sans-serif]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C6B76] hover:text-[#33101F] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C42348] hover:bg-[#E84C6B] text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Inter','Segoe UI',system-ui,sans-serif]"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}