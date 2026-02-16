import React, { useState, useEffect } from "react";
import { API } from "../App";
import { Lightbox } from "../components/Lightbox";

const categories = [
  { value: "all", label: "All" },
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "photobooth", label: "Photobooth" },
];

export const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [filteredPortfolio, setFilteredPortfolio] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/portfolio`)
      .then((res) => res.json())
      .then((data) => {
        setPortfolio(data);
        setFilteredPortfolio(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeCategory === "all") {
      setFilteredPortfolio(portfolio);
    } else {
      setFilteredPortfolio(
        portfolio.filter((item) => item.category === activeCategory)
      );
    }
  }, [activeCategory, portfolio]);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () =>
    setLightboxIndex((prev) => Math.max(0, prev - 1));
  const nextImage = () =>
    setLightboxIndex((prev) =>
      Math.min(filteredPortfolio.length - 1, prev + 1)
    );

  return (
    <main data-testid="portfolio-page" className="pt-24">
      {/* Hero */}
      <section className="section-padding bg-cream-dark">
        <div className="container-custom text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold mb-4">
            Our Work
          </p>
          <h1 className="font-heading text-5xl lg:text-6xl text-espresso mb-6">
            Portfolio
          </h1>
          <p className="font-body text-base text-espresso-light max-w-xl mx-auto">
            Browse through our collection of captured moments from weddings, 
            birthdays, corporate events, and photobooth sessions.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 bg-cream border-b border-warm-grey">
        <div className="container-custom px-6">
          <div className="flex flex-wrap justify-center gap-2 lg:gap-4">
            {categories.map((cat) => (
              <button
                key={cat.value}
                data-testid={`filter-${cat.value}`}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-6 py-2 font-body text-xs uppercase tracking-widest transition-all ${
                  activeCategory === cat.value
                    ? "bg-gold text-white"
                    : "bg-transparent text-espresso hover:bg-warm-grey"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section-padding bg-cream">
        <div className="container-custom">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPortfolio.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-body text-espresso-light">
                No items found in this category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPortfolio.map((item, index) => (
                <div
                  key={item.item_id}
                  data-testid={`gallery-item-${index}`}
                  onClick={() => openLightbox(index)}
                  className="group cursor-pointer relative overflow-hidden aspect-[4/5]"
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-espresso/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="font-heading text-lg text-cream">
                      {item.title}
                    </h4>
                    <p className="font-body text-xs uppercase tracking-wider text-gold">
                      {item.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={filteredPortfolio}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </main>
  );
};
