import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Sparkles, Heart, Star, Quote } from "lucide-react";
import { API } from "../App";

export const HomePage = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    // Seed data on first load
    fetch(`${API}/seed`, { method: "POST" }).catch(() => {});
    
    // Fetch portfolio
    fetch(`${API}/portfolio?featured=true`)
      .then((res) => res.json())
      .then((data) => setPortfolio(data.slice(0, 4)))
      .catch(console.error);

    // Fetch testimonials
    fetch(`${API}/testimonials?featured=true`)
      .then((res) => res.json())
      .then(setTestimonials)
      .catch(console.error);
  }, []);

  return (
    <main data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600"
            alt="Wedding photography"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-espresso/40 to-transparent" />
        </div>

        <div className="relative z-10 container-custom px-6 lg:px-12 pt-32">
          <div className="max-w-2xl">
            <p
              className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-6 animate-fade-in-up"
              style={{ animationDelay: "100ms" }}
            >
              Photography & Photobooth Services
            </p>
            <h1
              className="font-heading text-5xl sm:text-6xl lg:text-7xl text-cream leading-none mb-8 animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              Capturing Your
              <br />
              <span className="text-gold">Precious Moments</span>
            </h1>
            <p
              className="font-body text-base lg:text-lg text-cream/80 leading-relaxed mb-10 max-w-lg animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              We specialize in creating timeless memories for your weddings, 
              birthdays, corporate events, and special celebrations.
            </p>
            <div
              className="flex flex-wrap gap-4 animate-fade-in-up"
              style={{ animationDelay: "400ms" }}
            >
              <Link
                to="/portfolio"
                data-testid="hero-portfolio-btn"
                className="btn-secondary bg-transparent text-cream border-cream hover:bg-cream hover:text-espresso"
              >
                View Portfolio
              </Link>
              <Link
                to="/booking"
                data-testid="hero-book-btn"
                className="btn-primary flex items-center gap-2"
              >
                Book Now <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-cream/50" />
        </div>
      </section>

      {/* Services Preview */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          <div className="text-center mb-16">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
              What We Offer
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl text-espresso">
              Our Services
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "Photography",
                description:
                  "Professional event photography capturing every emotion and detail of your special day.",
              },
              {
                icon: Sparkles,
                title: "Photobooth",
                description:
                  "Fun and interactive photobooth experiences with props, instant prints, and digital sharing.",
              },
              {
                icon: Heart,
                title: "Weddings",
                description:
                  "Comprehensive wedding coverage from preparation to reception, preserving your love story.",
              },
            ].map((service, index) => (
              <div
                key={index}
                data-testid={`service-card-${index}`}
                className="group bg-white p-10 border border-warm-grey hover:shadow-lg transition-all duration-500"
              >
                <service.icon
                  className="w-10 h-10 text-gold mb-6 group-hover:scale-110 transition-transform"
                  strokeWidth={1}
                />
                <h3 className="font-heading text-2xl text-espresso mb-4">
                  {service.title}
                </h3>
                <p className="font-body text-sm text-espresso-light leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/services"
              data-testid="view-services-btn"
              className="btn-secondary inline-flex items-center gap-2"
            >
              View All Services <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Portfolio */}
      <section className="section-padding bg-cream-dark">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
            <div>
              <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
                Our Work
              </p>
              <h2 className="font-heading text-4xl lg:text-5xl text-espresso">
                Featured Portfolio
              </h2>
            </div>
            <Link
              to="/portfolio"
              data-testid="view-all-portfolio-btn"
              className="font-body text-sm uppercase tracking-wider text-espresso hover:text-gold transition-colors flex items-center gap-2"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {portfolio.map((item, index) => (
              <Link
                key={item.item_id}
                to="/portfolio"
                data-testid={`portfolio-item-${index}`}
                className={`relative group overflow-hidden ${
                  index === 0 ? "col-span-2 row-span-2" : ""
                }`}
              >
                <div
                  className={`${
                    index === 0 ? "aspect-square" : "aspect-[4/5]"
                  } overflow-hidden`}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h4 className="font-heading text-lg text-cream">{item.title}</h4>
                  <p className="font-body text-xs uppercase tracking-wider text-gold">
                    {item.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="section-padding bg-cream">
          <div className="container-custom">
            <div className="text-center mb-16">
              <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
                Testimonials
              </p>
              <h2 className="font-heading text-4xl lg:text-5xl text-espresso">
                What Our Clients Say
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.testimonial_id}
                  data-testid={`testimonial-${index}`}
                  className="bg-white p-8 border border-warm-grey relative"
                >
                  <Quote className="w-8 h-8 text-gold/30 absolute top-6 right-6" />
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="font-body text-sm text-espresso-light leading-relaxed mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-heading text-lg text-espresso">
                      {testimonial.client_name}
                    </p>
                    <p className="font-body text-xs uppercase tracking-wider text-gold">
                      {testimonial.event_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1600"
            alt="Event photography"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-espresso/70" />
        </div>
        <div className="relative z-10 container-custom px-6 text-center">
          <h2 className="font-heading text-4xl lg:text-5xl text-cream mb-6">
            Ready to Book Your Session?
          </h2>
          <p className="font-body text-base text-cream/80 max-w-xl mx-auto mb-10">
            Let us help you capture the moments that matter most. Contact us today
            to discuss your event and reserve your date.
          </p>
          <Link
            to="/booking"
            data-testid="cta-book-btn"
            className="btn-primary inline-flex items-center gap-2"
          >
            Book Your Date <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
};
