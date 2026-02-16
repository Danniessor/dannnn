import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export const Lightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  if (currentIndex === null || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      data-testid="lightbox-overlay"
      className="fixed inset-0 z-[100] bg-espresso/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        data-testid="lightbox-close"
        onClick={onClose}
        className="absolute top-6 right-6 text-cream/80 hover:text-cream transition-colors z-10"
      >
        <X size={32} strokeWidth={1} />
      </button>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <button
          data-testid="lightbox-prev"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 md:left-8 text-cream/80 hover:text-cream transition-colors z-10"
        >
          <ChevronLeft size={48} strokeWidth={1} />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.image_url}
          alt={currentImage.title}
          className="max-w-full max-h-[75vh] object-contain animate-fade-in"
        />
        <div className="mt-6 text-center">
          <h3 className="font-heading text-2xl text-cream">{currentImage.title}</h3>
          {currentImage.description && (
            <p className="font-body text-sm text-cream/60 mt-2">
              {currentImage.description}
            </p>
          )}
        </div>
      </div>

      {/* Next Button */}
      {currentIndex < images.length - 1 && (
        <button
          data-testid="lightbox-next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 md:right-8 text-cream/80 hover:text-cream transition-colors z-10"
        >
          <ChevronRight size={48} strokeWidth={1} />
        </button>
      )}

      {/* Image Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-body text-sm text-cream/60">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};
