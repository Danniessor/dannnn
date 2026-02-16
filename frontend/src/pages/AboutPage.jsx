import React from "react";
import { Camera, Award, Heart, Users } from "lucide-react";

export const AboutPage = () => {
  return (
    <main data-testid="about-page" className="pt-24">
      {/* Hero */}
      <section className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1600"
            alt="About us"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-espresso/60" />
        </div>
        <div className="relative z-10 container-custom px-6 text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
            Our Story
          </p>
          <h1 className="font-heading text-5xl lg:text-6xl text-cream">
            About Rina Visuals
          </h1>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
                Who We Are
              </p>
              <h2 className="font-heading text-4xl lg:text-5xl text-espresso mb-6">
                Capturing Life's
                <br />
                <span className="text-gold">Beautiful Moments</span>
              </h2>
              <div className="space-y-4 font-body text-base text-espresso-light leading-relaxed">
                <p>
                  Founded in 2015, Rina Visuals began with a simple passion: to capture 
                  the authentic emotions and precious moments that make life beautiful. 
                  What started as a one-person venture has grown into a dedicated team 
                  of creative professionals.
                </p>
                <p>
                  We specialize in wedding photography, event coverage, and photobooth 
                  services, bringing our artistic vision and technical expertise to 
                  every occasion. Our approach combines candid storytelling with timeless 
                  elegance, ensuring that every photograph tells a unique story.
                </p>
                <p>
                  Over the years, we've had the privilege of documenting hundreds of 
                  weddings, birthdays, corporate events, and special celebrations. Each 
                  event has taught us something new and reinforced our belief that every 
                  moment deserves to be captured beautifully.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1554080353-a576cf803bda?w=800"
                alt="Photographer at work"
                className="w-full"
              />
              <div className="absolute -bottom-8 -left-8 bg-gold p-6 hidden lg:block">
                <p className="font-heading text-4xl text-white">10+</p>
                <p className="font-body text-xs uppercase tracking-wider text-white/80">
                  Years Experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding bg-cream-dark">
        <div className="container-custom">
          <div className="text-center mb-16">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
              Our Values
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl text-espresso">
              What Drives Us
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Camera,
                title: "Artistry",
                description:
                  "We approach each shoot as an opportunity to create art, blending creativity with technical excellence.",
              },
              {
                icon: Heart,
                title: "Passion",
                description:
                  "Our love for photography shows in every image. We're genuinely excited to capture your special moments.",
              },
              {
                icon: Award,
                title: "Excellence",
                description:
                  "We hold ourselves to the highest standards, continuously improving our craft and service.",
              },
              {
                icon: Users,
                title: "Connection",
                description:
                  "We build genuine relationships with our clients, making them feel comfortable and at ease.",
              },
            ].map((value, index) => (
              <div
                key={index}
                data-testid={`value-card-${index}`}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gold/10 flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-gold" strokeWidth={1} />
                </div>
                <h3 className="font-heading text-xl text-espresso mb-3">
                  {value.title}
                </h3>
                <p className="font-body text-sm text-espresso-light leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-espresso">
        <div className="container-custom px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: "500+", label: "Events Covered" },
              { number: "300+", label: "Happy Couples" },
              { number: "50K+", label: "Photos Delivered" },
              { number: "10+", label: "Years Experience" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="font-heading text-4xl lg:text-5xl text-gold mb-2">
                  {stat.number}
                </p>
                <p className="font-body text-xs uppercase tracking-wider text-cream/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          <div className="text-center mb-16">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
              Meet The Team
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl text-espresso">
              The People Behind The Lens
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Rina Santos",
                role: "Founder & Lead Photographer",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
              },
              {
                name: "Marco Reyes",
                role: "Senior Photographer",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
              },
              {
                name: "Sofia Cruz",
                role: "Photobooth Specialist",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
              },
            ].map((member, index) => (
              <div
                key={index}
                data-testid={`team-member-${index}`}
                className="text-center group"
              >
                <div className="relative overflow-hidden mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full aspect-[3/4] object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <h3 className="font-heading text-xl text-espresso mb-1">
                  {member.name}
                </h3>
                <p className="font-body text-xs uppercase tracking-wider text-gold">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
