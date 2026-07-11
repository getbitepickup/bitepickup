import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoDark from '../assets/logo-dark.png';

export default function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isLandingPage, setIsLandingPage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [isRestaurantPage, setIsRestaurantPage] = useState(false);

  useEffect(() => {
    // Only show full navigation on the landing page
    setIsLandingPage(location.pathname === '/');
    
    // Check if we're on a restaurant page
    const isRestaurant = location.pathname.startsWith('/restaurant/');
    setIsRestaurantPage(isRestaurant);
    
    // Check if we're on a subdomain
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'hinarok.com' || 
                         hostname === 'www.hinarok.com' || 
                         hostname === 'localhost' || 
                         hostname.includes('vercel.app');
    setIsSubdomain(!isMainDomain);

    // Try to get restaurant data from localStorage or session
    if (isRestaurant || !isMainDomain) {
      try {
        const storedRestaurant = localStorage.getItem('currentRestaurant');
        if (storedRestaurant) {
          setRestaurantData(JSON.parse(storedRestaurant));
        }
      } catch (e) {
        console.log('No restaurant data in storage');
      }
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
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
    if (hostname.includes('vercel.app') || hostname === 'localhost') {
      return '/';
    }
    return 'https://hinarok.com';
  };

  // Check if we should render navigation links (only on landing page)
  const shouldRenderNav = isLandingPage;

  // Simplified header for non-landing pages (no navigation links)
  if (!isLandingPage) {
    return (
      <nav className="bg-[#33101F] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Show restaurant branding on restaurant pages, otherwise Hinarok logo */}
            {isRestaurantPage || isSubdomain ? (
              <a 
                href={isSubdomain ? window.location.href : getMainDomainUrl()} 
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {restaurantData?.logo ? (
                  <img 
                    src={restaurantData.logo} 
                    alt={restaurantData.name || 'Restaurant'} 
                    className="h-8 w-auto rounded-full object-cover"
                    onError={(e) => {
                      // If logo fails to load, show text fallback
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.className = 'text-white font-bold text-lg font-[\'Baloo_2\',\'Trebuchet_MS\',sans-serif]';
                        span.textContent = restaurantData?.name || 'Restaurant';
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-lg font-['Baloo_2','Trebuchet_MS',sans-serif]">
                    {restaurantData?.name || 'Restaurant'}
                  </span>
                )}
              </a>
            ) : (
              <a 
                href={getMainDomainUrl()} 
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img src={logoDark} alt="Hinarok" className="h-8 w-auto" />
              </a>
            )}

            {/* Only show logout when authenticated and NOT on public restaurant pages */}
            {isAuthenticated && location.pathname.startsWith('/restaurant-dashboard') && (
              <button
                onClick={handleLogout}
                className="text-[#E7C7CF] hover:text-white text-sm font-medium transition-colors font-['Inter','Segoe UI',system-ui,sans-serif]"
              >
                Logout
              </button>
            )}
            {isAuthenticated && location.pathname.startsWith('/admin') && (
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
          
          {/* Brand - Logo */}
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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