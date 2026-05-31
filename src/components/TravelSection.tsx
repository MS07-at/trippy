"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

const MODE_LABELS: Record<string, string> = {
  flight: "Flug",
  train: "Zug",
  car: "Auto",
};

const MODE_ICONS: Record<string, string> = {
  flight: "✈️",
  train: "🚆",
  car: "🚗",
};

type TravelOption = {
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
};

type SuggestedOffer = {
  pattern: "A" | "B";
  patternLabel: string;
  airline?: string;
  outboundFlightNumber: string;
  outboundDepartureTime: number;
  outboundArrivalTime: number;
  returnFlightNumber: string;
  returnDepartureTime: number;
  returnArrivalTime: number;
  tripStartDate: number;
  tripEndDate: number;
  expectedCost: number;
  currency: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function fmtTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TravelSection({
  travelOptions,
  destinationId,
  canEdit,
  userId,
  voterToken,
  slug,
  nights,
  people,
  originAirport,
  destinationCity,
  destinationCountry,
}: {
  travelOptions: TravelOption[];
  destinationId: Id<"destinations">;
  canEdit: boolean;
  userId?: Id<"users">;
  voterToken: string;
  slug: string;
  nights?: number;
  people?: number;
  originAirport?: string;
  destinationCity: string;
  destinationCountry: string;
}) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"flight" | "train" | "car">("flight");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<Id<"travelOptions"> | null>(null);
  const [editMode, setEditMode] = useState<"flight" | "train" | "car">("flight");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const addTravel = useMutation(api.travelOptions.add);
  const updateTravel = useMutation(api.travelOptions.update);
  const removeTravel = useMutation(api.travelOptions.remove);
  const toggleSelected = useMutation(api.travelOptions.toggleSelected);
  const castVote = useMutation(api.travelOptionVotes.cast);

  const canSuggest = Boolean(canEdit && nights && originAirport);
  const suggestTooltip = !canEdit
    ? "Nur Bearbeiter können vorschlagen"
    : !nights
      ? "Erst Anzahl Nächte im Trip setzen"
      : !originAirport
        ? "Erst Heimat-Flughafen im Trip setzen"
        : "";

  const startEdit = (opt: TravelOption) => {
    setEditingId(opt._id);
    setEditMode(opt.mode);
    setEditCost(String(opt.expectedCost));
    setEditNotes(opt.notes ?? "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editCost) return;
    await updateTravel({
      id: editingId,
      mode: editMode,
      expectedCost: parseFloat(editCost),
      notes: editNotes.trim() || undefined,
      userId,
    });
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost) return;
    await addTravel({
      destinationId,
      mode,
      expectedCost: parseFloat(cost),
      notes: notes.trim() || undefined,
      userId,
    });
    setCost("");
    setNotes("");
    setAdding(false);
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-stone-700 mb-2">
        Reiseoptionen
      </h4>
      {travelOptions.length > 0 ? (
        <div className="space-y-2">
          {travelOptions.map((opt) =>
            editingId === opt._id ? (
              <form
                key={opt._id}
                onSubmit={handleEdit}
                className="flex items-end gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200"
              >
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Verkehrsmittel</label>
                  <select
                    value={editMode}
                    onChange={(e) =>
                      setEditMode(e.target.value as "flight" | "train" | "car")
                    }
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="flight">Flug</option>
                    <option value="train">Zug</option>
                    <option value="car">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Kosten/Person (&euro;)
                  </label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-stone-500 mb-1">Notizen</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-stone-500 text-sm"
                >
                  Abbrechen
                </button>
              </form>
            ) : (
              <div
                key={opt._id}
                className={`rounded-lg border px-3 py-2 ${
                  opt.isSelected
                    ? "border-green-300 bg-green-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <TravelVoteButtons
                    travelOptionId={opt._id}
                    voteScore={opt.voteScore}
                    voterToken={voterToken}
                    castVote={castVote}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{MODE_ICONS[opt.mode]}</span>
                      <span className="text-sm font-medium">
                        {MODE_LABELS[opt.mode]}
                      </span>
                      {opt.isSelected && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          Ausgewählt
                        </span>
                      )}
                      {opt.isSuggestion && !opt.isSelected && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                          Vorschlag
                        </span>
                      )}
                      <span className="text-sm text-stone-500">
                        &euro;{opt.expectedCost}/Person
                      </span>
                      {opt.notes && (
                        <span className="text-xs text-stone-400">
                          &mdash; {opt.notes}
                        </span>
                      )}
                    </div>
                    {opt.outboundFlightNumber &&
                      opt.outboundDepartureTime !== undefined &&
                      opt.tripStartDate !== undefined && (
                        <p className="text-xs text-stone-600 mt-0.5">
                          ✈ {opt.airline ? `${opt.airline} ` : ""}
                          {opt.outboundFlightNumber} ·{" "}
                          {fmtDate(opt.tripStartDate)}{" "}
                          {fmtTime(opt.outboundDepartureTime)}
                        </p>
                      )}
                    {opt.returnFlightNumber &&
                      opt.returnArrivalTime !== undefined &&
                      opt.tripEndDate !== undefined && (
                        <p className="text-xs text-stone-600">
                          ⇠ {opt.returnFlightNumber} ·{" "}
                          {fmtDate(opt.tripEndDate)}{" "}
                          {fmtTime(opt.returnArrivalTime)} (Landung)
                        </p>
                      )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(opt)}
                        className="px-2 py-1 text-xs text-stone-500 hover:text-amber-600 transition-colors"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() =>
                          toggleSelected({ id: opt._id, userId })
                        }
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          opt.isSelected
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {opt.isSelected ? "Abwählen" : "Auswählen"}
                      </button>
                      <button
                        onClick={() => removeTravel({ id: opt._id, userId })}
                        className="text-stone-400 hover:text-red-500 text-xs px-1"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-400">Noch keine Reiseoptionen</p>
      )}

      {canEdit && !adding && (
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-amber-600 hover:text-amber-700"
          >
            + Reiseoption hinzufügen
          </button>
          <button
            onClick={() => setSuggestOpen(true)}
            disabled={!canSuggest}
            title={suggestTooltip}
            className="text-sm text-purple-600 hover:text-purple-700 disabled:text-stone-300 disabled:cursor-not-allowed"
          >
            ✨ Flüge vorschlagen
          </button>
        </div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-2 flex items-end gap-2">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Verkehrsmittel</label>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "flight" | "train" | "car")
              }
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="flight">Flug</option>
              <option value="train">Zug</option>
              <option value="car">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Kosten/Person (&euro;)
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="150"
              className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Notizen</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Ryanair, 2h Fahrt"
              className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
          >
            Hinzufügen
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-3 py-1.5 text-stone-500 text-sm"
          >
            Abbrechen
          </button>
        </form>
      )}

      {suggestOpen && canSuggest && (
        <SuggestFlightsModal
          onClose={() => setSuggestOpen(false)}
          slug={slug}
          userId={userId}
          destinationId={destinationId}
          originAirport={originAirport!}
          destinationCity={destinationCity}
          destinationCountry={destinationCountry}
          nights={nights!}
          people={people}
          addTravel={addTravel}
        />
      )}
    </div>
  );
}

function TravelVoteButtons({
  travelOptionId,
  voteScore,
  voterToken,
  castVote,
}: {
  travelOptionId: Id<"travelOptions">;
  voteScore: number;
  voterToken: string;
  castVote: (args: {
    travelOptionId: Id<"travelOptions">;
    voterToken: string;
    value: number;
  }) => Promise<null>;
}) {
  const myVote = useQuery(
    api.travelOptionVotes.getMyVote,
    voterToken ? { travelOptionId, voterToken } : "skip",
  );

  const handleVote = async (value: number) => {
    if (!voterToken) return;
    const newValue = myVote === value ? 0 : value;
    await castVote({ travelOptionId, voterToken, value: newValue });
  };

  return (
    <div className="flex flex-col items-center gap-0 shrink-0">
      <button
        onClick={() => handleVote(1)}
        className={`p-0.5 rounded transition-colors ${
          myVote === 1
            ? "text-amber-500"
            : "text-stone-300 hover:text-amber-400"
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <span
        className={`text-xs font-bold tabular-nums leading-none ${
          voteScore > 0
            ? "text-green-600"
            : voteScore < 0
              ? "text-red-500"
              : "text-stone-400"
        }`}
      >
        {voteScore}
      </span>
      <button
        onClick={() => handleVote(-1)}
        className={`p-0.5 rounded transition-colors ${
          myVote === -1
            ? "text-red-500"
            : "text-stone-300 hover:text-red-400"
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

function SuggestFlightsModal({
  onClose,
  slug,
  userId,
  destinationId,
  originAirport,
  destinationCity,
  destinationCountry,
  nights,
  people,
  addTravel,
}: {
  onClose: () => void;
  slug: string;
  userId?: Id<"users">;
  destinationId: Id<"destinations">;
  originAirport: string;
  destinationCity: string;
  destinationCountry: string;
  nights: number;
  people?: number;
  addTravel: (args: {
    destinationId: Id<"destinations">;
    mode: "flight" | "train" | "car";
    expectedCost: number;
    notes?: string;
    userId?: Id<"users">;
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
  }) => Promise<Id<"travelOptions">>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [searchStart, setSearchStart] = useState(today);
  const [searchEnd, setSearchEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<SuggestedOffer[] | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const startMs = searchStart ? Date.parse(searchStart) : NaN;
  const endMs = searchEnd ? Date.parse(searchEnd) : NaN;
  const rangeDays =
    Number.isFinite(startMs) && Number.isFinite(endMs)
      ? Math.round((endMs - startMs) / DAY_MS)
      : 0;
  const tooLong = rangeDays > 31;
  const tooShort = rangeDays < nights;
  const canSubmit =
    !loading &&
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    endMs > startMs &&
    !tooLong &&
    !tooShort;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setOffers(null);
    try {
      const res = await fetch("/api/suggest-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          userId,
          destinationId,
          originAirport,
          destinationCity,
          destinationCountry,
          nights,
          people,
          searchStart: startMs,
          searchEnd: endMs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unbekannter Fehler");
      setOffers(data.offers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (offer: SuggestedOffer) => {
    const key = offerKey(offer);
    setAddedKeys((s) => new Set(s).add(key));
    await addTravel({
      destinationId,
      mode: "flight",
      expectedCost: offer.expectedCost,
      notes: `${offer.airline ?? ""} · ${offer.patternLabel}${offer.currency !== "EUR" ? ` (${offer.currency})` : ""}`.trim(),
      userId,
      outboundFlightNumber: offer.outboundFlightNumber,
      outboundDepartureTime: offer.outboundDepartureTime,
      outboundArrivalTime: offer.outboundArrivalTime,
      returnFlightNumber: offer.returnFlightNumber,
      returnDepartureTime: offer.returnDepartureTime,
      returnArrivalTime: offer.returnArrivalTime,
      tripStartDate: offer.tripStartDate,
      tripEndDate: offer.tripEndDate,
      airline: offer.airline,
      isSuggestion: true,
    });
  };

  const grouped = offers
    ? {
        A: offers.filter((o) => o.pattern === "A"),
        B: offers.filter((o) => o.pattern === "B"),
      }
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            Flüge vorschlagen — {destinationCity}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="text-xs text-stone-500">
          Suche: {originAirport} → {destinationCity}, {nights} Nächte,{" "}
          {people ?? 1} Personen
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Von</label>
            <input
              type="date"
              value={searchStart}
              min={today}
              onChange={(e) => setSearchStart(e.target.value)}
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Bis</label>
            <input
              type="date"
              value={searchEnd}
              min={searchStart || today}
              onChange={(e) => setSearchEnd(e.target.value)}
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Suche…" : "Suchen"}
          </button>
        </div>

        {tooLong && (
          <p className="text-xs text-red-500">
            Der Suchzeitraum darf höchstens 31 Tage betragen.
          </p>
        )}
        {tooShort && rangeDays > 0 && (
          <p className="text-xs text-red-500">
            Der Suchzeitraum muss mindestens {nights} Tage umfassen.
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {grouped && offers && offers.length === 0 && !loading && (
          <p className="text-sm text-stone-500">
            Keine passenden Flüge gefunden. Versuch&apos;s mit einem anderen
            Zeitraum.
          </p>
        )}

        {grouped &&
          (["A", "B"] as const).map((p) =>
            grouped[p].length > 0 ? (
              <div key={p} className="space-y-1">
                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
                  {p === "A"
                    ? "Volltagsbetrieb (früh hin, spät zurück)"
                    : "Maximal vor Ort (Abend vorher, Morgen danach)"}
                </h4>
                <div className="space-y-1">
                  {grouped[p].map((offer) => {
                    const k = offerKey(offer);
                    const added = addedKeys.has(k);
                    return (
                      <div
                        key={k}
                        className="flex items-start gap-3 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200"
                      >
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {offer.airline && (
                              <span className="font-medium">
                                {offer.airline}
                              </span>
                            )}
                            <span className="text-stone-500">
                              {offer.currency === "EUR" ? "€" : offer.currency}{" "}
                              {offer.expectedCost.toFixed(2)} / Person
                            </span>
                          </div>
                          <div className="text-stone-600 mt-0.5">
                            ✈ {offer.outboundFlightNumber} ·{" "}
                            {fmtDate(offer.tripStartDate)}{" "}
                            {fmtTime(offer.outboundDepartureTime)} →{" "}
                            {fmtTime(offer.outboundArrivalTime)}
                          </div>
                          <div className="text-stone-600">
                            ⇠ {offer.returnFlightNumber} ·{" "}
                            {fmtDate(offer.tripEndDate)}{" "}
                            {fmtTime(offer.returnDepartureTime)} →{" "}
                            {fmtTime(offer.returnArrivalTime)} (Landung)
                          </div>
                        </div>
                        <button
                          onClick={() => handleAdd(offer)}
                          disabled={added}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed shrink-0"
                        >
                          {added ? "Hinzugefügt" : "Übernehmen"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
      </div>
    </div>
  );
}

function offerKey(o: SuggestedOffer): string {
  return `${o.outboundFlightNumber}|${o.returnFlightNumber}|${o.tripStartDate}`;
}
