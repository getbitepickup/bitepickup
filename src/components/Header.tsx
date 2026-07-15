import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoDark from "../assets/logo-dark.png";
import { getRestaurants } from "../store/apiStore";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isLandingPage, setIsLandingPage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [isRestaurantPage, setIsRestaurantPage] = useState(false);
  const [isDashboardPage, setIsDashboardPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardId, setDashboardId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      setLoading(true);

      // Only show full navigation on the landing page
      setIsLandingPage(location.pathname === "/");

      // Check if we're on a restaurant page or dashboard
      const isRestaurant = location.pathname.startsWith("/restaurant/");
      const isDashboard = location.pathname.startsWith("/restaurant-dashboard");
      setIsRestaurantPage(isRestaurant);
      setIsDashboardPage(isDashboard);

      // Extract ID from dashboard URL
      if (isDashboard) {
        const id = location.pathname
          .split("/restaurant-dashboard/")[1]
          ?.split("/")[0];
        setDashboardId(id || null);
      } else {
        setDashboardId(null);
      }

      // Check if we're on a subdomain
      const hostname = window.location.hostname;
      const isMainDomain =
        hostname === "hinarok.com" ||
        hostname === "www.hinarok.com" ||
        hostname === "localhost" ||
        hostname.includes("vercel.app");
      setIsSubdomain(!isMainDomain);

      // If on restaurant page or dashboard, fetch the correct restaurant data
      if (isRestaurant || isDashboard || !isMainDomain) {
        try {
          // Get all restaurants
          const restaurants = await getRestaurants();

          let foundRestaurant = null;

          // If on restaurant page with slug
          if (isRestaurant) {
            const slug = location.pathname
              .split("/restaurant/")[1]
              ?.split("/")[0];
            if (slug) {
              foundRestaurant = restaurants.find((r: any) => r.slug === slug);
            }
          }

          // If on dashboard with ID - PRIORITY 1
          if (!foundRestaurant && isDashboard) {
            const id = location.pathname
              .split("/restaurant-dashboard/")[1]
              ?.split("/")[0];
            if (id) {
              foundRestaurant = restaurants.find((r: any) => r.id === id);
              // If found by ID, immediately update localStorage
              if (foundRestaurant) {
                const restaurantData = {
                  name: foundRestaurant.name,
                  logo: foundRestaurant.logo || "",
                  id: foundRestaurant.id,
                  slug: foundRestaurant.slug,
                  subdomain: foundRestaurant.subdomain,
                };
                localStorage.setItem(
                  "currentRestaurant",
                  JSON.stringify(restaurantData)
                );
              }
            }
          }

          // If on subdomain
          if (!foundRestaurant && !isMainDomain) {
            const subdomain = hostname.split(".")[0];
            if (subdomain && subdomain !== "www") {
              foundRestaurant = restaurants.find((r: any) => {
                if (r.subdomain && r.subdomain.includes(subdomain)) return true;
                if (r.slug === subdomain) return true;
                return false;
              });
            }
          }

          // Also check localStorage as fallback - BUT verify it matches the dashboard ID if on dashboard
          if (!foundRestaurant) {
            try {
              const stored = localStorage.getItem("currentRestaurant");
              if (stored) {
                const parsed = JSON.parse(stored);
                // If on dashboard, verify the stored restaurant matches the dashboard ID
                if (isDashboard && dashboardId) {
                  if (parsed.id === dashboardId) {
                    const verified = restaurants.find(
                      (r: any) => r.id === parsed.id
                    );
                    if (verified) {
                      foundRestaurant = verified;
                    }
                  }
                } else {
                  // Not on dashboard, just use stored
                  const verified = restaurants.find(
                    (r: any) => r.id === parsed.id
                  );
                  if (verified) {
                    foundRestaurant = verified;
                  }
                }
              }
            } catch (e) {
              console.log("No valid restaurant in storage");
            }
          }

          if (foundRestaurant) {
            setRestaurantData({
              name: foundRestaurant.name,
              logo: foundRestaurant.logo || "",
              id: foundRestaurant.id,
              slug: foundRestaurant.slug,
              subdomain: foundRestaurant.subdomain,
            });
            // Also update localStorage for consistency
            localStorage.setItem(
              "currentRestaurant",
              JSON.stringify({
                name: foundRestaurant.name,
                logo: foundRestaurant.logo || "",
                id: foundRestaurant.id,
                slug: foundRestaurant.slug,
                subdomain: foundRestaurant.subdomain,
              })
            );
          } else {
            // If no restaurant found, clear the data
            setRestaurantData(null);
            localStorage.removeItem("currentRestaurant");
          }
        } catch (error) {
          console.error("Failed to fetch restaurant data for header:", error);
          // Try localStorage as fallback
          try {
            const stored = localStorage.getItem("currentRestaurant");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.name) {
                setRestaurantData(parsed);
              }
            }
          } catch (e) {
            setRestaurantData(null);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Not on a restaurant page
        setRestaurantData(null);
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [location, dashboardId]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  // Get the main domain URL
  const getMainDomainUrl = () => {
    const hostname = window.location.hostname;
    if (hostname.includes("vercel.app") || hostname === "localhost") {
      return "/";
    }
    return "https://hinarok.com";
  };

  // Check if we should render navigation links (only on landing page)
  const shouldRenderNav = isLandingPage;

  // Check if we should show restaurant branding
  const showRestaurantBranding =
    isRestaurantPage || isDashboardPage || isSubdomain;

  // Simplified header for non-landing pages (no navigation links)
  if (!isLandingPage) {
    return (
      <nav className="bg-[#33101F] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Show restaurant branding on restaurant pages/dashboards, otherwise Hinarok logo */}
            {showRestaurantBranding && restaurantData ? (
              <div className="flex items-center gap-2">
                {restaurantData.logo && restaurantData.logo.trim() !== "" ? (
                  <img
                    src={restaurantData.logo}
                    alt={restaurantData.name || "Restaurant"}
                    className="h-8 w-auto max-w-[120px] object-contain rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className="text-white font-bold text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] truncate max-w-[200px]">
                  {restaurantData.name || "Restaurant"}
                </span>
              </div>
            ) : (
              <a
                href={getMainDomainUrl()}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img src={logoDark} alt="Hinarok" className="h-8 w-auto" />
              </a>
            )}

            {/* Only show logout when authenticated and on dashboard/admin pages */}
            {isAuthenticated &&
              (location.pathname.startsWith("/restaurant-dashboard") ||
                location.pathname.startsWith("/admin")) && (
                <button
                  onClick={handleLogout}
                  className="text-[#E7C7CF] hover:text-white text-sm font-medium transition-colors font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Logout
                </button>
              )}
          </div>
        </div>
      </nav>
    );
  }

  // Full header with navigation for landing page
  return (
    <nav className="bg-[#33101F] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand - Logo (Clickable on landing page) */}
          <a
            href={getMainDomainUrl()}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logoDark} alt="Hinarok" className="h-8 w-auto" />
          </a>

          {/* Desktop Navigation - Only on landing page */}
          {shouldRenderNav && (
            <ul className="hidden md:flex items-center gap-8 list-none">
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, "how-it-works")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, "features")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => scrollToSection(e, "pricing")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#join"
                  onClick={(e) => scrollToSection(e, "join")}
                  className="inline-block font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold no-underline rounded-full px-5 py-2 text-sm bg-[#E8A13B] text-[#33101F] hover:bg-[#F0B84D] transition-all"
                >
                  Join Hinarok
                </a>
              </li>
            </ul>
          )}

          {/* Mobile Menu Toggle - Only on landing page */}
          {shouldRenderNav && (
            <button
              className="md:hidden text-[#E7C7CF] hover:text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Menu - Only on landing page */}
        {shouldRenderNav && isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#48182C]">
            <ul className="flex flex-col gap-4 list-none">
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, "how-it-works")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline block py-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, "features")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline block py-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => scrollToSection(e, "pricing")}
                  className="text-[#E7C7CF] hover:text-white transition-colors text-sm font-medium no-underline block py-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#join"
                  onClick={(e) => scrollToSection(e, "join")}
                  className="inline-block font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold no-underline rounded-full px-5 py-2.5 text-sm bg-[#E8A13B] text-[#33101F] hover:bg-[#F0B84D] transition-all w-full text-center"
                >
                  Join Hinarok
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}