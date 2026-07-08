import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Store,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  Eye,
  Bell,
  Globe,
  CreditCard,
  Heart,
} from "lucide-react";
import AdminDashboard from "./pages/AdminDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import CustomerOrdering from "./pages/CustomerOrdering";
import LoginPage from "./pages/LoginPage";
import Header from "./components/Header";
import { useAuth } from "./context/AuthContext";
import { getActiveRestaurants } from "./store/apiStore";
import logoDark from "./assets/logo-dark.png";
import hinarokAppIcon from "./assets/hinarok-app-icon.png";

// Hinarok Landing Page
function LandingPortal() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Helmet>
        <title>
          Hinarok — Zero-commission pickup ordering for local restaurants
        </title>
        <meta
          name="description"
          content="Hinarok gives restaurants their own online ordering page. Flat monthly price, zero commission, customers pick up."
        />
        <link rel="icon" type="image/png" href={hinarokAppIcon} />
        <link rel="apple-touch-icon" href={hinarokAppIcon} />
      </Helmet>

      <div className="min-h-screen bg-[#FAF3EA] font-['Inter','Segoe UI',system-ui,sans-serif] selection:bg-[#C42348] selection:text-white">
        {/* ======== HERO SECTION ======== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#33101F] via-[#48182C] to-[#33101F] text-white">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute top-10 left-10 w-16 h-16 bg-[#E84C6B] rotate-45 rounded-lg"></div>
            <div className="absolute bottom-20 right-20 w-24 h-24 bg-[#E8A13B] rotate-45 rounded-lg"></div>
            <div className="absolute top-1/3 right-1/4 w-10 h-10 bg-[#E84C6B] rotate-45 rounded-lg"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#E84C6B]/20 border border-[#E84C6B]/30 rounded-full px-4 py-1.5 text-sm font-medium text-[#E8A13B] mb-6">
                  <span className="w-2 h-2 bg-[#E8A13B] rounded-sm rotate-45"></span>
                  Pickup ordering for local restaurants
                </div>

                <h1 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight">
                  Your food. Your customers.
                  <br />
                  <span className="text-[#E8A13B]">Zero</span>{" "}
                  <span className="text-[#E84C6B]">commission.</span>
                </h1>

                <p className="text-[#EDD3DB] text-base sm:text-lg mt-6 max-w-lg leading-relaxed">
                  Delivery apps take up to 30% of every order. Hinarok gives
                  your restaurant its own online ordering page for one flat
                  monthly price — customers order ahead and pick up, and every
                  dollar stays with you.
                </p>

                <div className="flex flex-wrap gap-4 mt-8">
                  <a
                    href="#join"
                    onClick={(e) => scrollToSection(e, "join")}
                    className="inline-flex items-center gap-2 bg-[#C42348] hover:bg-[#E84C6B] text-white font-bold px-8 py-3.5 rounded-full transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-[#C42348]/30"
                  >
                    Get your ordering page
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#how-it-works"
                    onClick={(e) => scrollToSection(e, "how-it-works")}
                    className="inline-flex items-center gap-2 border border-[#6B3448] hover:border-[#EDD3DB] text-white font-medium px-8 py-3.5 rounded-full transition-all"
                  >
                    See how it works
                  </a>
                </div>

                <p className="text-[#C99AA8] text-sm mt-6">
                  Built in Omaha, for Omaha-metro restaurants.
                </p>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="bg-white rounded-[2rem] p-3 shadow-2xl max-w-[280px] w-full transform rotate-2 hover:rotate-3 transition-transform duration-300">
                  <div className="bg-[#FAF3EA] rounded-2xl overflow-hidden">
                    <div className="bg-[#C42348] text-white p-4 flex items-center gap-3">
                      <img
                        src={hinarokAppIcon}
                        alt="Hinarok"
                        className="w-5 h-5 object-contain"
                      />
                      <span className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-lg">
                        Zara's Grill
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#33101F] text-sm">
                            Chicken Shawarma Plate
                          </p>
                          <p className="text-xs text-[#8C6B76]">
                            rice · salad · garlic sauce
                          </p>
                        </div>
                        <span className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
                          $13.99
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#33101F] text-sm">
                            Lamb Kebab Wrap
                          </p>
                          <p className="text-xs text-[#8C6B76]">
                            fresh bread · sumac onions
                          </p>
                        </div>
                        <span className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
                          $11.49
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#33101F] text-sm">
                            Baklava (4 pc)
                          </p>
                          <p className="text-xs text-[#8C6B76]">
                            pistachio · honey
                          </p>
                        </div>
                        <span className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
                          $5.99
                        </span>
                      </div>
                      <div className="bg-[#E8A13B] text-[#33101F] text-center rounded-xl py-3 font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold">
                        Order pickup · ready in 15 min
                      </div>
                      <div className="bg-[#EFF8EE] border border-[#CDE8CB] rounded-xl py-3 px-4 flex items-center gap-2 text-[#2E6B34] text-sm font-semibold">
                        <span className="w-2.5 h-2.5 bg-[#3E9C48] rounded-full"></span>
                        Your order is ready for pickup!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======== PROBLEM / COMPARISON SECTION ======== */}
        <section id="problem" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-[#C42348] font-semibold text-sm uppercase tracking-wider mb-4">
              <span className="w-2 h-2 bg-[#C42348] rounded-sm rotate-45"></span>
              The math
            </div>
            <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-3xl sm:text-4xl text-[#33101F]">
              Third-party apps eat your margin.
              <br />
              Hinarok doesn't.
            </h2>
            <p className="text-[#8C6B76] text-lg mt-4 max-w-2xl">
              On a $1,000 day of online orders, here's what the two models look
              like for your restaurant.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              <div className="bg-[#F3E4E4] border-2 border-dashed border-[#D8A9A9] rounded-2xl p-8">
                <span className="inline-block bg-[#E4C6C6] text-[#7A3B3B] text-xs font-bold uppercase tracking-wider rounded-full px-4 py-1.5 mb-4">
                  Delivery apps
                </span>
                <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] text-xl font-bold text-[#7A3B3B]">
                  Commission model
                </h3>
                <div className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-5xl sm:text-6xl text-[#B04A4A] my-3">
                  −$300
                </div>
                <p className="text-[#7A3B3B]">
                  Up to 30% of every single order goes to the platform —
                  forever. The more you sell, the more you lose.
                </p>
              </div>

              <div className="bg-[#33101F] rounded-2xl p-8">
                <span className="inline-block bg-[#C42348] text-white text-xs font-bold uppercase tracking-wider rounded-full px-4 py-1.5 mb-4">
                  Hinarok
                </span>
                <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] text-xl font-bold text-[#FAF3EA]">
                  Flat subscription
                </h3>
                <div className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-5xl sm:text-6xl text-[#E8A13B] my-3">
                  −$0
                </div>
                <p className="text-[#EDD3DB]">
                  One predictable monthly price. Sell 10 orders or 1,000 — your
                  commission is always zero.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======== HOW IT WORKS ======== */}
        <section id="how-it-works" className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-[#C42348] font-semibold text-sm uppercase tracking-wider mb-4">
              <span className="w-2 h-2 bg-[#C42348] rounded-sm rotate-45"></span>
              How it works
            </div>
            <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-3xl sm:text-4xl text-[#33101F]">
              Live in days, not months
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  number: "1",
                  title: "Set up your menu",
                  description:
                    "We build your branded ordering page with your menu, photos, prices, and pickup hours. You stay in control and can update anything, anytime.",
                },
                {
                  number: "2",
                  title: "Customers order & pay online",
                  description:
                    "Diners order from their phone and pay securely by card. Orders land instantly on your dashboard with clear prep times.",
                },
                {
                  number: "3",
                  title: "They pick up. You keep 100%",
                  description:
                    "No drivers, no cold food, no commission. Customers walk in, grab their order, and the full payment goes to your account.",
                },
              ].map((step, index) => (
                <div
                  key={index}
                  className="bg-[#FAF3EA] rounded-2xl p-8 shadow-sm"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-xl rotate-45 mb-6 ml-1 ${index === 2 ? "bg-[#E8A13B] text-[#33101F]" : "bg-[#C42348] text-white"}`}
                  >
                    <span className="-rotate-45">{step.number}</span>
                  </div>
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-xl text-[#33101F]">
                    {step.title}
                  </h3>
                  <p className="text-[#6E515B] mt-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======== FEATURES SECTION ======== */}
        <section id="features" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#FAF3EA]">
              <div className="flex items-center gap-2 text-[#C42348] font-semibold text-sm uppercase tracking-wider mb-4">
                <span className="w-2 h-2 bg-[#C42348] rounded-sm rotate-45"></span>
                What you get
              </div>
              <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-3xl text-[#33101F]">
                Everything a restaurant needs to sell online
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                {[
                  {
                    icon: <Globe className="w-5 h-5 text-[#C42348]" />,
                    title: "Your own branded page",
                    description:
                      "hinarok.com/your-restaurant — your name, your colors, your menu. Not a listing lost among competitors.",
                  },
                  {
                    icon: <CreditCard className="w-5 h-5 text-[#C42348]" />,
                    title: "Secure card payments",
                    description:
                      "Powered by Stripe. Payouts go straight to your bank account on a schedule you choose.",
                  },
                  {
                    icon: (
                      <LayoutDashboard className="w-5 h-5 text-[#C42348]" />
                    ),
                    title: "Live order dashboard",
                    description:
                      "New orders ring in on any tablet or phone. Accept, set prep time, and mark ready with one tap.",
                  },
                  {
                    icon: <Eye className="w-5 h-5 text-[#C42348]" />,
                    title: "Real-time order status",
                    description:
                      'Customers see "received → preparing → ready" live, so they show up right on time — no crowding at the counter.',
                  },
                  {
                    icon: <Bell className="w-5 h-5 text-[#C42348]" />,
                    title: "Pause anytime",
                    description:
                      "Slammed in the kitchen? Pause new orders with one switch — the page updates instantly for customers.",
                  },
                  {
                    icon: <Heart className="w-5 h-5 text-[#C42348]" />,
                    title: "Local support, in person",
                    description:
                      "We're in the Omaha metro. Real humans set you up, train your staff, and answer the phone.",
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF3EA] flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                        {feature.title}
                      </h3>
                      <p className="text-[#6E515B] text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======== PRICING SECTION ======== */}
        <section id="pricing" className="py-20 px-6 bg-[#33101F]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 text-[#E8A13B] font-semibold text-sm uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 bg-[#E8A13B] rounded-sm rotate-45"></span>
                  Pricing
                </div>
                <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-3xl sm:text-4xl text-[#FAF3EA]">
                  One flat price.
                  <br />
                  Zero surprises.
                </h2>
                <ul className="mt-8 space-y-4">
                  {[
                    "Unlimited orders — commission stays 0% forever",
                    "Branded ordering page + live dashboard",
                    "Stripe payment processing & direct payouts",
                    "Setup, menu build, and staff training included",
                    "Cancel anytime — no contracts, no hardware to buy",
                  ].map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-[#EDD3DB]"
                    >
                      <span className="w-2 h-2 bg-[#E8A13B] rounded-sm rotate-45 mt-1.5 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#join"
                  onClick={(e) => scrollToSection(e, "join")}
                  className="inline-flex items-center gap-2 bg-[#E8A13B] hover:bg-[#F0B84D] text-[#33101F] font-bold px-8 py-3.5 rounded-full transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-[#E8A13B]/30 mt-8"
                >
                  Request early access
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div>
                <div className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-5xl sm:text-6xl text-[#E8A13B]">
                  $149
                  <small className="text-[#C99AA8] text-2xl font-semibold">
                    /mo
                  </small>
                </div>
                <p className="text-[#C99AA8] mt-4 max-w-sm">
                  Founding-restaurant rate for the first Omaha partners. A
                  single day of delivery-app commissions often costs more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======== JOIN / CTA SECTION ======== */}
        <section id="join" className="py-20 px-6 bg-[#C42348]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-2xl sm:text-3xl text-white">
                Own a restaurant in the Omaha metro?
              </h2>
              <p className="text-[#FBD9E0] mt-2 max-w-lg">
                Hinarok is onboarding its founding group of local restaurants
                now. Get your ordering page before your competitors do.
              </p>
            </div>
            <a
              href="mailto:hello@hinarok.com?subject=Hinarok%20early%20access"
              className="inline-flex items-center gap-2 bg-[#E8A13B] hover:bg-[#F0B84D] text-[#33101F] font-bold px-8 py-3.5 rounded-full transition-all hover:-translate-y-0.5 whitespace-nowrap"
            >
              Email us: hello@hinarok.com
            </a>
          </div>
        </section>

        {/* ======== RESTAURANTS GRID ======== */}
        <section className="py-20 px-6 bg-[#FAF3EA]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-[#C42348] font-semibold text-sm uppercase tracking-wider mb-4">
              <span className="w-2 h-2 bg-[#C42348] rounded-sm rotate-45"></span>
              Partner Restaurants
            </div>
            <h2 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold text-3xl text-[#33101F] mb-4">
              Order from Local Favorites
            </h2>
            <p className="text-[#8C6B76] text-lg max-w-2xl">
              Discover delicious food from our partner restaurants in the Omaha
              metro.
            </p>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C42348]"></div>
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E7C7CF]">
                <Store className="w-16 h-16 text-[#8C6B76] mx-auto mb-4" />
                <p className="text-[#8C6B76]">No restaurants available yet.</p>
                <p className="text-[#C99AA8] text-sm mt-2">Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {restaurants.map((restaurant, index) => (
                  <div
                    key={restaurant.id}
                    className="bg-white hover:shadow-xl rounded-2xl overflow-hidden transition-all border border-[#E7C7CF] group"
                  >
                    <Link
                      to={`/restaurant/${restaurant.slug}`}
                      className="block"
                    >
                      <div className="h-48 overflow-hidden relative">
                        <img
                          src={restaurant.coverImage}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Open
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#FAF3EA]">
                            <img
                              src={restaurant.logo}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#33101F] text-base group-hover:text-[#C42348] transition-colors">
                              {restaurant.name}
                            </h3>
                            <p className="text-xs text-[#8C6B76]">
                              {restaurant.cuisine || "Local Cuisine"}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-[#6E515B] line-clamp-2 leading-relaxed">
                          {restaurant.description}
                        </p>

                        <div className="mt-4 flex items-center justify-between text-xs text-[#8C6B76]">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3">📍</span>
                            {restaurant.address}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#C42348] font-semibold group-hover:gap-2 transition-all">
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
        </section>

        {/* ======== FOOTER ======== */}
        <footer className="bg-[#33101F] text-[#C99AA8] py-12 px-6 border-t border-[#48182C]">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logoDark} alt="Hinarok" className="h-9 w-auto ml-2" />
              <span className="text-[#C99AA8] text-sm hidden sm:inline">
                — "little pomegranate" in Kurdish 🍒
              </span>
            </div>
            <div className="text-sm text-center sm:text-left">
              Omaha, NE · © 2026
            </div>
          </div>
        </footer>
      </div>
    </>
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF3EA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C42348]"></div>
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
      <div className="min-h-screen bg-[#FAF3EA] antialiased selection:bg-[#C42348] selection:text-white">
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