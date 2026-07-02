import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShoppingBag, Store, Shield, Sparkles, ArrowRight, 
  Clock, CreditCard, CheckCircle, Utensils, Heart, 
  Zap, Globe, Phone, MapPin 
} from 'lucide-react';
import { getActiveRestaurants } from '../store/apiStore';

export default function LandingPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await getActiveRestaurants();
        setRestaurants(data);
      } catch (error) {
        console.error('Failed to load restaurants:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Restaurant Online Ordering Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Streamlined Ordering for
              <span className="block text-indigo-300">Local Kitchens</span>
            </h1>
            
            <p className="text-lg text-indigo-200 max-w-2xl mx-auto mb-10">
              BitePickup connects hungry customers with local restaurants. 
              Place orders, track in real-time, and enjoy seamless pickup experiences.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-900 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to={restaurants.length > 0 ? `/restaurant/${restaurants[0]?.slug}` : '#'}
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                Browse Menus
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Order Online
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              BitePickup makes it easy for customers to order from their favorite local restaurants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Utensils className="w-8 h-8" />,
                title: 'Browse Menus',
                description: 'Explore full menus with categories, descriptions, and prices from local restaurants.'
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: 'Order & Track',
                description: 'Place orders for pickup and track your order status in real-time.'
              },
              {
                icon: <CreditCard className="w-8 h-8" />,
                title: 'Secure Payments',
                description: 'Pay online or at pickup with multiple payment options available.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="bg-indigo-50 text-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Restaurants Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Partner Restaurants
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover delicious food from our partner restaurants
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No restaurants available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={restaurant.coverImage}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={restaurant.logo}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                        <p className="text-xs text-gray-500">{restaurant.cuisine || 'Local Cuisine'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {restaurant.description}
                    </p>
                    <Link
                      to={`/restaurant/${restaurant.slug}`}
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      View Menu
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 rounded-lg p-1.5">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">BitePickup</span>
            </div>
            <p className="text-sm">© 2026 BitePickup. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-sm hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-sm hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-sm hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}