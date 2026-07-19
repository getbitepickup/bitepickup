import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoDark from "../assets/logo-dark.png";
import { getRestaurants } from "../store/apiStore";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLandingPage, setIsLandingPage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [isRestaurantPage, setIsRestaurantPage] = useState(false);
  const [isDashboardPage, setIsDashboardPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // ✅ FIX: Normalize slug (remove dashes for comparison)
  const normalizeSlug = (value: string) => {
    if (!value) return '';
    return value.toLowerCase().replace(/-/g, '');
  };

  // ✅ FIX: Check if current URL is a subdomain and redirect dash versions
  useEffect(() => {
    const hostname = window.location.hostname;
    const isMainDomain =
      hostname === "hinarok.com" ||
      hostname === "www.hinarok.com" ||
      hostname === "localhost" ||
      hostname.includes("vercel.app");

    if (!isMainDomain) {
      const subdomain = hostname.split(".")[0];
      // If subdomain contains a dash, redirect to no-dash version
      if (subdomain && subdomain.includes("-")) {
        const noDashSubdomain = subdomain.replace(/-/g, "");
        const newUrl = `https://${noDashSubdomain}.${hostname.split(".").slice(1).join(".")}`;
        console.log(`🔄 Redirecting dash subdomain: ${subdomain} → ${noDashSubdomain}`);
        window.location.href = newUrl;
        return;
      }
    }
  }, []);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      setLoading(true);
      setFetchAttempted(false);

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

      // If on restaurant page or dashboard or subdomain, fetch the correct restaurant data
      if (isRestaurant || isDashboard || !isMainDomain) {
        try {
          // Get all restaurants - fresh fetch
          const restaurants = await getRestaurants();
          const activeRestaurants = restaurants.filter(
            (r: any) => r.isActive !== false,
          );

          let foundRestaurant = null;

          // ✅ FIX: Normalize subdomain for comparison
          const getNormalizedSubdomain = () => {
            if (isMainDomain) return null;
            const sub = hostname.split(".")[0];
            return sub && sub !== "www" ? normalizeSlug(sub) : null;
          };
          const normalizedSubdomain = getNormalizedSubdomain();

          // PRIORITY 1: If on dashboard with ID
          if (isDashboard && dashboardId) {
            foundRestaurant = activeRestaurants.find(
              (r: any) => r.id === dashboardId,
            );
            if (foundRestaurant) {
              console.log(
                "📌 Header: Found restaurant by dashboard ID:",
                foundRestaurant.name,
              );
            }
          }

          // PRIORITY 2: If on restaurant page with slug
          if (!foundRestaurant && isRestaurant) {
            const slug = location.pathname
              .split("/restaurant/")[1]
              ?.split("/")[0];
            if (slug) {
              // Try exact match first
              foundRestaurant = activeRestaurants.find(
                (r: any) => r.slug === slug,
              );
              // If not found, try normalized match
              if (!foundRestaurant) {
                const normalizedSlug = normalizeSlug(slug);
                foundRestaurant = activeRestaurants.find(
                  (r: any) => normalizeSlug(r.slug || '') === normalizedSlug,
                );
              }
              if (foundRestaurant) {
                console.log(
                  "📌 Header: Found restaurant by slug:",
                  foundRestaurant.name,
                );
              }
            }
          }

          // PRIORITY 3: If on subdomain
          if (!foundRestaurant && !isMainDomain && normalizedSubdomain) {
            // Try exact subdomain match first
            foundRestaurant = activeRestaurants.find(
              (r: any) => r.subdomain === normalizedSubdomain,
            );
            // If not found, try normalized match
            if (!foundRestaurant) {
              foundRestaurant = activeRestaurants.find((r: any) => {
                const normalizedRSub = normalizeSlug(r.subdomain || '');
                const normalizedRSlug = normalizeSlug(r.slug || '');
                return normalizedRSub === normalizedSubdomain ||
                       normalizedRSlug === normalizedSubdomain;
              });
            }
            // If still not found, try contains match
            if (!foundRestaurant) {
              foundRestaurant = activeRestaurants.find((r: any) => {
                const normalizedRSub = normalizeSlug(r.subdomain || '');
                return normalizedRSub.includes(normalizedSubdomain) ||
                       r.subdomain?.includes(normalizedSubdomain);
              });
            }
            if (foundRestaurant) {
              console.log(
                "📌 Header: Found restaurant by subdomain:",
                foundRestaurant.name,
              );
            }
          }

          // PRIORITY 4: Check localStorage but VERIFY it matches the current context
          if (!foundRestaurant) {
            try {
              const stored = localStorage.getItem("currentRestaurant");
              if (stored) {
                const parsed = JSON.parse(stored);
                // If on dashboard, verify the stored restaurant matches the dashboard ID
                if (isDashboard && dashboardId) {
                  if (parsed.id === dashboardId) {
                    const verified = activeRestaurants.find(
                      (r: any) => r.id === parsed.id,
                    );
                    if (verified) {
                      foundRestaurant = verified;
                      console.log(
                        "📌 Header: Found restaurant from localStorage (verified for dashboard):",
                        foundRestaurant.name,
                      );
                    }
                  } else {
                    // Stored doesn't match dashboard ID, clear it
                    localStorage.removeItem("currentRestaurant");
                  }
                } else if (isRestaurant) {
                  // For restaurant page, verify the stored restaurant matches the slug
                  const slug = location.pathname
                    .split("/restaurant/")[1]
                    ?.split("/")[0];
                  if (slug && (parsed.slug === slug || normalizeSlug(parsed.slug) === normalizeSlug(slug))) {
                    const verified = activeRestaurants.find(
                      (r: any) => r.id === parsed.id,
                    );
                    if (verified) {
                      foundRestaurant = verified;
                      console.log(
                        "📌 Header: Found restaurant from localStorage (verified for restaurant page):",
                        foundRestaurant.name,
                      );
                    }
                  } else {
                    // Stored doesn't match slug, clear it
                    localStorage.removeItem("currentRestaurant");
                  }
                } else if (!isMainDomain && normalizedSubdomain) {
                  // For subdomain, verify the stored restaurant matches
                  const normalizedStoredSlug = normalizeSlug(parsed.slug || '');
                  const normalizedStoredSub = normalizeSlug(parsed.subdomain || '');
                  if (normalizedStoredSlug === normalizedSubdomain || 
                      normalizedStoredSub === normalizedSubdomain) {
                    const verified = activeRestaurants.find(
                      (r: any) => r.id === parsed.id,
                    );
                    if (verified) {
                      foundRestaurant = verified;
                      console.log(
                        "📌 Header: Found restaurant from localStorage (verified for subdomain):",
                        foundRestaurant.name,
                      );
                    }
                  } else {
                    localStorage.removeItem("currentRestaurant");
                  }
                } else {
                  // Not on a specific page, just use stored but verify it's active
                  const verified = activeRestaurants.find(
                    (r: any) => r.id === parsed.id,
                  );
                  if (verified) {
                    foundRestaurant = verified;
                    console.log(
                      "📌 Header: Found restaurant from localStorage (verified):",
                      foundRestaurant.name,
                    );
                  } else {
                    localStorage.removeItem("currentRestaurant");
                  }
                }
              }
            } catch (e) {
              console.log("No valid restaurant in storage");
            }
          }

          if (foundRestaurant) {
            const restaurantDataObj = {
              name: foundRestaurant.name,
              logo: foundRestaurant.logo || "",
              id: foundRestaurant.id,
              slug: foundRestaurant.slug,
              subdomain: foundRestaurant.subdomain,
            };
            setRestaurantData(restaurantDataObj);
            // Update localStorage for consistency, but only if it's the correct one
            localStorage.setItem(
              "currentRestaurant",
              JSON.stringify(restaurantDataObj),
            );
          } else {
            // No restaurant found, clear data
            setRestaurantData(null);
            // Only clear localStorage if we're on a restaurant page/dashboard/subdomain
            if (isRestaurant || isDashboard || !isMainDomain) {
              localStorage.removeItem("currentRestaurant");
            }
          }
        } catch (error) {
          console.error("Failed to fetch restaurant data for header:", error);
          // Try localStorage as fallback but only if it matches the current context
          try {
            const stored = localStorage.getItem("currentRestaurant");
            if (stored) {
              const parsed = JSON.parse(stored);
              // Verify the stored data matches the current context
              let isValid = false;
              if (isDashboard && dashboardId) {
                isValid = parsed.id === dashboardId;
              } else if (isRestaurant) {
                const slug = location.pathname
                  .split("/restaurant/")[1]
                  ?.split("/")[0];
                isValid = slug && (parsed.slug === slug || normalizeSlug(parsed.slug) === normalizeSlug(slug));
              } else if (!isMainDomain && normalizedSubdomain) {
                const normalizedStoredSlug = normalizeSlug(parsed.slug || '');
                const normalizedStoredSub = normalizeSlug(parsed.subdomain || '');
                isValid = normalizedStoredSlug === normalizedSubdomain || 
                         normalizedStoredSub === normalizedSubdomain;
              } else {
                isValid = true;
              }
              if (isValid && parsed && parsed.name) {
                setRestaurantData(parsed);
              } else {
                setRestaurantData(null);
                localStorage.removeItem("currentRestaurant");
              }
            }
          } catch (e) {
            setRestaurantData(null);
          }
        } finally {
          setLoading(false);
          setFetchAttempted(true);
        }
      } else {
        // Not on a restaurant page, clear restaurant data
        setRestaurantData(null);
        setLoading(false);
        setFetchAttempted(true);
        // Don't clear localStorage here to avoid flicker when navigating away
      }
    };

    fetchRestaurantData();
  }, [location.pathname, dashboardId]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
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