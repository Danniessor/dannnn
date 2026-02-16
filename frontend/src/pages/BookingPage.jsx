import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, isBefore, startOfToday } from "date-fns";
import { Calendar, Clock, MapPin, User, Mail, Phone, Upload, Check, ArrowLeft, ArrowRight, Info } from "lucide-react";
import { Calendar as CalendarUI } from "../components/ui/calendar";
import { toast } from "sonner";
import { API } from "../App";

const steps = [
  { id: 1, title: "Select Date", icon: Calendar },
  { id: 2, title: "Choose Package", icon: Check },
  { id: 3, title: "Event Details", icon: MapPin },
  { id: 4, title: "Payment", icon: Upload },
];

export const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState(null);

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
    payment_proof: null,
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/packages`).then((res) => res.json()),
      fetch(`${API}/booked-dates`).then((res) => res.json()),
    ])
      .then(([pkgData, dates]) => {
        setPackages(pkgData);
        setBookedDates(dates);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const selectedPackage = packages.find((p) => p.package_id === formData.package_id);

  const isDateDisabled = (date) => {
    const today = startOfToday();
    if (isBefore(date, today)) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return bookedDates.includes(dateStr);
  };

  const handleDateSelect = (date) => {
    if (!isDateDisabled(date)) {
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
      setFormData((prev) => ({ ...prev, payment_proof: file }));
    }
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
        return true; // Payment proof is optional initially
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create booking
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
      setBookingId(bookingData.booking_id);

      // Upload payment proof if provided
      if (formData.payment_proof) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", formData.payment_proof);

        await fetch(`${API}/bookings/${bookingData.booking_id}/upload-payment`, {
          method: "POST",
          body: formDataUpload,
        });
      }

      setBookingComplete(true);
      toast.success("Booking submitted successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (bookingComplete) {
    return (
      <main data-testid="booking-complete" className="pt-24 min-h-screen bg-cream">
        <div className="container-custom px-6 py-20">
          <div className="max-w-lg mx-auto bg-white p-10 border border-warm-grey text-center">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading text-3xl text-espresso mb-4">
              Booking Submitted!
            </h2>
            <p className="font-body text-sm text-espresso-light mb-6">
              Thank you for your booking request. Your booking ID is:
            </p>
            <div className="bg-cream-dark px-4 py-2 mb-6">
              <code className="font-body text-sm text-gold">{bookingId}</code>
            </div>
            <p className="font-body text-sm text-espresso-light mb-8">
              We will review your booking and payment proof. You will receive a 
              confirmation email once your booking is approved.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-primary"
            >
              Back to Home
            </button>
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
          <h1 className="font-heading text-4xl lg:text-5xl text-espresso">
            Book Our Services
          </h1>
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
                  <p className="font-body text-sm text-espresso-light mb-8">
                    Choose an available date for your event. Greyed out dates are 
                    already booked.
                  </p>
                  <div className="flex justify-center">
                    <CalendarUI
                      mode="single"
                      selected={formData.event_date}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      className="rounded-none border border-warm-grey"
                    />
                  </div>
                  {formData.event_date && (
                    <p className="text-center mt-6 font-body text-sm text-gold">
                      Selected: {format(formData.event_date, "MMMM d, yyyy")}
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
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-heading text-lg text-espresso">
                                {pkg.name}
                              </h3>
                              <p className="font-body text-xs uppercase tracking-wider text-gold">
                                {pkg.category}
                              </p>
                            </div>
                            <span className="font-heading text-xl text-gold">
                              {formatPrice(pkg.price)}
                            </span>
                          </div>
                          <p className="font-body text-sm text-espresso-light mt-2">
                            {pkg.description}
                          </p>
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
                    Please send your downpayment to secure your booking.
                  </p>

                  {/* Booking Summary */}
                  <div className="bg-cream-dark p-6 mb-8">
                    <h3 className="font-heading text-lg text-espresso mb-4">
                      Booking Summary
                    </h3>
                    <div className="space-y-2 font-body text-sm">
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Date:</span>
                        <span className="text-espresso">
                          {format(formData.event_date, "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Time:</span>
                        <span className="text-espresso">{formData.event_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Package:</span>
                        <span className="text-espresso">
                          {selectedPackage?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Event Type:</span>
                        <span className="text-espresso capitalize">
                          {formData.event_type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-espresso-light">Venue:</span>
                        <span className="text-espresso">{formData.venue}</span>
                      </div>
                      <div className="border-t border-warm-grey pt-2 mt-4">
                        <div className="flex justify-between">
                          <span className="text-espresso font-medium">
                            Total Amount:
                          </span>
                          <span className="font-heading text-xl text-gold">
                            {selectedPackage && formatPrice(selectedPackage.price)}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-espresso-light">
                            Required Downpayment (50%):
                          </span>
                          <span className="text-gold">
                            {selectedPackage &&
                              formatPrice(selectedPackage.price * 0.5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-white border border-warm-grey p-6 mb-8">
                    <div className="flex items-start gap-3 mb-4">
                      <Info size={20} className="text-gold mt-0.5" />
                      <div>
                        <h4 className="font-heading text-lg text-espresso">
                          Payment Instructions
                        </h4>
                        <p className="font-body text-sm text-espresso-light">
                          Please send your downpayment via any of the following:
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 pl-8">
                      <div>
                        <p className="font-body text-sm font-medium text-espresso">
                          Bank Transfer (BDO)
                        </p>
                        <p className="font-body text-sm text-espresso-light">
                          Account Name: Rina Visuals Corp.
                        </p>
                        <p className="font-body text-sm text-espresso-light">
                          Account Number: 1234-5678-9012
                        </p>
                      </div>
                      <div>
                        <p className="font-body text-sm font-medium text-espresso">
                          GCash
                        </p>
                        <p className="font-body text-sm text-espresso-light">
                          Number: 0917-123-4567
                        </p>
                        <p className="font-body text-sm text-espresso-light">
                          Name: Rina Santos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Proof */}
                  <div>
                    <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                      Upload Payment Proof (Optional - can be uploaded later)
                    </label>
                    <div className="border-2 border-dashed border-warm-grey p-8 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        data-testid="input-payment-proof"
                        className="hidden"
                        id="payment-proof"
                      />
                      <label
                        htmlFor="payment-proof"
                        className="cursor-pointer block"
                      >
                        <Upload size={32} className="mx-auto text-muted-text mb-4" />
                        {formData.payment_proof ? (
                          <p className="font-body text-sm text-gold">
                            {formData.payment_proof.name}
                          </p>
                        ) : (
                          <>
                            <p className="font-body text-sm text-espresso">
                              Click to upload payment screenshot
                            </p>
                            <p className="font-body text-xs text-muted-text mt-1">
                              PNG, JPG up to 10MB
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
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    data-testid="btn-submit"
                    className="btn-primary flex items-center gap-2"
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
