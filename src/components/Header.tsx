import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, User, LogOut, LogIn, Store, Shield, ChevronRight } from 'lucide-react';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRestaurantPage, setIsRestaurantPage] = useState(false);

  useEffect(() => {
    setIsRestaurantPage(location.pathname.startsWith('/restaurant/'));
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white select-none relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-mono text-gray-300 hover:text-white transition-colors">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 uppercase tracking-widest text-[10px]">BitePickup</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 hidden sm:inline">SaaS Platform</span>
        </Link>

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-gray-400 text-[10px] hidden sm:inline">
                {user?.firstName} {user?.lastName}
              </span>
              
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
              
              {user?.role === 'restaurant_owner' && (
                <Link
                  to="/restaurant-dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-600"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-red-400"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all bg-slate-800 text-gray-300 hover:bg-slate-700"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Owner Login</span>
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}