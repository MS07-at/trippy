"use client";

import { useMutation, useQuery } from "convex/react";
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
  userId,
  nights,
  people,
}: {
  destination: Destination;
  isOwner: boolean;
  userId?: UserId;
  nights?: number;
  people?: number;
}) {
  const [voterToken, setVoterToken] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState(destination.city);
  const [editCountry, setEditCountry] = useState(destination.country);
  const [editDescription, setEditDescription] = useState(destination.description ?? "");
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

  const startEdit = () => {
    setEditCity(destination.city);
    setEditCountry(destination.country);
    setEditDescription(destination.description ?? "");
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
        body: JSON.stringify({ city: editCity.trim(), country: editCountry.trim() }),
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
      userId: userId!,
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
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button
              onClick={() => handleVote(1)}
              className={`p-1 rounded transition-colors ${
                myVote === 1
                  ? "text-amber-500"
                  : "text-stone-300 hover:text-amber-400"
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span
              className={`text-sm font-bold tabular-nums ${
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
              className={`p-1 rounded transition-colors ${
                myVote === -1
                  ? "text-red-500"
                  : "text-stone-300 hover:text-red-400"
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
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
              className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer"
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

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <form onSubmit={handleEditSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
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
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
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
                  {destination.isSelected && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Ausgewählt
                    </span>
                  )}
                </div>
                {destination.description && (
                  <div className="text-sm text-stone-500 mt-0.5 prose prose-sm prose-stone max-w-none">
                    <Markdown>{destination.description}</Markdown>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-4 mt-2 text-xs text-stone-400">
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
                <div className="flex sm:hidden flex-col gap-1 mt-2 text-xs text-stone-400">
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

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                {expanded ? "Einklappen" : "Details"}
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={startEdit}
                    className="px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() =>
                      toggleSelected({ id: destination._id, userId: userId! })
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      destination.isSelected
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-stone-100 hover:bg-stone-200"
                    }`}
                  >
                    {destination.isSelected ? "Abwählen" : "Auswählen"}
                  </button>
                  <button
                    onClick={() =>
                      removeDestination({ id: destination._id, userId: userId! })
                    }
                    className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
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
                isOwner
                  ? async (index) => {
                      const imgId = destination.imageIds?.[index];
                      if (imgId) {
                        await removeImage({
                          id: destination._id,
                          imageId: imgId,
                          userId: userId!,
                        });
                      }
                    }
                  : undefined
              }
            />
          )}
          {isOwner && (
            <ImageUpload
              onUpload={async (imageId) => {
                await addImage({
                  id: destination._id,
                  imageId,
                  userId: userId!,
                });
              }}
              label="Bilder hinzufügen"
              multiple
            />
          )}

          <TravelSection
            travelOptions={destination.travelOptions}
            destinationId={destination._id}
            isOwner={isOwner}
            userId={userId}
          />

          <ApartmentSection
            apartments={destination.apartments}
            destinationId={destination._id}
            priceRange={destination.priceRange}
            isOwner={isOwner}
            userId={userId}
            nights={nights}
            people={people}
          />

          <ActivitySection
            activities={destination.activities}
            destinationId={destination._id}
            city={destination.city}
            country={destination.country}
            isOwner={isOwner}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}
