"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function AddDestination({
  vacationId,
  userId,
}: {
  vacationId: Id<"vacations">;
  userId: Id<"users">;
}) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const createDestination = useMutation(api.destinations.create);
  const updateDescription = useMutation(api.destinations.updateDescription);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !country.trim()) return;
    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();
    const trimmedDesc = description.trim();

    const destId = await createDestination({
      vacationId,
      city: trimmedCity,
      country: trimmedCountry,
      description: trimmedDesc || undefined,
      userId,
    });

    setCity("");
    setCountry("");
    setDescription("");
    setOpen(false);

    if (!trimmedDesc) {
      fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: trimmedCity, country: trimmedCountry }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.description) {
            updateDescription({ id: destId, description: data.description });
          }
        })
        .catch(() => {});
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        + Reiseziel hinzufügen
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Stadt
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Barcelona"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Land
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Spanien"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Beschreibung (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Wird automatisch generiert, wenn leer"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Hinzufügen
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-stone-500 hover:text-stone-700 text-sm"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
