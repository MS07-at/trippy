"use client";

import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { ImageUpload } from "./ImageUpload";
import { ImageGallery, MiniImageGallery } from "./ImageGallery";

type Apartment = {
  _id: Id<"apartments">;
  destinationId: Id<"destinations">;
  name: string;
  url?: string;
  expectedPrice: number;
  imageIds?: Id<"_storage">[];
  imageUrls: string[];
  notes?: string;
  isSelected: boolean;
};

export function ApartmentSection({
  apartments,
  destinationId,
  priceRange,
  isOwner,
  ownerToken,
  nights,
  people,
}: {
  apartments: Apartment[];
  destinationId: Id<"destinations">;
  priceRange: { min: number; max: number } | null;
  isOwner: boolean;
  ownerToken: string;
  nights?: number;
  people?: number;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [expandedApt, setExpandedApt] = useState<Id<"apartments"> | null>(null);

  const addApartment = useMutation(api.apartments.add);
  const toggleSelected = useMutation(api.apartments.toggleSelected);
  const removeApartment = useMutation(api.apartments.remove);
  const addAptImage = useMutation(api.apartments.addImage);
  const removeAptImage = useMutation(api.apartments.removeImage);
  const storeFromUrl = useAction(api.files.storeFromUrl);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    await addApartment({
      destinationId,
      name: name.trim(),
      url: url.trim() || undefined,
      expectedPrice: parseFloat(price),
      notes: notes.trim() || undefined,
      ownerToken,
    });
    setName("");
    setUrl("");
    setPrice("");
    setNotes("");
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-stone-700">Apartments</h4>
        {priceRange && (
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            {nights && people
              ? <>Range: &euro;{Math.round(priceRange.min * nights / people)}&ndash;&euro;{Math.round(priceRange.max * nights / people)}/person</>
              : <>Range: &euro;{priceRange.min}&ndash;&euro;{priceRange.max}/night</>}
          </span>
        )}
      </div>

      {apartments.length > 0 ? (
        <div className="space-y-2">
          {apartments.map((apt) => (
            <div
              key={apt._id}
              className={`rounded-lg border px-3 py-2 ${
                apt.isSelected
                  ? "border-green-300 bg-green-50"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {apt.imageUrls.length > 0 && (
                  <button
                    onClick={() =>
                      setExpandedApt(expandedApt === apt._id ? null : apt._id)
                    }
                    className="shrink-0"
                  >
                    <MiniImageGallery imageUrls={apt.imageUrls} alt={apt.name} />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{apt.name}</span>
                    {apt.isSelected && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        Picked
                      </span>
                    )}
                    <span className="text-sm text-stone-500">
                      {nights && people
                        ? <>&euro;{Math.round(apt.expectedPrice * nights / people)}/person</>
                        : <>&euro;{apt.expectedPrice}/night</>}
                    </span>
                  </div>
                  {apt.url && (
                    <a
                      href={apt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1"
                    >
                      {apt.url.includes("booking.com") ? (
                        <>
                          <span className="inline-block w-3 h-3 bg-blue-700 rounded-sm text-white text-[8px] font-bold leading-3 text-center">
                            B
                          </span>
                          View on Booking.com
                        </>
                      ) : (
                        "View listing"
                      )}
                    </a>
                  )}
                  {apt.notes && (
                    <p className="text-xs text-stone-400 mt-0.5">{apt.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isOwner && (
                    <>
                      <ImageUpload
                        onUpload={async (imageId) => {
                          await addAptImage({
                            id: apt._id,
                            imageId,
                            ownerToken,
                          });
                        }}
                        label="+"
                        small
                        multiple
                      />
                      {apt.url && apt.url.includes("booking.com") && (
                        <BookingImageExtractor
                          url={apt.url}
                          onImagesStored={async (imageIds) => {
                            for (const imageId of imageIds) {
                              await addAptImage({
                                id: apt._id,
                                imageId,
                                ownerToken,
                              });
                            }
                          }}
                          storeFromUrl={storeFromUrl}
                        />
                      )}
                      <button
                        onClick={() =>
                          toggleSelected({ id: apt._id, ownerToken })
                        }
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          apt.isSelected
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {apt.isSelected ? "Unpick" : "Pick"}
                      </button>
                      <button
                        onClick={() =>
                          removeApartment({ id: apt._id, ownerToken })
                        }
                        className="text-stone-400 hover:text-red-500 text-xs px-1"
                      >
                        &times;
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedApt === apt._id && apt.imageUrls.length > 0 && (
                <div className="mt-2">
                  <ImageGallery
                    imageUrls={apt.imageUrls}
                    alt={apt.name}
                    onRemove={
                      isOwner
                        ? async (index) => {
                            const imgId = apt.imageIds?.[index];
                            if (imgId) {
                              await removeAptImage({
                                id: apt._id,
                                imageId: imgId,
                                ownerToken,
                              });
                            }
                          }
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">No apartments yet</p>
      )}

      {isOwner && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-sm text-amber-600 hover:text-amber-700"
        >
          + Add apartment
        </button>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apartment name"
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price/night (€)"
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Booking.com URL or other listing URL (optional)"
            className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-stone-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function BookingImageExtractor({
  url,
  onImagesStored,
  storeFromUrl,
}: {
  url: string;
  onImagesStored: (imageIds: Id<"_storage">[]) => Promise<void>;
  storeFromUrl: (args: { url: string }) => Promise<Id<"_storage">>;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [storing, setStoring] = useState(false);

  const handleExtract = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/extract-booking-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setPreview(data.images);
        setSelected(new Set(data.images.map((_: string, i: number) => i)));
      } else {
        setPreview([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStore = async () => {
    if (!preview) return;
    setStoring(true);
    try {
      const selectedUrls = preview.filter((_, i) => selected.has(i));
      const ids: Id<"_storage">[] = [];
      for (const imgUrl of selectedUrls) {
        const id = await storeFromUrl({ url: imgUrl });
        ids.push(id);
      }
      await onImagesStored(ids);
      setPreview(null);
      setSelected(new Set());
    } finally {
      setStoring(false);
    }
  };

  if (preview !== null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Booking.com Images ({preview.length})
            </h3>
            <button
              onClick={() => {
                setPreview(null);
                setSelected(new Set());
              }}
              className="text-stone-400 hover:text-stone-600"
            >
              &times;
            </button>
          </div>
          {preview.length === 0 ? (
            <p className="text-sm text-stone-500">
              No images found. The page may require JavaScript to load images.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {preview.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const next = new Set(selected);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      setSelected(next);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selected.has(i)
                        ? "border-amber-500"
                        : "border-transparent opacity-50"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selected.has(i) && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        &#10003;
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setPreview(null);
                    setSelected(new Set());
                  }}
                  className="px-3 py-1.5 text-sm text-stone-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStore}
                  disabled={selected.size === 0 || storing}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  {storing
                    ? "Saving..."
                    : `Save ${selected.size} image${selected.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
      title="Extract images from Booking.com"
    >
      {loading ? "..." : "B"}
    </button>
  );
}
