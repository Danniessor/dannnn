import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

const tabs = [
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "portfolio", label: "Portfolio", icon: Image },
  { id: "packages", label: "Packages", icon: Package },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "users", label: "Users", icon: Users },
];

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookings");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState({
    bookings: [],
    portfolio: [],
    packages: [],
    messages: [],
    users: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const token = localStorage.getItem("token");

  const fetchWithAuth = async (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookings, portfolio, packages, messages, users] = await Promise.all([
        fetchWithAuth(`${API}/admin/bookings`).then((r) => r.json()),
        fetchWithAuth(`${API}/portfolio`).then((r) => r.json()),
        fetchWithAuth(`${API}/admin/packages`).then((r) => r.json()),
        fetchWithAuth(`${API}/admin/messages`).then((r) => r.json()),
        fetchWithAuth(`${API}/admin/users`).then((r) => r.json()),
      ]);
      setData({ bookings, portfolio, packages, messages, users });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetchWithAuth(
        `${API}/admin/bookings/${bookingId}?status=${status}`,
        { method: "PUT" }
      );
      if (response.ok) {
        toast.success(`Booking ${status}`);
        fetchData();
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  const deletePortfolioItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const response = await fetchWithAuth(`${API}/admin/portfolio/${itemId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Portfolio item deleted");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const response = await fetchWithAuth(
        `${API}/admin/users/${userId}/role?role=${role}`,
        { method: "PUT" }
      );
      if (response.ok) {
        toast.success("User role updated");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const markMessageRead = async (messageId) => {
    try {
      await fetchWithAuth(`${API}/admin/messages/${messageId}/read`, {
        method: "PUT",
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 text-xs uppercase tracking-wider ${
          variants[status] || variants.pending
        }`}
      >
        {status}
      </span>
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
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
          </div>

          {/* Navigation */}
          <nav className="flex-grow p-4">
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
                {tab.id === "messages" && data.messages.filter((m) => !m.is_read).length > 0 && (
                  <span className="ml-auto bg-rose text-white text-xs px-2 py-0.5">
                    {data.messages.filter((m) => !m.is_read).length}
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
              {activeTab}
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            data-testid="refresh-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm text-espresso hover:text-gold transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
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
                          <TableHead>Event Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.bookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-text">
                              No bookings yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.bookings.map((booking) => (
                            <TableRow key={booking.booking_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-espresso">
                                    {booking.client_name}
                                  </p>
                                  <p className="text-xs text-muted-text">
                                    {booking.client_email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{booking.event_date}</TableCell>
                              <TableCell className="capitalize">{booking.event_type}</TableCell>
                              <TableCell>{getStatusBadge(booking.status)}</TableCell>
                              <TableCell>
                                {booking.payment_proof_url ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <button className="text-gold hover:underline text-sm">
                                        View Proof
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Payment Proof</DialogTitle>
                                      </DialogHeader>
                                      <img
                                        src={booking.payment_proof_url}
                                        alt="Payment proof"
                                        className="w-full"
                                      />
                                    </DialogContent>
                                  </Dialog>
                                ) : (
                                  <span className="text-muted-text text-sm">Not uploaded</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <button
                                        className="p-2 hover:bg-cream"
                                        data-testid={`view-booking-${booking.booking_id}`}
                                      >
                                        <Eye size={16} />
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                      <DialogHeader>
                                        <DialogTitle>Booking Details</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 mt-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <p className="text-muted-text">Client Name</p>
                                            <p className="text-espresso">{booking.client_name}</p>
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
                                            <p className="text-muted-text">Event Type</p>
                                            <p className="text-espresso capitalize">{booking.event_type}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-text">Date</p>
                                            <p className="text-espresso">{booking.event_date}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-text">Time</p>
                                            <p className="text-espresso">{booking.event_time}</p>
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
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  {booking.status === "pending" && (
                                    <>
                                      <button
                                        onClick={() => updateBookingStatus(booking.booking_id, "confirmed")}
                                        className="p-2 hover:bg-green-50 text-green-600"
                                        data-testid={`confirm-booking-${booking.booking_id}`}
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        onClick={() => updateBookingStatus(booking.booking_id, "rejected")}
                                        className="p-2 hover:bg-red-50 text-red-600"
                                        data-testid={`reject-booking-${booking.booking_id}`}
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
                    {data.portfolio.map((item) => (
                      <div
                        key={item.item_id}
                        className="group relative bg-white border border-warm-grey overflow-hidden"
                      >
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-espresso/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => deletePortfolioItem(item.item_id)}
                            className="p-2 bg-white text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-body text-sm text-espresso truncate">
                            {item.title}
                          </p>
                          <p className="font-body text-xs text-gold uppercase">
                            {item.category}
                          </p>
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
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.packages.map((pkg) => (
                          <TableRow key={pkg.package_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-espresso">{pkg.name}</p>
                                <p className="text-xs text-muted-text">{pkg.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{pkg.category}</TableCell>
                            <TableCell className="font-heading text-gold">
                              {formatPrice(pkg.price)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pkg.is_active ? "default" : "secondary"}>
                                {pkg.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === "messages" && (
                <div className="space-y-4">
                  {data.messages.length === 0 ? (
                    <div className="bg-white border border-warm-grey p-10 text-center">
                      <Mail className="w-12 h-12 text-muted-text mx-auto mb-4" />
                      <p className="text-muted-text">No messages yet</p>
                    </div>
                  ) : (
                    data.messages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`bg-white border p-6 ${
                          message.is_read ? "border-warm-grey" : "border-gold"
                        }`}
                        onClick={() => !message.is_read && markMessageRead(message.message_id)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-heading text-lg text-espresso">
                              {message.subject}
                            </h3>
                            <p className="font-body text-sm text-muted-text">
                              From: {message.name} ({message.email})
                            </p>
                          </div>
                          {!message.is_read && (
                            <span className="bg-gold text-white text-xs px-2 py-1">New</span>
                          )}
                        </div>
                        <p className="font-body text-sm text-espresso-light">
                          {message.message}
                        </p>
                        <p className="font-body text-xs text-muted-text mt-4">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className="bg-white border border-warm-grey overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.users.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {u.user_id !== user?.user_id && (
                                <button
                                  onClick={() =>
                                    updateUserRole(
                                      u.user_id,
                                      u.role === "admin" ? "user" : "admin"
                                    )
                                  }
                                  className="text-sm text-gold hover:underline"
                                  data-testid={`toggle-role-${u.user_id}`}
                                >
                                  Make {u.role === "admin" ? "User" : "Admin"}
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
