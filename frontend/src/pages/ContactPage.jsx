import React, { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Instagram, Facebook } from "lucide-react";
import { toast } from "sonner";
import { API } from "../App";

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main data-testid="contact-page" className="pt-24">
      {/* Hero */}
      <section className="section-padding bg-cream-dark">
        <div className="container-custom text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
            Get In Touch
          </p>
          <h1 className="font-heading text-5xl lg:text-6xl text-espresso mb-6">
            Contact Us
          </h1>
          <p className="font-body text-base text-espresso-light max-w-xl mx-auto">
            Have questions about our services? Want to book a session? 
            We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h2 className="font-heading text-2xl text-espresso mb-8">
                Contact Information
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="font-body text-sm font-medium text-espresso mb-1">
                      Location
                    </h4>
                    <p className="font-body text-sm text-espresso-light">
                      123 Creative Street<br />
                      Makati City, Metro Manila<br />
                      Philippines 1200
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="font-body text-sm font-medium text-espresso mb-1">
                      Phone
                    </h4>
                    <p className="font-body text-sm text-espresso-light">
                      +63 912 345 6789
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="font-body text-sm font-medium text-espresso mb-1">
                      Email
                    </h4>
                    <p className="font-body text-sm text-espresso-light">
                      hello@rinavisuals.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="font-body text-sm font-medium text-espresso mb-1">
                      Office Hours
                    </h4>
                    <p className="font-body text-sm text-espresso-light">
                      Monday - Saturday<br />
                      9:00 AM - 6:00 PM
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-10">
                <h4 className="font-body text-sm font-medium text-espresso mb-4">
                  Follow Us
                </h4>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="contact-instagram"
                    className="w-10 h-10 bg-espresso flex items-center justify-center text-cream hover:bg-gold transition-colors"
                  >
                    <Instagram size={18} />
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="contact-facebook"
                    className="w-10 h-10 bg-espresso flex items-center justify-center text-cream hover:bg-gold transition-colors"
                  >
                    <Facebook size={18} />
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-warm-grey p-8 lg:p-10">
                <h2 className="font-heading text-2xl text-espresso mb-2">
                  Send Us a Message
                </h2>
                <p className="font-body text-sm text-espresso-light mb-8">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        data-testid="contact-name"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        data-testid="contact-email"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        data-testid="contact-phone"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm"
                        placeholder="+63 912 345 6789"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        data-testid="contact-subject"
                        className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm bg-white"
                      >
                        <option value="">Select a subject</option>
                        <option value="booking">Booking Inquiry</option>
                        <option value="pricing">Pricing Question</option>
                        <option value="availability">Availability Check</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-xs uppercase tracking-wider text-espresso-light mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      data-testid="contact-message"
                      className="w-full px-4 py-3 border border-warm-grey focus:border-gold outline-none font-body text-sm resize-none"
                      placeholder="Tell us about your event or inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="contact-submit"
                    className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="h-96 bg-cream-dark">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.8024756703424!2d121.01381831527066!3d14.556667989833726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c90264a0ed01%3A0x2b066ed57830cace!2sMakati%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1629876543210!5m2!1sen!2sph"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          title="Rina Visuals Location"
          data-testid="contact-map"
        />
      </section>
    </main>
  );
};
