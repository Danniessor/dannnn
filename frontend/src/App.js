import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import "@/App.css";

// Pages
import { HomePage } from "./pages/HomePage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { ServicesPage } from "./pages/ServicesPage";
import { BookingPage } from "./pages/BookingPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminDashboard } from "./pages/AdminDashboard";

// Components
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Auth Callback Component for Google OAuth
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await fetch(`${API}/auth/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ session_id: sessionId })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem("user", JSON.stringify(data.user));
            // Clear hash and navigate
            window.history.replaceState(null, "", window.location.pathname);
            if (data.user.role === "admin") {
              navigate("/admin", { state: { user: data.user }, replace: true });
            } else {
              navigate("/", { state: { user: data.user }, replace: true });
            }
          } else {
            navigate("/login", { replace: true });
          }
        } catch (error) {
          console.error("Auth error:", error);
          navigate("/login", { replace: true });
        }
      }
    };
    
    processAuth();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-espresso-light font-body">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route for Admin
const ProtectedRoute = ({ children }) => {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const hasChecked = React.useRef(false);
  
  useEffect(() => {
    if (location.state?.user) {
      setIsAuthenticated(true);
      return;
    }
    
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    const verify = async () => {
      try {
        const authUser = await checkAuth();
        if (authUser && authUser.role === "admin") {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          navigate("/login", { replace: true });
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login", { replace: true });
      }
    };
    
    verify();
  }, []);
  
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return children;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return userData;
      } else {
        setUser(null);
        localStorage.removeItem("user");
        return null;
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem("user");
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = async (email, password) => {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }
    
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    return data.user;
  };
  
  const register = async (email, password, name) => {
    const response = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }
    
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    return data.user;
  };
  
  const logout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };
  
  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  
  useEffect(() => {
    // Try to restore user from localStorage first
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    checkAuth();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, loginWithGoogle, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// App Router with session_id detection
const AppRouter = () => {
  const location = useLocation();
  
  // Check for session_id in URL fragment synchronously
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<><Navbar /><HomePage /><Footer /></>} />
      <Route path="/portfolio" element={<><Navbar /><PortfolioPage /><Footer /></>} />
      <Route path="/services" element={<><Navbar /><ServicesPage /><Footer /></>} />
      <Route path="/booking" element={<><Navbar /><BookingPage /><Footer /></>} />
      <Route path="/about" element={<><Navbar /><AboutPage /><Footer /></>} />
      <Route path="/contact" element={<><Navbar /><ContactPage /><Footer /></>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App min-h-screen bg-cream">
          <AppRouter />
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
