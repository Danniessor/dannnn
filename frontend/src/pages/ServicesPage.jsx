import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Camera, Sparkles } from "lucide-react";
import { API } from "../App";

export const ServicesPage = () => {
  const [packages, setPackages] = useState([]);
  const [activeTab, setActiveTab] = useState("photography");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/packages`)
      .then((res) => res.json())
      .then((data) => {
        setPackages(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const photographyPackages = packages.filter(
    (pkg) => pkg.category === "photography"
  );
  const photoboothPackages = packages.filter(
    (pkg) => pkg.category === "photobooth"
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <main data-testid="services-page" className="pt-24">
      {/* Hero */}
      <section className="section-padding bg-cream-dark">
        <div className="container-custom text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
            What We Offer
          </p>
          <h1 className="font-heading text-5xl lg:text-6xl text-espresso mb-6">
            Our Services
          </h1>
          <p className="font-body text-base text-espresso-light max-w-xl mx-auto">
            Choose from our carefully crafted packages designed to capture 
            every moment of your special occasion.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8 bg-cream border-b border-warm-grey">
        <div className="container-custom px-6">
          <div className="flex justify-center gap-4">
            <button
              data-testid="tab-photography"
              onClick={() => setActiveTab("photography")}
              className={`flex items-center gap-2 px-8 py-3 font-body text-xs uppercase tracking-widest transition-all ${
                activeTab === "photography"
                  ? "bg-gold text-white"
                  : "bg-transparent text-espresso border border-espresso hover:bg-espresso hover:text-white"
              }`}
            >
              <Camera size={16} strokeWidth={1.5} />
              Photography
            </button>
            <button
              data-testid="tab-photobooth"
              onClick={() => setActiveTab("photobooth")}
              className={`flex items-center gap-2 px-8 py-3 font-body text-xs uppercase tracking-widest transition-all ${
                activeTab === "photobooth"
                  ? "bg-gold text-white"
                  : "bg-transparent text-espresso border border-espresso hover:bg-espresso hover:text-white"
              }`}
            >
              <Sparkles size={16} strokeWidth={1.5} />
              Photobooth
            </button>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(activeTab === "photography"
                ? photographyPackages
                : photoboothPackages
              ).map((pkg, index) => (
                <div
                  key={pkg.package_id}
                  data-testid={`package-card-${index}`}
                  className={`bg-white border ${
                    index === 1
                      ? "border-gold shadow-lg scale-105"
                      : "border-warm-grey"
                  } p-8 flex flex-col transition-all hover:shadow-lg`}
                >
                  {index === 1 && (
                    <div className="bg-gold text-white text-xs uppercase tracking-widest px-4 py-1 self-start mb-4">
                      Popular
                    </div>
                  )}
                  <h3 className="font-heading text-2xl text-espresso mb-2">
                    {pkg.name}
                  </h3>
                  <p className="font-body text-sm text-espresso-light mb-6">
                    {pkg.description}
                  </p>
                  <div className="mb-6">
                    <span className="font-heading text-4xl text-gold">
                      {formatPrice(pkg.price)}
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {pkg.inclusions.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 font-body text-sm text-espresso-light"
                      >
                        <Check
                          size={16}
                          className="text-gold mt-0.5 flex-shrink-0"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/booking?package=${pkg.package_id}`}
                    data-testid={`book-package-${index}`}
                    className={`w-full text-center py-3 font-body text-xs uppercase tracking-widest transition-all ${
                      index === 1
                        ? "bg-gold text-white hover:bg-gold-dark"
                        : "border border-espresso text-espresso hover:bg-espresso hover:text-white"
                    }`}
                  >
                    Select Package
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Custom Package CTA */}
      <section className="py-16 bg-cream-dark">
        <div className="container-custom px-6 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl text-espresso mb-4">
            Need a Custom Package?
          </h2>
          <p className="font-body text-base text-espresso-light max-w-xl mx-auto mb-8">
            We can create a customized package tailored to your specific needs 
            and budget. Contact us to discuss your requirements.
          </p>
          <Link
            to="/contact"
            data-testid="custom-package-btn"
            className="btn-secondary inline-flex items-center gap-2"
          >
            Contact Us <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
};
