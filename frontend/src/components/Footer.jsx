import React from "react";
import { Link } from "react-router-dom";
import { Camera, Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer data-testid="footer" className="bg-espresso text-cream-dark">
      <div className="container-custom px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <Camera className="w-6 h-6 text-gold" strokeWidth={1.5} />
              <span className="font-heading text-2xl text-cream tracking-tight">
                Rina Visuals
              </span>
            </Link>
            <p className="font-body text-sm text-cream-dark/70 leading-relaxed mb-6">
              Capturing life's precious moments with elegance and artistry. 
              Professional photography and photobooth services for your special occasions.
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-instagram"
                className="w-10 h-10 flex items-center justify-center border border-cream-dark/30 hover:border-gold hover:text-gold transition-colors"
              >
                <Instagram size={18} strokeWidth={1.5} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-facebook"
                className="w-10 h-10 flex items-center justify-center border border-cream-dark/30 hover:border-gold hover:text-gold transition-colors"
              >
                <Facebook size={18} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-xl text-cream mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { path: "/portfolio", label: "Portfolio" },
                { path: "/services", label: "Services" },
                { path: "/booking", label: "Book Now" },
                { path: "/about", label: "About Us" },
                { path: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="font-body text-sm text-cream-dark/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading text-xl text-cream mb-6">Services</h4>
            <ul className="space-y-3">
              {[
                "Wedding Photography",
                "Event Coverage",
                "Birthday Shoots",
                "Corporate Events",
                "Photobooth Rental",
              ].map((service) => (
                <li key={service}>
                  <span className="font-body text-sm text-cream-dark/70">
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-xl text-cream mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone size={18} strokeWidth={1.5} className="text-gold mt-0.5" />
                <span className="font-body text-sm text-cream-dark/70">
                  +63 912 345 6789
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={18} strokeWidth={1.5} className="text-gold mt-0.5" />
                <span className="font-body text-sm text-cream-dark/70">
                  hello@rinavisuals.com
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} strokeWidth={1.5} className="text-gold mt-0.5" />
                <span className="font-body text-sm text-cream-dark/70">
                  Manila, Philippines
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-cream-dark/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-body text-xs text-cream-dark/50 uppercase tracking-wider">
              &copy; {currentYear} Rina Visuals. All rights reserved.
            </p>
            <p className="font-body text-xs text-cream-dark/50">
              Crafted with love for your special moments
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
