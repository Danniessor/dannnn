import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, isBefore, startOfToday } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, User, Mail, Phone, Upload, Check, ArrowLeft, ArrowRight, Info, CreditCard, Copy, CheckCircle } from "lucide-react";
import { Calendar as CalendarUI } from "../components/ui/calendar";
import { toast } from "sonner";
import { API } from "../App";

const steps = [
  { id: 1, title: "Select Date", icon: CalendarIcon },
  { id: 2, title: "Choose Package", icon: Check },
  { id: 3, title: "Event Details", icon: MapPin },
  { id: 4, title: "Payment", icon: CreditCard },
];

// Booking status display for tracking
const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800", description: "Your booking is awaiting review" },
  partially_paid: { label: "Awaiting Payment Verification", color: "bg-blue-100 text-blue-800", description: "We received your payment and are verifying it" },
  payment_review: { label: "Payment Under Review", color: "bg-purple-100 text-purple-800", description: "Your payment is being reviewed" },
  confirmed_booked: { label: "Confirmed", color: "bg-green-100 text-green-800", description: "Your booking is confirmed!" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", description: "Your booking was not approved" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800", description: "This booking has been cancelled" },
};

export const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [bookedDates, setBookedDates] = useState({ booked: [], pending: [] });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Track booking status
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [bookingStatus, setBookingStatus] = useState(null);

  const [formData, setFormData] = useState({
    event_date: null,
    event_time: "",
    package_id: searchParams.get("package") || "",
    client_name: "",
    client_email: "",
    client_phone: "",
    event_type: "",
    venue: "",
    special_requests: "",
    // Payment fields
    payment_method_id: "",
    payment_amount: "",
    transaction_ref: "",
    payment_proof: null,
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/packages`).then((res) => res.json()),
      fetch(`${API}/booked-dates`).then((res) => res.json()),
      fetch(`${API}/payment-methods`).then((res) => res.json()),
    ])
      .then(([pkgData, dates, pmData]) => {
        setPackages(pkgData);
        setBookedDates(dates);
        setPaymentMethods(pmData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const selectedPackage = packages.find((p) => p.package_id === formData.package_id);
  const selectedPaymentMethod = paymentMethods.find((m) => m.method_id === formData.payment_method_id);

  const isDateDisabled = (date) => {
    const today = startOfToday();
    if (isBefore(date, today)) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    // Only block confirmed dates
    return bookedDates.booked?.includes(dateStr);
  };

  const isDatePending = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookedDates.pending?.includes(dateStr);
  };

  const handleDateSelect = (date) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        event_date: date,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPG, PNG, WebP or PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum 10MB allowed");
        return;
      }
      setFormData((prev) => ({ ...prev, payment_proof: file }));
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.event_date !== null;
      case 2:
        return formData.package_id !== "";
      case 3:
        return (
          formData.client_name &&
          formData.client_email &&
          formData.client_phone &&
          formData.event_type &&
          formData.venue &&
          formData.event_time
        );
      case 4:
        return formData.payment_method_id && formData.payment_amount && formData.payment_proof;
      default:
        return false;
    }
  };

  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    try {
      // Step 1: Create booking
      const bookingResponse = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          event_date: format(formData.event_date, "yyyy-MM-dd"),
          event_time: formData.event_time,
          event_type: formData.event_type,
          venue: formData.venue,
          package_id: formData.package_id,
          special_requests: formData.special_requests || null,
        }),
      });

      if (!bookingResponse.ok) {
        const error = await bookingResponse.json();
        throw new Error(error.detail || "Booking failed");
      }

      const bookingData = await bookingResponse.json();
      const newBookingId = bookingData.booking_id;
      setBookingId(newBookingId);

      // Step 2: Submit payment proof
      const paymentFormData = new FormData();
      paymentFormData.append("payment_method_id", formData.payment_method_id);
      paymentFormData.append("amount", formData.payment_amount);
      if (formData.transaction_ref) {
        paymentFormData.append("transaction_ref", formData.transaction_ref);
      }
      paymentFormData.append("file", formData.payment_proof);

      const paymentResponse = await fetch(`${API}/bookings/${newBookingId}/payment`, {
        method: "POST",
        body: paymentFormData,
      });

      if (!paymentResponse.ok) {
        // Booking created but payment upload failed
        toast.warning("Booking created but payment upload failed. Please contact support.");
      }

      setBookingComplete(true);
      toast.success("Booking submitted successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackBooking = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a booking ID");
      return;
    }
    
    try {
      const response = await fetch(`${API}/bookings/${trackingId}/status`);
      if (!response.ok) {
        throw new Error("Booking not found");
      }
      const data = await response.json();
      setBookingStatus(data);
    } catch (error) {
      toast.error(error.message);
      setBookingStatus(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Booking Complete View
  if (bookingComplete) {
    return (
      <main data-testid="booking-complete" className="pt-24 min-h-screen bg-cream">
        <div className="container-custom px-6 py-20">
          <div className="max-w-lg mx-auto bg-white p-10 border border-warm-grey text-center">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading text-3xl text-espresso mb-4">
              Booking Submitted!
            </h2>
            <p className="font-body text-sm text-espresso-light mb-6">
              Thank you for your booking request. Your booking ID is:
            </p>
            <div className="bg-cream-dark px-4 py-3 mb-6 flex items-center justify-center gap-2">
              <code className="font-body text-sm text-gold font-medium">{bookingId}</code>
              <button
                onClick={() => copyToClipboard(bookingId, "bookingId")}
                className="p-1 hover:bg-cream rounded"
              >
                {copiedField === "bookingId" ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-muted-text" />}
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 mb-6 text-left">
              <p className="font-body text-sm text-blue-800 font-medium mb-2">What happens next?</p>
              <ul className="font-body text-xs text-blue-700 space-y-1">
                <li>• Our team will review your payment proof</li>
                <li>• You'll receive a confirmation once approved</li>
                <li>• The date will be locked in our calendar</li>
                <li>• Save your booking ID to track status</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/")}
                className="btn-secondary"
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  setBookingComplete(false);
                  setTrackingMode(true);
                  setTrackingId(bookingId);
                }}
                className="btn-primary"
              >
                Track Booking
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Tracking Mode View
  if (trackingMode) {
    return (
      <main data-testid="booking-tracking" className="pt-24 min-h-screen bg-cream">
        <div className="container-custom px-6 py-20">
          <div className="max-w-lg mx-auto">
            <div className="bg-white p-8 border border-warm-grey mb-6">
              <h2 className="font-heading text-2xl text-espresso mb-6 text-center">
                Track Your Booking
              </h2>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="Enter your booking ID"
                  className="flex-1 px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                  data-testid="tracking-input"
                />
                <button
                  onClick={handleTrackBooking}
                  className="btn-primary"
                  data-testid="track-btn"
                >
                  Track
                </button>
              </div>

              {bookingStatus && (
                <div className="border border-warm-grey p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-body text-xs text-muted-text uppercase tracking-wider">Status</span>
                    <span className={`px-3 py-1 text-xs font-medium rounded ${STATUS_CONFIG[bookingStatus.status]?.color || "bg-gray-100 text-gray-800"}`}>
                      {STATUS_CONFIG[bookingStatus.status]?.label || bookingStatus.status}
                    </span>
                  </div>
                  <p className="font-body text-sm text-espresso-light mb-4">
                    {STATUS_CONFIG[bookingStatus.status]?.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-text">Event Date</p>
                      <p className="text-espresso font-medium">{bookingStatus.event_date}</p>
                    </div>
                    <div>
                      <p className="text-muted-text">Booking ID</p>
                      <p className="text-gold font-mono text-xs">{bookingStatus.booking_id}</p>
                    </div>
                  </div>
                  {bookingStatus.payments?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-warm-grey">
                      <p className="text-muted-text text-xs mb-2">Payments</p>
                      {bookingStatus.payments.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{formatPrice(p.amount)}</span>
                          <span className={`text-xs ${p.status === "approved" ? "text-green-600" : p.status === "rejected" ? "text-red-600" : "text-yellow-600"}`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setTrackingMode(false);
                  setBookingStatus(null);
                }}
                className="font-body text-sm text-gold hover:underline"
              >
                ← Back to New Booking
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main data-testid="booking-page" className="pt-24">
      {/* Hero */}
      <section className="py-12 bg-cream-dark">
        <div className="container-custom px-6 text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
            Reserve Your Date
          </p>
          <h1 className="font-heading text-4xl lg:text-5xl text-espresso mb-4">
            Book Our Services
          </h1>
          <button
            onClick={() => setTrackingMode(true)}
            className="font-body text-sm text-gold hover:underline"
            data-testid="track-booking-link"
          >
            Already have a booking? Track status →
          </button>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="py-8 bg-cream border-b border-warm-grey">
        <div className="container-custom px-6">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 lg:gap-8 overflow-x-auto">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center gap-2 ${
                      currentStep >= step.id ? "text-gold" : "text-muted-text"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 flex items-center justify-center border ${
                        currentStep >= step.id
                          ? "border-gold bg-gold text-white"
                          : "border-muted-text"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check size={16} />
                      ) : (
                        <span className="font-body text-xs">{step.id}</span>
                      )}
                    </div>
                    <span className="font-body text-xs uppercase tracking-wider hidden sm:block">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 lg:w-16 h-px ${
                        currentStep > step.id ? "bg-gold" : "bg-warm-grey"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form Content */}
      <section className="section-padding bg-cream">
        <div className="container-custom max-w-4xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white border border-warm-grey p-6 lg:p-10">
              {/* Step 1: Select Date */}
              {currentStep === 1 && (
                <div data-testid="step-1" className="animate-fade-in">
                  <h2 className="font-heading text-2xl text-espresso mb-2">
                    Select Your Event Date
                  </h2>
                  <p className="font-body text-sm text-espresso-light mb-4">
                    Choose an available date for your event.
                  </p>
                  <div className="flex flex-wrap gap-4 mb-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300"></div>
                      <span className="text-muted-text">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-300"></div>
                      <span className="text-muted-text">Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 border border-gray-300"></div>
                      <span className="text-muted-text">Booked</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <CalendarUI
                      mode="single"
                      selected={formData.event_date}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      modifiers={{
                        pending: (date) => isDatePending(date),
                      }}
                      modifiersStyles={{
                        pending: { backgroundColor: "#FEF3C7", color: "#92400E" },
                      }}
                      className="rounded-none border border-warm-grey"
                    />
                  </div>
                  {formData.event_date && (
                    <p className="text-center mt-6 font-body text-sm text-gold">
                      Selected: {format(formData.event_date, "MMMM d, yyyy")}
                      {isDatePending(formData.event_date) && (
                        <span className="block text-xs text-yellow-600 mt-1">
                          Note: This date has a pending booking
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Choose Package */}
              {currentStep === 2 && (
                <div data-testid="step-2" className="animate-fade-in">
                  <h2 className="font-heading text-2xl text-espresso mb-2">
                    Choose Your Package
                  </h2>
                  <p className="font-body text-sm text-espresso-light mb-8">
                    Select the service package that best fits your needs.
                  </p>
                  <div className="grid gap-4">
                    {packages.map((pkg) => (
                      <label
                        key={pkg.package_id}
                        data-testid={`package-option-${pkg.package_id}`}
                        className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                          formData.package_id === pkg.package_id
                            ? "border-gold bg-gold/5"
                            : "border-warm-grey hover:border-gold/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="package_id"
                          value={pkg.package_id}
                          checked={formData.package_id === pkg.package_id}
                          onChange={handleInputChange}
                          className="mt-1 accent-gold"
                        />
                        <div className="flex-grow">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <h3 className="font-heading text-lg text-espresso">
                                {pkg.name}
                              </h3>
                              <p className="font-body text-xs uppercase tracking-wider text-gold">
                                {pkg.category} {pkg.duration && `• ${pkg.duration}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-heading text-xl text-gold block">
                                {formatPrice(pkg.price)}
                              </span>
                              <span className="font-body text-xs text-muted-text">
                                Downpayment: {formatPrice(pkg.downpayment_amount || pkg.price * 0.5)}
                              </span>
                            </div>
                          </div>
                          <p className="font-body text-sm text-espresso-light mt-2">
                            {pkg.description}
                          </p>
                          {pkg.inclusions && pkg.inclusions.length > 0 && (
                            <ul className="mt-3 space-y-1">
                              {pkg.inclusions.slice(0, 4).map((inc, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-espresso-light">
                                  <Check size={12} className="text-gold" /> {inc}
                                </li>
                              ))}
                              {pkg.inclusions.length > 4 && (
                                <li className="text-xs text-muted-text">
                                  +{pkg.inclusions.length - 4} more inclusions
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Event Details */}
              {currentStep === 3 && (
                <div data-testid="step-3" className="animate-fade-in">
                  <h2 className="font-heading text-2xl text-espresso mb-2">
                    Event Details
                  </h2>
                  <p className="font-body text-sm text-espresso-light mb-8">
                    Please provide your contact information and event details.
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Your Name *
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="text"
                          name="client_name"
                          value={formData.client_name}
                          onChange={handleInputChange}
                          data-testid="input-name"
                          className="w-full pl-10 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                          placeholder="Juan Dela Cruz"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="email"
                          name="client_email"
                          value={formData.client_email}
                          onChange={handleInputChange}
                          data-testid="input-email"
                          className="w-full pl-10 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="tel"
                          name="client_phone"
                          value={formData.client_phone}
                          onChange={handleInputChange}
                          data-testid="input-phone"
                          className="w-full pl-10 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                          placeholder="+63 912 345 6789"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Event Time *
                      </label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="time"
                          name="event_time"
                          value={formData.event_time}
                          onChange={handleInputChange}
                          data-testid="input-time"
                          className="w-full pl-10 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Event Type *
                      </label>
                      <select
                        name="event_type"
                        value={formData.event_type}
                        onChange={handleInputChange}
                        data-testid="input-event-type"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm bg-white"
                      >
                        <option value="">Select event type</option>
                        <option value="wedding">Wedding</option>
                        <option value="birthday">Birthday</option>
                        <option value="corporate">Corporate Event</option>
                        <option value="debut">Debut</option>
                        <option value="christening">Christening</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Venue *
                      </label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="text"
                          name="venue"
                          value={formData.venue}
                          onChange={handleInputChange}
                          data-testid="input-venue"
                          className="w-full pl-10 pr-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                          placeholder="Venue name & address"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        name="special_requests"
                        value={formData.special_requests}
                        onChange={handleInputChange}
                        data-testid="input-requests"
                        rows={3}
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm resize-none"
                        placeholder="Any special requests or notes..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {currentStep === 4 && (
                <div data-testid="step-4" className="animate-fade-in">
                  <h2 className="font-heading text-2xl text-espresso mb-2">
                    Payment Details
                  </h2>
                  <p className="font-body text-sm text-espresso-light mb-8">
                    Please send your downpayment and upload proof to secure your booking.
                  </p>

                  {/* Booking Summary */}
                  <div className="bg-cream-dark p-6 mb-8">
                    <h3 className="font-heading text-lg text-espresso mb-4">
                      Booking Summary
                    </h3>
                    <div className="space-y-2 font-body text-sm">
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Date:</span>
                        <span className="text-espresso font-medium">
                          {format(formData.event_date, "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Time:</span>
                        <span className="text-espresso">{formData.event_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Package:</span>
                        <span className="text-espresso">{selectedPackage?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Event Type:</span>
                        <span className="text-espresso capitalize">{formData.event_type}</span>
                      </div>
                      <div className="border-t border-warm-grey pt-2 mt-4">
                        <div className="flex justify-between">
                          <span className="text-espresso font-medium">Total Amount:</span>
                          <span className="font-heading text-xl text-gold">
                            {selectedPackage && formatPrice(selectedPackage.price)}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-espresso-light">Required Downpayment:</span>
                          <span className="text-gold font-medium">
                            {selectedPackage && formatPrice(selectedPackage.downpayment_amount || selectedPackage.price * 0.5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="mb-8">
                    <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-4">
                      Select Payment Method *
                    </label>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.method_id}
                          className={`p-4 border cursor-pointer transition-all ${
                            formData.payment_method_id === method.method_id
                              ? "border-gold bg-gold/5"
                              : "border-warm-grey hover:border-gold/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method_id"
                            value={method.method_id}
                            checked={formData.payment_method_id === method.method_id}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <CreditCard size={20} className={formData.payment_method_id === method.method_id ? "text-gold" : "text-muted-text"} />
                            <span className="font-body text-sm font-medium text-espresso">{method.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Display */}
                  {selectedPaymentMethod && (
                    <div className="bg-white border border-gold p-6 mb-8">
                      <div className="flex items-start gap-3 mb-4">
                        <Info size={20} className="text-gold mt-0.5" />
                        <div>
                          <h4 className="font-heading text-lg text-espresso">
                            {selectedPaymentMethod.name} Payment Details
                          </h4>
                          <p className="font-body text-sm text-espresso-light">
                            Send payment to the details below
                          </p>
                        </div>
                      </div>

                      {/* QR Code */}
                      {selectedPaymentMethod.method_type === "qr" && selectedPaymentMethod.qr_image_path && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={`${API}/public-uploads/qr_codes/${selectedPaymentMethod.qr_image_path.split("/").pop()}`}
                            alt="Payment QR Code"
                            className="max-w-48 border border-warm-grey"
                          />
                        </div>
                      )}

                      {/* Account Details */}
                      <div className="space-y-3">
                        {selectedPaymentMethod.account_name && (
                          <div className="flex justify-between items-center p-3 bg-cream-dark">
                            <div>
                              <p className="font-body text-xs text-muted-text">Account Name</p>
                              <p className="font-body text-sm text-espresso font-medium">{selectedPaymentMethod.account_name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedPaymentMethod.account_name, "account_name")}
                              className="p-2 hover:bg-cream rounded"
                            >
                              {copiedField === "account_name" ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-muted-text" />}
                            </button>
                          </div>
                        )}
                        {selectedPaymentMethod.account_number && (
                          <div className="flex justify-between items-center p-3 bg-cream-dark">
                            <div>
                              <p className="font-body text-xs text-muted-text">
                                {selectedPaymentMethod.method_type === "bank_details" ? "Account Number" : "Number"}
                              </p>
                              <p className="font-body text-sm text-espresso font-medium font-mono">{selectedPaymentMethod.account_number}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedPaymentMethod.account_number, "account_number")}
                              className="p-2 hover:bg-cream rounded"
                            >
                              {copiedField === "account_number" ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-muted-text" />}
                            </button>
                          </div>
                        )}
                        {selectedPaymentMethod.bank_name && (
                          <div className="flex justify-between items-center p-3 bg-cream-dark">
                            <div>
                              <p className="font-body text-xs text-muted-text">Bank</p>
                              <p className="font-body text-sm text-espresso font-medium">{selectedPaymentMethod.bank_name}</p>
                            </div>
                          </div>
                        )}
                        {selectedPaymentMethod.instructions_text && (
                          <div className="p-3 bg-blue-50 border border-blue-200">
                            <p className="font-body text-xs text-blue-800">{selectedPaymentMethod.instructions_text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Amount */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Amount Paid *
                      </label>
                      <input
                        type="number"
                        name="payment_amount"
                        value={formData.payment_amount}
                        onChange={handleInputChange}
                        data-testid="input-payment-amount"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        placeholder={selectedPackage ? (selectedPackage.downpayment_amount || selectedPackage.price * 0.5).toString() : "Enter amount"}
                      />
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Transaction Reference (Optional)
                      </label>
                      <input
                        type="text"
                        name="transaction_ref"
                        value={formData.transaction_ref}
                        onChange={handleInputChange}
                        data-testid="input-transaction-ref"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        placeholder="e.g., GCash Reference Number"
                      />
                    </div>
                  </div>

                  {/* Upload Proof */}
                  <div>
                    <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                      Upload Payment Proof *
                    </label>
                    <div className={`border-2 border-dashed p-8 text-center transition-colors ${formData.payment_proof ? "border-gold bg-gold/5" : "border-warm-grey"}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        data-testid="input-payment-proof"
                        className="hidden"
                        id="payment-proof"
                      />
                      <label htmlFor="payment-proof" className="cursor-pointer block">
                        {formData.payment_proof ? (
                          <div className="flex items-center justify-center gap-3">
                            <CheckCircle size={24} className="text-gold" />
                            <div>
                              <p className="font-body text-sm text-gold font-medium">{formData.payment_proof.name}</p>
                              <p className="font-body text-xs text-muted-text">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} className="mx-auto text-muted-text mb-4" />
                            <p className="font-body text-sm text-espresso">
                              Click to upload payment screenshot
                            </p>
                            <p className="font-body text-xs text-muted-text mt-1">
                              JPG, PNG, WebP or PDF (max 10MB)
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 pt-6 border-t border-warm-grey">
                {currentStep > 1 ? (
                  <button
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                    data-testid="btn-back"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <div />
                )}
                {currentStep < 4 ? (
                  <button
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    disabled={!canProceed()}
                    data-testid="btn-next"
                    className={`btn-primary flex items-center gap-2 ${
                      !canProceed() ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitBooking}
                    disabled={isSubmitting || !canProceed()}
                    data-testid="btn-submit"
                    className={`btn-primary flex items-center gap-2 ${
                      !canProceed() ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>Submit Booking</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
