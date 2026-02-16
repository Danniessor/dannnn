import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Camera } from "lucide-react";
import { useAuth } from "../App";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/portfolio", label: "Portfolio" },
    { path: "/services", label: "Services" },
    { path: "/booking", label: "Book Now" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "glass border-b border-warm-grey/50 py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container-custom px-6 lg:px-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            data-testid="navbar-logo"
            className="flex items-center gap-3 group"
          >
            <Camera className="w-6 h-6 text-gold transition-transform group-hover:scale-110" strokeWidth={1.5} />
            <span className="font-heading text-2xl lg:text-3xl text-espresso tracking-tight">
              Rina Visuals
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-testid={`nav-link-${link.label.toLowerCase().replace(" ", "-")}`}
                className={`font-body text-xs uppercase tracking-widest transition-all duration-300 relative ${
                  isActive(link.path)
                    ? "text-gold"
                    : "text-espresso hover:text-gold"
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-gold" />
                )}
              </Link>
            ))}
            
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    data-testid="nav-admin-link"
                    className="font-body text-xs uppercase tracking-widest text-espresso hover:text-gold transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
                  data-testid="nav-logout-btn"
                  className="font-body text-xs uppercase tracking-widest text-espresso hover:text-gold transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="nav-login-link"
                className="font-body text-xs uppercase tracking-widest text-espresso hover:text-gold transition-colors"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            data-testid="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-espresso"
          >
            {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            data-testid="mobile-menu"
            className="lg:hidden absolute top-full left-0 right-0 bg-cream border-b border-warm-grey animate-fade-in"
          >
            <div className="py-6 px-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block font-body text-sm uppercase tracking-widest py-2 ${
                    isActive(link.path) ? "text-gold" : "text-espresso"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block font-body text-sm uppercase tracking-widest py-2 text-espresso"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block font-body text-sm uppercase tracking-widest py-2 text-espresso"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block font-body text-sm uppercase tracking-widest py-2 text-espresso"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
