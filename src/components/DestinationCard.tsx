"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef, useCallback } from "react";
import { getOwnerToken } from "@/lib/owner";

type UserId = Id<"users">;
import Markdown from "react-markdown";
import { TravelSection } from "./TravelSection";
import { ApartmentSection } from "./ApartmentSection";
import { ActivitySection } from "./ActivitySection";
import { ImageUpload } from "./ImageUpload";
import { ImageGallery, Lightbox } from "./ImageGallery";

type Destination = {
  _id: Id<"destinations">;
  vacationId: Id<"vacations">;
  city: string;
  country: string;
  description?: string;
  airport?: string;
  imageIds?: Id<"_storage">[];
  imageUrls: string[];
  isSelected: boolean;
  order: number;
  voteScore: number;
  upvotes: number;
  downvotes: number;
  travelOptions: Array<{
    _id: Id<"travelOptions">;
    destinationId: Id<"destinations">;
    mode: "flight" | "train" | "car";
    expectedCost: number;
    notes?: string;
    isSelected?: boolean;
    outboundFlightNumber?: string;
    outboundDepartureTime?: number;
    outboundArrivalTime?: number;
    returnFlightNumber?: string;
    returnDepartureTime?: number;
    returnArrivalTime?: number;
    tripStartDate?: number;
    tripEndDate?: number;
    airline?: string;
    isSuggestion?: boolean;
    voteScore: number;
    upvotes: number;
    downvotes: number;
  }>;
  apartments: Array<{
    _id: Id<"apartments">;
    destinationId: Id<"destinations">;
    name: string;
    url?: string;
    expectedPrice: number;
    imageIds?: Id<"_storage">[];
    imageUrls: string[];
    notes?: string;
    isSelected: boolean;
    voteScore: number;
    upvotes: number;
    downvotes: number;
  }>;
  activities: Array<{
    _id: Id<"activities">;
    destinationId: Id<"destinations">;
    name: string;
    description: string;
    category?: string;
  }>;
  priceRange: { min: number; max: number } | null;
};

export function DestinationCard({
  destination,
  isOwner,
  canEdit,
  userId,
  nights,
  people,
  originAirport,
  slug,
}: {
  destination: Destination;
  isOwner: boolean;
  canEdit: boolean;
  userId?: UserId;
  nights?: number;
  people?: number;
  originAirport?: string;
  slug: string;
}) {
  const [voterToken, setVoterToken] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState(destination.city);
  const [editCountry, setEditCountry] = useState(destination.country);
  const [editDescription, setEditDescription] = useState(destination.description ?? "");
  const [editAirport, setEditAirport] = useState(destination.airport ?? "");
  const [generating, setGenerating] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = descRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    setVoterToken(getOwnerToken());
  }, []);

  const myVote = useQuery(
    api.votes.getMyVote,
    voterToken
      ? { destinationId: destination._id, voterToken }
      : "skip",
  );

  const castVote = useMutation(api.votes.cast);
  const toggleSelected = useMutation(api.destinations.toggleSelected);
  const removeDestination = useMutation(api.destinations.remove);
  const updateDestination = useMutation(api.destinations.update);
  const addImage = useMutation(api.destinations.addImage);
  const removeImage = useMutation(api.destinations.removeImage);
  const storeFromUrl = useAction(api.files.storeFromUrl);

  const startEdit = () => {
    setEditCity(destination.city);
    setEditCountry(destination.country);
    setEditDescription(destination.description ?? "");
    setEditAirport(destination.airport ?? "");
    setEditing(true);
    requestAnimationFrame(() => autoGrow());
  };

  const generateDescription = async () => {
    if (!editCity.trim() || !editCountry.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: editCity.trim(), country: editCountry.trim(), slug, userId }),
      });
      const data = await res.json();
      if (data.description) {
        setEditDescription(data.description);
        requestAnimationFrame(() => autoGrow());
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCity.trim() || !editCountry.trim()) return;
    await updateDestination({
      id: destination._id,
      city: editCity.trim(),
      country: editCountry.trim(),
      description: editDescription.trim() || undefined,
      airport: editAirport.trim().toUpperCase() || undefined,
      userId,
    });
    setEditing(false);
  };

  const handleVote = async (value: number) => {
    const newValue = myVote === value ? 0 : value;
    await castVote({
      destinationId: destination._id,
      voterToken,
      value: newValue,
    });
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.city + ", " + destination.country)}`;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 transition-colors ${
        destination.isSelected
          ? "border-green-400 bg-green-50/30"
          : "border-stone-200"
      }`}
    >
      {/* Header */}
      <div className="p-3 sm:p-4">
        {/* Top row: vote + image + title + actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleVote(1)}
              className={`p-0.5 rounded transition-colors ${
                myVote === 1
                  ? "text-amber-500"
                  : "text-stone-300 hover:text-amber-400"
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span
              className={`text-xs font-bold tabular-nums ${
                destination.voteScore > 0
                  ? "text-green-600"
                  : destination.voteScore < 0
                    ? "text-red-500"
                    : "text-stone-400"
              }`}
            >
              {destination.voteScore}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-0.5 rounded transition-colors ${
                myVote === -1
                  ? "text-red-500"
                  : "text-stone-300 hover:text-red-400"
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Image */}
          {destination.imageUrls.length > 0 && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer"
            >
              <img
                src={destination.imageUrls[0]}
                alt={destination.city}
                className="w-full h-full object-cover"
              />
              {destination.imageUrls.length > 1 && (
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl rounded-br">
                  +{destination.imageUrls.length - 1}
                </div>
              )}
            </button>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <span className="text-lg font-semibold text-stone-400">Bearbeiten…</span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold leading-tight">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/tip relative hover:text-amber-600 transition-colors"
                  >
                    {destination.city}, {destination.country}
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover/tip:opacity-100">
                      In Maps öffnen
                    </span>
                  </a>
                </h3>
                {canEdit && (
                  <button
                    onClick={startEdit}
                    className="text-stone-400 hover:text-amber-500 transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {destination.isSelected && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Ausgewählt
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                {expanded ? "Einklappen" : "Details"}
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() =>
                      toggleSelected({ id: destination._id, userId })
                    }
                    className={`hidden sm:block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      destination.isSelected
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-stone-100 hover:bg-stone-200"
                    }`}
                  >
                    {destination.isSelected ? "Abwählen" : "Hier gehts hin"}
                  </button>
                  <button
                    onClick={() =>
                      toggleSelected({ id: destination._id, userId })
                    }
                    className={`sm:hidden p-1 rounded-lg transition-colors ${
                      destination.isSelected
                        ? "text-green-600"
                        : "text-stone-400 hover:text-green-500"
                    }`}
                    title={destination.isSelected ? "Abwählen" : "Hier gehts hin"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      removeDestination({ id: destination._id, userId })
                    }
                    className="p-1 sm:p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                    title="Reiseziel entfernen"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleEditSubmit} className="mt-3 space-y-2">
            <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Stadt"
                className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                autoFocus
              />
              <input
                type="text"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                placeholder="Land"
                className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <input
                type="text"
                value={editAirport}
                onChange={(e) => setEditAirport(e.target.value)}
                maxLength={3}
                placeholder="PMO"
                title="Flughafen-Code (z.B. PMO für Palermo)"
                className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-2 items-start">
              <textarea
                ref={descRef}
                value={editDescription}
                onChange={(e) => { setEditDescription(e.target.value); autoGrow(); }}
                onFocus={autoGrow}
                placeholder="Beschreibung (optional)"
                rows={1}
                className="flex-1 px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none overflow-hidden"
              />
              <button
                type="button"
                onClick={generateDescription}
                disabled={generating || !editCity.trim() || !editCountry.trim()}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Beschreibung generieren"
              >
                {generating ? "Generiert..." : "AI Beschreibung"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-stone-500 text-sm"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Description + stats below the header row */}
        {!editing && (
          <>
            {destination.description && (
              <div className="text-sm text-stone-500 mt-2 prose prose-sm prose-stone max-w-none line-clamp-3">
                <Markdown>{destination.description}</Markdown>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-400">
              <span>{destination.upvotes} dafür / {destination.downvotes} dagegen</span>
              {destination.priceRange && (
                <span className="text-stone-500">
                  {nights && people
                    ? <>Unterkünfte: &euro;{Math.round(destination.priceRange.min * nights / people)}&ndash;&euro;{Math.round(destination.priceRange.max * nights / people)}/Person</>
                    : <>Unterkünfte: &euro;{destination.priceRange.min}&ndash;&euro;{destination.priceRange.max}/Nacht</>}
                </span>
              )}
              {destination.travelOptions.length > 0 && (
                <span className="text-stone-500">
                  Anreise ab &euro;
                  {Math.min(
                    ...destination.travelOptions.map((t) => t.expectedCost),
                  )}
                  /Person
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {lightboxOpen && destination.imageUrls.length > 0 && (
        <Lightbox
          imageUrls={destination.imageUrls}
          alt={destination.city}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-stone-100 p-4 space-y-6">
          {destination.imageUrls.length > 0 && (
            <ImageGallery
              imageUrls={destination.imageUrls}
              alt={destination.city}
              onRemove={
                canEdit
                  ? async (index) => {
                      const imgId = destination.imageIds?.[index];
                      if (imgId) {
                        await removeImage({
                          id: destination._id,
                          imageId: imgId,
                          userId,
                        });
                      }
                    }
                  : undefined
              }
            />
          )}
          {canEdit && (
            <div className="flex items-center gap-2">
              <ImageUpload
                onUpload={async (imageId) => {
                  await addImage({
                    id: destination._id,
                    imageId,
                    userId,
                  });
                }}
                label="Bilder hinzufügen"
                multiple
              />
              {(!destination.imageUrls || destination.imageUrls.length === 0) && (
                <DestinationImageSearch
                  query={`${destination.city} ${destination.country}`}
                  slug={slug}
                  userId={userId}
                  onImagesStored={async (imageIds) => {
                    for (const imageId of imageIds) {
                      await addImage({
                        id: destination._id,
                        imageId,
                        userId,
                      });
                    }
                  }}
                  storeFromUrl={storeFromUrl}
                />
              )}
            </div>
          )}

          <TravelSection
            travelOptions={destination.travelOptions}
            destinationId={destination._id}
            canEdit={canEdit}
            userId={userId}
            voterToken={voterToken}
            slug={slug}
            nights={nights}
            people={people}
            originAirport={originAirport}
            destinationCity={destination.city}
            destinationCountry={destination.country}
            destinationAirport={destination.airport}
          />

          <ApartmentSection
            apartments={destination.apartments}
            destinationId={destination._id}
            priceRange={destination.priceRange}
            canEdit={canEdit}
            userId={userId}
            nights={nights}
            people={people}
            slug={slug}
            voterToken={voterToken}
          />

          <ActivitySection
            activities={destination.activities}
            destinationId={destination._id}
            city={destination.city}
            country={destination.country}
            canEdit={canEdit}
            userId={userId}
            slug={slug}
          />
        </div>
      )}
    </div>
  );
}

function DestinationImageSearch({
  query,
  slug,
  userId,
  onImagesStored,
  storeFromUrl,
}: {
  query: string;
  slug: string;
  userId?: UserId;
  onImagesStored: (imageIds: Id<"_storage">[]) => Promise<void>;
  storeFromUrl: (args: { url: string }) => Promise<Id<"_storage">>;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [storing, setStoring] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/search-destination-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, slug, userId }),
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
        try {
          const id = await storeFromUrl({ url: imgUrl });
          ids.push(id);
        } catch {
          console.warn("Failed to store image, skipping:", imgUrl);
        }
      }
      if (ids.length > 0) {
        await onImagesStored(ids);
      }
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
              Bildersuche: {query} ({preview.length})
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
              Keine Bilder gefunden.
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
                      alt={`${query} ${i + 1}`}
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
                  Abbrechen
                </button>
                <button
                  onClick={handleStore}
                  disabled={selected.size === 0 || storing}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  {storing
                    ? "Wird gespeichert..."
                    : `${selected.size} Bild${selected.size !== 1 ? "er" : ""} speichern`}
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
      onClick={handleSearch}
      disabled={loading}
      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
      title={`Bilder für "${query}" suchen`}
    >
      {loading ? "Suche..." : "Bilder suchen"}
    </button>
  );
}
