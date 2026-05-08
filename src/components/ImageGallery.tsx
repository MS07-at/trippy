"use client";

import { useState, useEffect, useCallback } from "react";

export function Lightbox({
  imageUrls,
  alt,
  initialIndex = 0,
  onClose,
}: {
  imageUrls: string[];
  alt: string;
  initialIndex?: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  const goPrev = useCallback(
    () => setCurrent((c) => (c - 1 + imageUrls.length) % imageUrls.length),
    [imageUrls.length],
  );
  const goNext = useCallback(
    () => setCurrent((c) => (c + 1) % imageUrls.length),
    [imageUrls.length],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10"
      >
        &times;
      </button>

      <div
        className="relative flex items-center justify-center flex-1 w-full px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrls.length > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-4 text-white/70 hover:text-white text-4xl leading-none z-10"
          >
            &#8249;
          </button>
        )}

        <img
          src={imageUrls[current]}
          alt={`${alt} ${current + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-lg select-none"
        />

        {imageUrls.length > 1 && (
          <button
            onClick={goNext}
            className="absolute right-4 text-white/70 hover:text-white text-4xl leading-none z-10"
          >
            &#8250;
          </button>
        )}
      </div>

      {imageUrls.length > 1 && (
        <div
          className="flex gap-2 py-4 overflow-x-auto max-w-full px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {imageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                i === current
                  ? "border-white scale-110"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {imageUrls.length > 1 && (
        <div className="text-white/60 text-sm pb-4">
          {current + 1} / {imageUrls.length}
        </div>
      )}
    </div>
  );
}

export function ImageGallery({
  imageUrls,
  alt,
  onRemove,
}: {
  imageUrls: string[];
  alt: string;
  onRemove?: (index: number) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (imageUrls.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden bg-stone-100">
          <img
            src={imageUrls[selected]}
            alt={`${alt} ${selected + 1}`}
            className="w-full h-48 object-cover cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          />
          {onRemove && (
            <button
              onClick={() => onRemove(selected)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
              title="Remove image"
            >
              &times;
            </button>
          )}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={() =>
                  setSelected((s) => (s - 1 + imageUrls.length) % imageUrls.length)
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                &#8249;
              </button>
              <button
                onClick={() =>
                  setSelected((s) => (s + 1) % imageUrls.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                &#8250;
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                {selected + 1} / {imageUrls.length}
              </div>
            </>
          )}
        </div>
        {imageUrls.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-12 h-12 rounded overflow-hidden shrink-0 border-2 transition-colors ${
                  i === selected ? "border-amber-500" : "border-transparent"
                }`}
              >
                <img
                  src={url}
                  alt={`${alt} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {lightboxOpen && (
        <Lightbox
          imageUrls={imageUrls}
          alt={alt}
          initialIndex={selected}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

export function MiniImageGallery({
  imageUrls,
  alt,
}: {
  imageUrls: string[];
  alt: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (imageUrls.length === 0) return null;

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => setLightboxOpen(true)}
      >
        {imageUrls.length === 1 ? (
          <img
            src={imageUrls[0]}
            alt={alt}
            className="w-16 h-16 rounded object-cover shrink-0"
          />
        ) : (
          <div className="relative w-16 h-16 shrink-0">
            <img
              src={imageUrls[0]}
              alt={alt}
              className="w-16 h-16 rounded object-cover"
            />
            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl rounded-br">
              +{imageUrls.length - 1}
            </div>
          </div>
        )}
      </div>
      {lightboxOpen && (
        <Lightbox
          imageUrls={imageUrls}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
