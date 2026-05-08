"use client";

import { useState } from "react";

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

  if (imageUrls.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-stone-100">
        <img
          src={imageUrls[selected]}
          alt={`${alt} ${selected + 1}`}
          className="w-full h-48 object-cover"
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
  );
}

export function MiniImageGallery({
  imageUrls,
  alt,
}: {
  imageUrls: string[];
  alt: string;
}) {
  if (imageUrls.length === 0) return null;

  if (imageUrls.length === 1) {
    return (
      <img
        src={imageUrls[0]}
        alt={alt}
        className="w-16 h-16 rounded object-cover shrink-0"
      />
    );
  }

  return (
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
  );
}
