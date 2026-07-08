import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoDark from '../assets/logo-dark.png';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [isLandingPage, setIsLandingPage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only show full navigation on the landing page
    setIsLandingPage(location.pathname === '/');
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

  // Simplified header for non-landing pages (no navigation links)
  if (!isLandingPage) {
    return (
      <nav className="bg-[#33101F] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logoDark} alt="Hinarok" className="h-8 w-auto" />
            </Link>
            {/* Only show logout when authenticated */}
            {isAuthenticated && (
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
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoDark} alt="Hinarok" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation - Only on landing page */}
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

          {/* Mobile Menu Toggle - Only on landing page */}
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

        </div>

        {/* Mobile Menu - Only on landing page */}
        {isMobileMenuOpen && (
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