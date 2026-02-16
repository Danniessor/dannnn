import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Camera } from "lucide-react";
import { useAuth } from "../App";
import { toast } from "sonner";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      toast.success("Login successful!");
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main data-testid="login-page" className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200"
          alt="Wedding photography"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/50 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <Link to="/" className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-gold" strokeWidth={1.5} />
            <span className="font-heading text-2xl text-cream">Rina Visuals</span>
          </Link>
          <p className="font-body text-sm text-cream/80 max-w-md">
            Access your admin dashboard to manage bookings, portfolio, and services.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-cream">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 text-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <Camera className="w-6 h-6 text-gold" strokeWidth={1.5} />
              <span className="font-heading text-2xl text-espresso">Rina Visuals</span>
            </Link>
          </div>

          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl text-espresso mb-2">Welcome Back</h1>
            <p className="font-body text-sm text-espresso-light">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="login-email"
                  className="w-full pl-11 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                  placeholder="admin@rinavisuals.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="login-password"
                  className="w-full pl-11 pr-11 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text hover:text-espresso"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="btn-primary w-full flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-warm-grey" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-cream px-4 font-body text-xs text-muted-text uppercase tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          <button
            onClick={loginWithGoogle}
            data-testid="login-google"
            className="w-full flex items-center justify-center gap-3 py-3 border border-warm-grey hover:border-espresso transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-body text-sm text-espresso">Sign in with Google</span>
          </button>

          <p className="text-center mt-8 font-body text-sm text-espresso-light">
            Don't have an account?{" "}
            <Link to="/register" className="text-gold hover:underline">
              Register here
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link to="/" className="font-body text-xs text-muted-text hover:text-espresso">
              Back to Homepage
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};
