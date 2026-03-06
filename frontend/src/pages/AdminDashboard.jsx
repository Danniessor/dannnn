import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Camera,
  Calendar,
  Users,
  Package,
  Image,
  Mail,
  LogOut,
  Check,
  X,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Menu,
  Home,
  Bell,
  Settings,
  CreditCard,
  FileText,
  Shield,
  ClipboardList,
  Edit,
  Download,
  Upload,
  Search,
  Filter,
  ChevronDown,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";

// Booking status configuration
const BOOKING_STATUSES = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  partially_paid: { label: "Partially Paid", color: "bg-blue-100 text-blue-800", icon: CreditCard },
  payment_review: { label: "Payment Review", color: "bg-purple-100 text-purple-800", icon: Eye },
  confirmed_booked: { label: "Confirmed", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800", icon: X },
  in_progress: { label: "In Progress", color: "bg-indigo-100 text-indigo-800", icon: Clock },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800", icon: Check },
};

// Role configuration
const ROLES = {
  user: { label: "User", color: "bg-gray-100 text-gray-800" },
  worker: { label: "Worker", color: "bg-blue-100 text-blue-800" },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-800" },
  super_admin: { label: "Super Admin", color: "bg-red-100 text-red-800" },
};

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "bookings");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Data states
  const [bookings, setBookings] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [packages, setPackages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cmsSections, setCmsSections] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [albums, setAlbums] = useState([]);

  const token = localStorage.getItem("token");
  
  // Check role permissions
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isWorker = user?.role === "worker" || isAdmin;

  // Define tabs based on role
  const getTabs = () => {
    const baseTabs = [
      { id: "bookings", label: "Bookings", icon: Calendar, roles: ["worker", "admin", "super_admin"] },
    ];
    
    if (isAdmin) {
      baseTabs.push(
        { id: "portfolio", label: "Portfolio", icon: Image, roles: ["admin", "super_admin"] },
        { id: "albums", label: "Albums", icon: Image, roles: ["admin", "super_admin"] },
        { id: "packages", label: "Packages", icon: Package, roles: ["admin", "super_admin"] },
        { id: "payment-methods", label: "Payment Methods", icon: CreditCard, roles: ["admin", "super_admin"] },
        { id: "testimonials", label: "Testimonials", icon: FileText, roles: ["admin", "super_admin"] },
        { id: "cms", label: "CMS", icon: Settings, roles: ["admin", "super_admin"] },
        { id: "messages", label: "Messages", icon: Mail, roles: ["admin", "super_admin"] },
        { id: "notifications", label: "Notifications", icon: Bell, roles: ["admin", "super_admin"] }
      );
    }
    
    if (isSuperAdmin) {
      baseTabs.push(
        { id: "users", label: "Users", icon: Users, roles: ["super_admin"] },
        { id: "audit-logs", label: "Audit Logs", icon: Shield, roles: ["super_admin"] }
      );
    }
    
    return baseTabs.filter(tab => tab.roles.includes(user?.role));
  };

  const tabs = getTabs();

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }, [token]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch notification count
      const countRes = await fetchWithAuth(`${API}/admin/notifications/count`);
      if (countRes.ok) {
        const { count } = await countRes.json();
        setNotificationCount(count);
      }

      // Fetch data based on active tab
      switch (activeTab) {
        case "bookings":
          const bookingsRes = await fetchWithAuth(`${API}/admin/bookings`);
          if (bookingsRes.ok) setBookings(await bookingsRes.json());
          break;
        case "portfolio":
          const portfolioRes = await fetchWithAuth(`${API}/admin/portfolio`);
          if (portfolioRes.ok) setPortfolio(await portfolioRes.json());
          break;
        case "albums":
          const albumsRes = await fetchWithAuth(`${API}/admin/albums`);
          if (albumsRes.ok) setAlbums(await albumsRes.json());
          break;
        case "packages":
          const packagesRes = await fetchWithAuth(`${API}/admin/packages`);
          if (packagesRes.ok) setPackages(await packagesRes.json());
          break;
        case "payment-methods":
          const pmRes = await fetchWithAuth(`${API}/admin/payment-methods`);
          if (pmRes.ok) setPaymentMethods(await pmRes.json());
          break;
        case "testimonials":
          const testRes = await fetchWithAuth(`${API}/admin/testimonials`);
          if (testRes.ok) setTestimonials(await testRes.json());
          break;
        case "cms":
          const cmsRes = await fetchWithAuth(`${API}/admin/cms`);
          if (cmsRes.ok) setCmsSections(await cmsRes.json());
          break;
        case "messages":
          const msgRes = await fetchWithAuth(`${API}/admin/messages`);
          if (msgRes.ok) setMessages(await msgRes.json());
          break;
        case "notifications":
          const notifRes = await fetchWithAuth(`${API}/admin/notifications`);
          if (notifRes.ok) setNotifications(await notifRes.json());
          break;
        case "users":
          if (isSuperAdmin) {
            const usersRes = await fetchWithAuth(`${API}/admin/users`);
            if (usersRes.ok) setUsers(await usersRes.json());
          }
          break;
        case "audit-logs":
          if (isSuperAdmin) {
            const logsRes = await fetchWithAuth(`${API}/admin/audit-logs?limit=100`);
            if (logsRes.ok) setAuditLogs(await logsRes.json());
          }
          break;
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchWithAuth, isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Booking actions
  const updateBookingStatus = async (bookingId, status, rejectionReason = null) => {
    try {
      let url = `${API}/admin/bookings/${bookingId}/status?status=${status}`;
      if (rejectionReason) {
        url += `&rejection_reason=${encodeURIComponent(rejectionReason)}`;
      }
      const response = await fetchWithAuth(url, { method: "PUT" });
      if (response.ok) {
        toast.success(`Booking ${status.replace("_", " ")}`);
        fetchData();
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  const reviewPayment = async (paymentId, status, rejectionReason = null) => {
    try {
      let url = `${API}/admin/payments/${paymentId}/review?status=${status}`;
      if (rejectionReason) {
        url += `&rejection_reason=${encodeURIComponent(rejectionReason)}`;
      }
      const response = await fetchWithAuth(url, { method: "PUT" });
      if (response.ok) {
        toast.success(`Payment ${status}`);
        fetchData();
      } else {
        throw new Error("Failed to review payment");
      }
    } catch (error) {
      toast.error("Failed to review payment");
    }
  };

  // User actions (Super Admin only)
  const updateUserRole = async (userId, role) => {
    try {
      const response = await fetchWithAuth(`${API}/admin/users/${userId}/role?role=${role}`, {
        method: "PUT",
      });
      if (response.ok) {
        toast.success("User role updated");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      const response = await fetchWithAuth(`${API}/admin/users/${userId}/status?is_active=${isActive}`, {
        method: "PUT",
      });
      if (response.ok) {
        toast.success(`User ${isActive ? "activated" : "deactivated"}`);
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    await fetchWithAuth(`${API}/admin/notifications/${notificationId}/read`, { method: "PUT" });
    fetchData();
  };

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    await fetchWithAuth(`${API}/admin/notifications/read-all`, { method: "PUT" });
    toast.success("All notifications marked as read");
    fetchData();
  };

  // Delete handlers
  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const response = await fetchWithAuth(`${API}/admin/${type}/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success(`${type} deleted`);
        fetchData();
      }
    } catch (error) {
      toast.error(`Failed to delete ${type}`);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status) => {
    const config = BOOKING_STATUSES[status] || { label: status, color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs uppercase tracking-wider rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const config = ROLES[role] || { label: role, color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs uppercase tracking-wider rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Render booking details dialog
  const BookingDetailsDialog = ({ booking }) => {
    const [paymentProof, setPaymentProof] = useState(null);
    const [loadingProof, setLoadingProof] = useState(false);

    const loadPaymentProof = async (paymentId) => {
      setLoadingProof(true);
      try {
        const response = await fetchWithAuth(`${API}/admin/payments/${paymentId}/proof`);
        if (response.ok) {
          const data = await response.json();
          setPaymentProof(`data:${data.content_type};base64,${data.data}`);
        }
      } catch (error) {
        toast.error("Failed to load payment proof");
      } finally {
        setLoadingProof(false);
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="p-2 hover:bg-cream" data-testid={`view-booking-${booking.booking_id}`}>
            <Eye size={16} />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details - {booking.booking_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-text">Client Name</p>
                <p className="text-espresso font-medium">{booking.client_name}</p>
              </div>
              <div>
                <p className="text-muted-text">Email</p>
                <p className="text-espresso">{booking.client_email}</p>
              </div>
              <div>
                <p className="text-muted-text">Phone</p>
                <p className="text-espresso">{booking.client_phone}</p>
              </div>
              <div>
                <p className="text-muted-text">Status</p>
                {getStatusBadge(booking.status)}
              </div>
              <div>
                <p className="text-muted-text">Event Date</p>
                <p className="text-espresso">{booking.event_date}</p>
              </div>
              <div>
                <p className="text-muted-text">Event Time</p>
                <p className="text-espresso">{booking.event_time}</p>
              </div>
              <div>
                <p className="text-muted-text">Event Type</p>
                <p className="text-espresso capitalize">{booking.event_type}</p>
              </div>
              <div>
                <p className="text-muted-text">Package</p>
                <p className="text-espresso">{booking.package?.name || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-text">Venue</p>
                <p className="text-espresso">{booking.venue}</p>
              </div>
              {booking.special_requests && (
                <div className="col-span-2">
                  <p className="text-muted-text">Special Requests</p>
                  <p className="text-espresso">{booking.special_requests}</p>
                </div>
              )}
              {booking.admin_notes && (
                <div className="col-span-2">
                  <p className="text-muted-text">Admin Notes</p>
                  <p className="text-espresso">{booking.admin_notes}</p>
                </div>
              )}
            </div>

            {/* Package Details */}
            {booking.package && (
              <div className="border-t border-warm-grey pt-4">
                <h4 className="font-heading text-lg text-espresso mb-2">Package Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-text">Price</p>
                    <p className="text-gold font-heading text-xl">{formatPrice(booking.package.price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-text">Required Downpayment</p>
                    <p className="text-espresso">{formatPrice(booking.package.downpayment_amount || booking.package.price * 0.5)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payments */}
            {booking.payments && booking.payments.length > 0 && (
              <div className="border-t border-warm-grey pt-4">
                <h4 className="font-heading text-lg text-espresso mb-2">Payments</h4>
                <div className="space-y-4">
                  {booking.payments.map((payment) => (
                    <div key={payment.payment_id} className="bg-cream-dark p-4 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-espresso">{formatPrice(payment.amount)}</p>
                          <p className="text-xs text-muted-text">Ref: {payment.transaction_ref || "N/A"}</p>
                        </div>
                        <Badge variant={payment.status === "approved" ? "default" : payment.status === "rejected" ? "destructive" : "secondary"}>
                          {payment.status}
                        </Badge>
                      </div>
                      
                      {payment.proof_path && (
                        <button
                          onClick={() => loadPaymentProof(payment.payment_id)}
                          className="text-sm text-gold hover:underline"
                        >
                          {loadingProof ? "Loading..." : "View Payment Proof"}
                        </button>
                      )}
                      
                      {paymentProof && (
                        <div className="mt-4">
                          <img src={paymentProof} alt="Payment proof" className="max-w-full max-h-64 object-contain" />
                        </div>
                      )}

                      {payment.status === "under_review" && isAdmin && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => reviewPayment(payment.payment_id, "approved")}
                            className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = window.prompt("Rejection reason:");
                              if (reason) reviewPayment(payment.payment_id, "rejected", reason);
                            }}
                            className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {isAdmin && booking.status !== "confirmed_booked" && booking.status !== "cancelled" && (
              <div className="border-t border-warm-grey pt-4">
                <h4 className="font-heading text-lg text-espresso mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {booking.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateBookingStatus(booking.booking_id, "payment_review")}
                        className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700"
                      >
                        Mark as Awaiting Payment
                      </button>
                    </>
                  )}
                  {(booking.status === "payment_review" || booking.status === "partially_paid") && (
                    <button
                      onClick={() => updateBookingStatus(booking.booking_id, "confirmed_booked")}
                      className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      Confirm Booking
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const reason = window.prompt("Rejection reason:");
                      if (reason) updateBookingStatus(booking.booking_id, "rejected", reason);
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateBookingStatus(booking.booking_id, "cancelled")}
                    className="px-4 py-2 bg-gray-600 text-white text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Create User Dialog (Super Admin only)
  const CreateUserDialog = () => {
    const [formData, setFormData] = useState({
      email: "",
      password: "",
      name: "",
      role: "user"
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleCreate = async () => {
      setIsCreating(true);
      try {
        const response = await fetchWithAuth(`${API}/admin/users`, {
          method: "POST",
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          toast.success("User created successfully");
          setIsOpen(false);
          setFormData({ email: "", password: "", name: "", role: "user" });
          fetchData();
        } else {
          const error = await response.json();
          toast.error(error.detail || "Failed to create user");
        }
      } catch (error) {
        toast.error("Failed to create user");
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add User
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={isCreating} className="btn-primary">
              {isCreating ? "Creating..." : "Create User"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // CMS Editor
  const CMSEditor = ({ section }) => {
    const [content, setContent] = useState(section.content || {});
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
      setIsSaving(true);
      try {
        const response = await fetchWithAuth(`${API}/admin/cms/${section.section_id}`, {
          method: "PUT",
          body: JSON.stringify({ content, section_name: section.section_name })
        });
        if (response.ok) {
          toast.success("CMS section updated");
        }
      } catch (error) {
        toast.error("Failed to update");
      } finally {
        setIsSaving(false);
      }
    };

    const renderContentField = (key, value) => {
      if (typeof value === "string") {
        return (
          <div key={key}>
            <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
            {value.length > 100 ? (
              <Textarea
                value={value}
                onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                rows={4}
              />
            ) : (
              <Input
                value={value}
                onChange={(e) => setContent({ ...content, [key]: e.target.value })}
              />
            )}
          </div>
        );
      }
      if (Array.isArray(value)) {
        return (
          <div key={key}>
            <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
            <Textarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  setContent({ ...content, [key]: JSON.parse(e.target.value) });
                } catch {}
              }}
              rows={6}
              className="font-mono text-xs"
            />
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white border border-warm-grey p-6 mb-4">
        <h3 className="font-heading text-lg text-espresso mb-4">{section.section_name}</h3>
        <div className="space-y-4">
          {Object.entries(content).map(([key, value]) => renderContentField(key, value))}
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary mt-4">
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    );
  };

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-espresso transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-cream/10">
            <Link to="/" className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-gold" strokeWidth={1.5} />
              <span className="font-heading text-xl text-cream">Rina Visuals</span>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-cream/10">
            <p className="font-body text-xs text-cream/60 uppercase tracking-wider mb-1">
              Logged in as
            </p>
            <p className="font-body text-sm text-cream">{user?.name || user?.email}</p>
            <div className="mt-2">{getRoleBadge(user?.role)}</div>
          </div>

          {/* Navigation */}
          <nav className="flex-grow p-4 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }}
                data-testid={`tab-${tab.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-1 transition-colors ${
                  activeTab === tab.id
                    ? "bg-gold text-white"
                    : "text-cream/70 hover:text-cream hover:bg-cream/5"
                }`}
              >
                <tab.icon size={18} strokeWidth={1.5} />
                <span className="font-body text-sm">{tab.label}</span>
                {tab.id === "messages" && messages.filter((m) => !m.is_read).length > 0 && (
                  <span className="ml-auto bg-rose text-white text-xs px-2 py-0.5 rounded">
                    {messages.filter((m) => !m.is_read).length}
                  </span>
                )}
                {tab.id === "notifications" && notificationCount > 0 && (
                  <span className="ml-auto bg-rose text-white text-xs px-2 py-0.5 rounded">
                    {notificationCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-cream/10">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 text-cream/70 hover:text-cream transition-colors"
            >
              <Home size={18} strokeWidth={1.5} />
              <span className="font-body text-sm">View Website</span>
            </Link>
            <button
              onClick={handleLogout}
              data-testid="admin-logout"
              className="w-full flex items-center gap-3 px-4 py-3 text-cream/70 hover:text-cream transition-colors"
            >
              <LogOut size={18} strokeWidth={1.5} />
              <span className="font-body text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Header */}
        <header className="bg-white border-b border-warm-grey px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-espresso"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-heading text-2xl text-espresso capitalize">
              {activeTab.replace("-", " ")}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              disabled={isLoading}
              data-testid="refresh-btn"
              className="flex items-center gap-2 px-4 py-2 text-sm text-espresso hover:text-gold transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Bookings Tab */}
              {activeTab === "bookings" && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Package</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-text">
                              No bookings yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          bookings.map((booking) => (
                            <TableRow key={booking.booking_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-espresso">{booking.client_name}</p>
                                  <p className="text-xs text-muted-text">{booking.client_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p>{booking.event_date}</p>
                                  <p className="text-xs text-muted-text">{booking.event_time}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm">{booking.package?.name || "N/A"}</p>
                                <p className="text-xs text-gold">{booking.package?.price ? formatPrice(booking.package.price) : ""}</p>
                              </TableCell>
                              <TableCell>{getStatusBadge(booking.status)}</TableCell>
                              <TableCell>
                                {booking.payments?.length > 0 ? (
                                  <span className="text-sm text-green-600">
                                    {booking.payments.filter(p => p.status === "approved").length} approved
                                  </span>
                                ) : (
                                  <span className="text-muted-text text-sm">No payments</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <BookingDetailsDialog booking={booking} />
                                  {isAdmin && booking.status === "pending" && (
                                    <>
                                      <button
                                        onClick={() => updateBookingStatus(booking.booking_id, "confirmed_booked")}
                                        className="p-2 hover:bg-green-50 text-green-600"
                                        title="Confirm"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const reason = window.prompt("Rejection reason:");
                                          if (reason) updateBookingStatus(booking.booking_id, "rejected", reason);
                                        }}
                                        className="p-2 hover:bg-red-50 text-red-600"
                                        title="Reject"
                                      >
                                        <X size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Portfolio Tab */}
              {activeTab === "portfolio" && (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {portfolio.map((item) => (
                      <div
                        key={item.item_id}
                        className="group relative bg-white border border-warm-grey overflow-hidden"
                      >
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-espresso/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete("portfolio", item.item_id)}
                            className="p-2 bg-white text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-body text-sm text-espresso truncate">{item.title}</p>
                          <div className="flex justify-between items-center">
                            <p className="font-body text-xs text-gold uppercase">{item.category}</p>
                            {item.is_featured && <Badge>Featured</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Packages Tab */}
              {activeTab === "packages" && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Downpayment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packages.map((pkg) => (
                          <TableRow key={pkg.package_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-espresso">{pkg.name}</p>
                                <p className="text-xs text-muted-text">{pkg.duration}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{pkg.category}</TableCell>
                            <TableCell className="font-heading text-gold">{formatPrice(pkg.price)}</TableCell>
                            <TableCell>{formatPrice(pkg.downpayment_amount || pkg.price * 0.5)}</TableCell>
                            <TableCell>
                              <Badge variant={pkg.is_active ? "default" : "secondary"}>
                                {pkg.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                onClick={() => handleDelete("packages", pkg.package_id)}
                                className="p-2 hover:bg-red-50 text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Payment Methods Tab */}
              {activeTab === "payment-methods" && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentMethods.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-muted-text">
                              No payment methods configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          paymentMethods.map((method) => (
                            <TableRow key={method.method_id}>
                              <TableCell className="font-medium">{method.name}</TableCell>
                              <TableCell className="capitalize">{method.method_type.replace("_", " ")}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {method.account_name && <p>Name: {method.account_name}</p>}
                                  {method.account_number && <p>Number: {method.account_number}</p>}
                                  {method.bank_name && <p>Bank: {method.bank_name}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={method.is_active ? "default" : "secondary"}>
                                  {method.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <button
                                  onClick={() => handleDelete("payment-methods", method.method_id)}
                                  className="p-2 hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* CMS Tab */}
              {activeTab === "cms" && (
                <div>
                  {cmsSections.length === 0 ? (
                    <div className="bg-white border border-warm-grey p-10 text-center">
                      <Settings className="w-12 h-12 text-muted-text mx-auto mb-4" />
                      <p className="text-muted-text">No CMS sections found. Run seed data first.</p>
                    </div>
                  ) : (
                    cmsSections.map((section) => (
                      <CMSEditor key={section.section_id} section={section} />
                    ))
                  )}
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === "messages" && (
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="bg-white border border-warm-grey p-10 text-center">
                      <Mail className="w-12 h-12 text-muted-text mx-auto mb-4" />
                      <p className="text-muted-text">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`bg-white border p-6 ${message.is_read ? "border-warm-grey" : "border-gold"}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-heading text-lg text-espresso">{message.subject}</h3>
                            <p className="font-body text-sm text-muted-text">
                              From: {message.name} ({message.email})
                            </p>
                          </div>
                          {!message.is_read && (
                            <span className="bg-gold text-white text-xs px-2 py-1">New</span>
                          )}
                        </div>
                        <p className="font-body text-sm text-espresso-light">{message.message}</p>
                        <p className="font-body text-xs text-muted-text mt-4">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button onClick={markAllNotificationsRead} className="btn-secondary text-sm">
                      Mark All as Read
                    </button>
                  </div>
                  <div className="space-y-4">
                    {notifications.length === 0 ? (
                      <div className="bg-white border border-warm-grey p-10 text-center">
                        <Bell className="w-12 h-12 text-muted-text mx-auto mb-4" />
                        <p className="text-muted-text">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.notification_id}
                          className={`bg-white border p-4 ${notif.is_read ? "border-warm-grey" : "border-gold"}`}
                          onClick={() => !notif.is_read && markNotificationRead(notif.notification_id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-heading text-lg text-espresso">{notif.title}</h4>
                              <p className="font-body text-sm text-espresso-light">{notif.message}</p>
                            </div>
                            {!notif.is_read && (
                              <span className="bg-gold text-white text-xs px-2 py-1">New</span>
                            )}
                          </div>
                          <p className="font-body text-xs text-muted-text mt-2">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Users Tab (Super Admin only) */}
              {activeTab === "users" && isSuperAdmin && (
                <div>
                  <div className="flex justify-end mb-4">
                    <CreateUserDialog />
                  </div>
                  <div className="bg-white border border-warm-grey overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.user_id}>
                              <TableCell>{u.name}</TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>{getRoleBadge(u.role)}</TableCell>
                              <TableCell>
                                <Badge variant={u.is_active !== false ? "default" : "destructive"}>
                                  {u.is_active !== false ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {u.user_id !== user?.user_id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-2 hover:bg-cream">
                                        <ChevronDown size={16} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => updateUserRole(u.user_id, "user")}>
                                        Set as User
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateUserRole(u.user_id, "worker")}>
                                        Set as Worker
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateUserRole(u.user_id, "admin")}>
                                        Set as Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateUserRole(u.user_id, "super_admin")}>
                                        Set as Super Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => toggleUserStatus(u.user_id, !u.is_active)}
                                        className={u.is_active !== false ? "text-red-600" : "text-green-600"}
                                      >
                                        {u.is_active !== false ? "Deactivate" : "Activate"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const newPwd = window.prompt("Enter new password:");
                                          if (newPwd) {
                                            fetchWithAuth(`${API}/admin/users/${u.user_id}/password?new_password=${encodeURIComponent(newPwd)}`, { method: "PUT" })
                                              .then(() => toast.success("Password reset"))
                                              .catch(() => toast.error("Failed to reset password"));
                                          }
                                        }}
                                      >
                                        Reset Password
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Logs Tab (Super Admin only) */}
              {activeTab === "audit-logs" && isSuperAdmin && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-muted-text">
                              No audit logs yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map((log) => (
                            <TableRow key={log.log_id}>
                              <TableCell className="text-xs">
                                {new Date(log.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm">{log.user_id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.action}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.target_type} {log.target_id ? `(${log.target_id})` : ""}
                              </TableCell>
                              <TableCell className="text-xs text-muted-text max-w-xs truncate">
                                {log.details ? JSON.stringify(log.details) : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Testimonials Tab */}
              {activeTab === "testimonials" && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Featured</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testimonials.map((t) => (
                          <TableRow key={t.testimonial_id}>
                            <TableCell className="font-medium">{t.client_name}</TableCell>
                            <TableCell>{t.event_type}</TableCell>
                            <TableCell className="max-w-xs truncate">{t.content}</TableCell>
                            <TableCell>{"⭐".repeat(t.rating)}</TableCell>
                            <TableCell>
                              <Badge variant={t.is_featured ? "default" : "secondary"}>
                                {t.is_featured ? "Yes" : "No"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                onClick={() => handleDelete("testimonials", t.testimonial_id)}
                                className="p-2 hover:bg-red-50 text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Albums Tab */}
              {activeTab === "albums" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {albums.map((album) => (
                    <div key={album.album_id} className="bg-white border border-warm-grey overflow-hidden">
                      {album.cover_image ? (
                        <img src={album.cover_image} alt={album.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-cream-dark flex items-center justify-center">
                          <Image size={32} className="text-muted-text" />
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="font-heading text-lg text-espresso">{album.title}</h4>
                        <p className="text-sm text-muted-text">{album.photo_count || 0} photos</p>
                        <div className="flex gap-2 mt-2">
                          {album.tags?.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <Badge variant={album.is_visible ? "default" : "secondary"}>
                            {album.is_visible ? "Visible" : "Hidden"}
                          </Badge>
                          <button
                            onClick={() => handleDelete("albums", album.album_id)}
                            className="p-2 hover:bg-red-50 text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
