"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateRangePicker,
  DateSegment,
  Dialog,
  DialogTrigger,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  RangeCalendar,
} from "react-aria-components";
import {
  parseDateTime,
  Time,
  toCalendarDate,
  toCalendarDateTime,
  type CalendarDate,
  type CalendarDateTime,
} from "@internationalized/date";

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
  isHidden?: boolean;
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

type FlightDetails = {
  airline: string;
  outboundFlightNumber: string;
  outboundDeparture: string;
  outboundArrival: string;
  returnFlightNumber: string;
  returnDeparture: string;
  returnArrival: string;
};

const emptyFlightDetails: FlightDetails = {
  airline: "",
  outboundFlightNumber: "",
  outboundDeparture: "",
  outboundArrival: "",
  returnFlightNumber: "",
  returnDeparture: "",
  returnArrival: "",
};

function toLocalInput(epoch?: number): string {
  if (epoch === undefined) return "";
  const d = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | undefined {
  return value ? new Date(value).getTime() : undefined;
}

function parseMaybeDateTime(value: string): CalendarDateTime | null {
  if (!value) return null;
  try {
    return parseDateTime(value);
  } catch {
    return null;
  }
}

// CalendarDateTime.toString() → "YYYY-MM-DDTHH:mm:ss"; keep the minute format
function fmtDateTimeValue(value: CalendarDateTime): string {
  return value.toString().slice(0, 16);
}

type FlightDetailsErrors = {
  outbound?: string;
  return?: string;
};

function flightDetailsErrors(d: FlightDetails): FlightDetailsErrors {
  const errors: FlightDetailsErrors = {};
  const outDep = fromLocalInput(d.outboundDeparture);
  const outArr = fromLocalInput(d.outboundArrival);
  const retDep = fromLocalInput(d.returnDeparture);
  const retArr = fromLocalInput(d.returnArrival);
  if (outDep !== undefined && outArr !== undefined && outArr <= outDep) {
    errors.outbound = "Die Ankunft muss nach dem Abflug liegen";
  }
  if (retDep !== undefined && retArr !== undefined && retArr <= retDep) {
    errors.return = "Die Ankunft muss nach dem Abflug liegen";
  } else if (outArr !== undefined && retDep !== undefined && retDep < outArr) {
    errors.return = "Der Rückflug muss nach der Landung des Hinflugs starten";
  }
  return errors;
}

function hasDetailsErrors(d: FlightDetails): boolean {
  const errors = flightDetailsErrors(d);
  return Boolean(errors.outbound || errors.return);
}

function startOfDay(epoch: number): number {
  const d = new Date(epoch);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function detailsFromOption(opt: TravelOption): FlightDetails {
  return {
    airline: opt.airline ?? "",
    outboundFlightNumber: opt.outboundFlightNumber ?? "",
    outboundDeparture: toLocalInput(opt.outboundDepartureTime),
    outboundArrival: toLocalInput(opt.outboundArrivalTime),
    returnFlightNumber: opt.returnFlightNumber ?? "",
    returnDeparture: toLocalInput(opt.returnDepartureTime),
    returnArrival: toLocalInput(opt.returnArrivalTime),
  };
}

function detailsToAddArgs(d: FlightDetails) {
  const outboundDepartureTime = fromLocalInput(d.outboundDeparture);
  const returnArrivalTime = fromLocalInput(d.returnArrival);
  return {
    airline: d.airline.trim() || undefined,
    outboundFlightNumber: d.outboundFlightNumber.trim() || undefined,
    outboundDepartureTime,
    outboundArrivalTime: fromLocalInput(d.outboundArrival),
    returnFlightNumber: d.returnFlightNumber.trim() || undefined,
    returnDepartureTime: fromLocalInput(d.returnDeparture),
    returnArrivalTime,
    tripStartDate:
      outboundDepartureTime !== undefined
        ? startOfDay(outboundDepartureTime)
        : undefined,
    tripEndDate:
      returnArrivalTime !== undefined ? startOfDay(returnArrivalTime) : undefined,
  };
}

// For update: null explicitly clears a field on the server
function detailsToUpdateArgs(d: FlightDetails) {
  const a = detailsToAddArgs(d);
  return {
    airline: a.airline ?? null,
    outboundFlightNumber: a.outboundFlightNumber ?? null,
    outboundDepartureTime: a.outboundDepartureTime ?? null,
    outboundArrivalTime: a.outboundArrivalTime ?? null,
    returnFlightNumber: a.returnFlightNumber ?? null,
    returnDepartureTime: a.returnDepartureTime ?? null,
    returnArrivalTime: a.returnArrivalTime ?? null,
    tripStartDate: a.tripStartDate ?? null,
    tripEndDate: a.tripEndDate ?? null,
  };
}

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

function fmtDay(epoch: number): string {
  return new Date(epoch).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
  });
}

// A row can only be drawn on the timeline when all four flight times are known
function isPlottable(opt: TravelOption): boolean {
  return (
    opt.mode === "flight" &&
    opt.outboundDepartureTime !== undefined &&
    opt.outboundArrivalTime !== undefined &&
    opt.returnDepartureTime !== undefined &&
    opt.returnArrivalTime !== undefined
  );
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
  destinationAirport,
  votingEnabled,
  graphEnabled,
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
  destinationAirport?: string;
  votingEnabled: boolean;
  graphEnabled: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"flight" | "train" | "car">("flight");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<FlightDetails>(emptyFlightDetails);
  const [editingId, setEditingId] = useState<Id<"travelOptions"> | null>(null);
  const [editMode, setEditMode] = useState<"flight" | "train" | "car">("flight");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDetails, setEditDetails] =
    useState<FlightDetails>(emptyFlightDetails);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const addTravel = useMutation(api.travelOptions.add);
  const updateTravel = useMutation(api.travelOptions.update);
  const removeTravel = useMutation(api.travelOptions.remove);
  const toggleSelected = useMutation(api.travelOptions.toggleSelected);
  const toggleHidden = useMutation(api.travelOptions.toggleHidden);
  const toggleFlightVoting = useMutation(api.destinations.toggleFlightVoting);
  const toggleTravelGraph = useMutation(api.destinations.toggleTravelGraph);
  const castVote = useMutation(api.travelOptionVotes.cast);

  // Hidden options are only shown to editors (sorted to the bottom by the query)
  const visibleOptions = canEdit
    ? travelOptions
    : travelOptions.filter((opt) => !opt.isHidden);

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
    setEditDetails(detailsFromOption(opt));
  };

  const addDetailsInvalid = mode === "flight" && hasDetailsErrors(details);
  const editDetailsInvalid =
    editMode === "flight" && hasDetailsErrors(editDetails);

  const plottableOptions = visibleOptions.filter(isPlottable);
  // Editors always get the text view (rows are edited there); viewers get the
  // graph when it is enabled. Options without flight times stay as text rows.
  const showGraph =
    graphEnabled && !canEdit && plottableOptions.length > 0;
  const listOptions = showGraph
    ? visibleOptions.filter((opt) => !isPlottable(opt))
    : visibleOptions;

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editCost || editDetailsInvalid) return;
    await updateTravel({
      id: editingId,
      mode: editMode,
      expectedCost: parseFloat(editCost),
      notes: editNotes.trim() || null,
      userId,
      // Switching away from flight clears the flight details
      ...detailsToUpdateArgs(
        editMode === "flight" ? editDetails : emptyFlightDetails,
      ),
    });
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost || addDetailsInvalid) return;
    await addTravel({
      destinationId,
      mode,
      expectedCost: parseFloat(cost),
      notes: notes.trim() || undefined,
      userId,
      ...(mode === "flight" ? detailsToAddArgs(details) : {}),
    });
    setCost("");
    setNotes("");
    setDetails(emptyFlightDetails);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-stone-700">
          Reiseoptionen
        </h4>
        {canEdit && (
          <>
            <button
              onClick={() => toggleFlightVoting({ id: destinationId, userId })}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                votingEnabled
                  ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                  : "bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200"
              }`}
            >
              {votingEnabled ? "Abstimmung: an" : "Abstimmung: aus"}
            </button>
            <button
              onClick={() => toggleTravelGraph({ id: destinationId, userId })}
              title="Zeigt Betrachtern die Reiseoptionen als Zeitstrahl; beim Bearbeiten immer Text"
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                graphEnabled
                  ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                  : "bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200"
              }`}
            >
              {graphEnabled ? "Grafik: an" : "Grafik: aus"}
            </button>
          </>
        )}
      </div>
      {visibleOptions.length === 0 && (
        <p className="text-sm text-stone-400">Noch keine Reiseoptionen</p>
      )}
      {showGraph && (
        <TravelTimelineChart
          options={plottableOptions}
          votingEnabled={votingEnabled}
          voterToken={voterToken}
          castVote={castVote}
        />
      )}
      {listOptions.length > 0 && (
        <div className={`space-y-2${showGraph ? " mt-2" : ""}`}>
          {listOptions.map((opt) =>
            editingId === opt._id ? (
              <form
                key={opt._id}
                onSubmit={handleEdit}
                className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200 space-y-2"
              >
                <div className="flex items-end gap-2">
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
                </div>
                {editMode === "flight" && (
                  <FlightDetailsFields
                    details={editDetails}
                    onChange={setEditDetails}
                  />
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editDetailsInvalid}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed"
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
                </div>
              </form>
            ) : (
              <div
                key={opt._id}
                className={`rounded-lg border px-3 py-2 ${
                  opt.isSelected
                    ? "border-green-300 bg-green-50"
                    : "border-stone-200 bg-stone-50"
                } ${opt.isHidden ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {votingEnabled && (
                    <TravelVoteButtons
                      travelOptionId={opt._id}
                      voteScore={opt.voteScore}
                      voterToken={voterToken}
                      castVote={castVote}
                    />
                  )}
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
                      {opt.isHidden && (
                        <span className="text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full">
                          Versteckt
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
                    {(opt.outboundFlightNumber ||
                      opt.outboundDepartureTime !== undefined) && (
                      <p className="text-xs text-stone-600 mt-0.5">
                        ✈ {opt.airline ? `${opt.airline} ` : ""}
                        {opt.outboundFlightNumber}
                        {opt.outboundDepartureTime !== undefined && (
                          <>
                            {opt.outboundFlightNumber ? " · " : ""}
                            {fmtDate(opt.outboundDepartureTime)}{" "}
                            {fmtTime(opt.outboundDepartureTime)}
                          </>
                        )}
                      </p>
                    )}
                    {(opt.returnFlightNumber ||
                      opt.returnArrivalTime !== undefined) && (
                      <p className="text-xs text-stone-600">
                        ⇠ {opt.returnFlightNumber}
                        {opt.returnArrivalTime !== undefined && (
                          <>
                            {opt.returnFlightNumber ? " · " : ""}
                            {fmtDate(opt.returnArrivalTime)}{" "}
                            {fmtTime(opt.returnArrivalTime)} (Landung)
                          </>
                        )}
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
                        onClick={() => toggleHidden({ id: opt._id, userId })}
                        className="px-2 py-1 text-xs text-stone-500 hover:text-amber-600 transition-colors"
                        title={
                          opt.isHidden
                            ? "Wieder einblenden"
                            : "Für Betrachter verstecken"
                        }
                      >
                        {opt.isHidden ? "Einblenden" : "Verstecken"}
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
        <form onSubmit={handleAdd} className="mt-2 space-y-2">
          <div className="flex items-end gap-2">
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
          </div>
          {mode === "flight" && (
            <FlightDetailsFields details={details} onChange={setDetails} />
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addDetailsInvalid}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed"
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
          </div>
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
          destinationAirport={destinationAirport}
          nights={nights!}
          people={people}
          addTravel={addTravel}
        />
      )}
    </div>
  );
}

function FlightDetailsFields({
  details,
  onChange,
}: {
  details: FlightDetails;
  onChange: (details: FlightDetails) => void;
}) {
  const set = (patch: Partial<FlightDetails>) =>
    onChange({ ...details, ...patch });
  const errors = flightDetailsErrors(details);
  const inputCls =
    "w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 mb-1">
        Flugdetails (optional)
      </p>
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Airline</label>
          <input
            type="text"
            value={details.airline}
            onChange={(e) => set({ airline: e.target.value })}
            placeholder="z.B. Austrian"
            className={inputCls}
          />
        </div>
        <div className="flex gap-2">
          <div className="w-32 shrink-0">
            <label className="block text-xs text-stone-500 mb-1">Hinflug-Nr.</label>
            <input
              type="text"
              value={details.outboundFlightNumber}
              onChange={(e) => set({ outboundFlightNumber: e.target.value })}
              placeholder="z.B. OS123"
              className={inputCls}
            />
          </div>
          <DateTimeRangeField
            label="Hinflug"
            start={details.outboundDeparture}
            end={details.outboundArrival}
            error={errors.outbound}
            onChange={(start, end) =>
              set({ outboundDeparture: start, outboundArrival: end })
            }
          />
        </div>
        <div className="flex gap-2">
          <div className="w-32 shrink-0">
            <label className="block text-xs text-stone-500 mb-1">Rückflug-Nr.</label>
            <input
              type="text"
              value={details.returnFlightNumber}
              onChange={(e) => set({ returnFlightNumber: e.target.value })}
              placeholder="z.B. OS124"
              className={inputCls}
            />
          </div>
          <DateTimeRangeField
            label="Rückflug"
            start={details.returnDeparture}
            end={details.returnArrival}
            error={errors.return}
            minValue={details.outboundArrival}
            onChange={(start, end) =>
              set({ returnDeparture: start, returnArrival: end })
            }
          />
        </div>
      </div>
    </div>
  );
}

type DateRangeValue = { start: CalendarDate; end: CalendarDate } | null;

function DateTimeRangeField({
  label,
  start,
  end,
  error,
  minValue,
  onChange,
}: {
  label: string;
  start: string;
  end: string;
  error?: string;
  minValue?: string;
  onChange: (start: string, end: string) => void;
}) {
  const startDT = parseMaybeDateTime(start);
  const endDT = parseMaybeDateTime(end);

  // Dates and times are edited in separate controls; an endpoint only reaches
  // the parent once both its date and its time exist. Until then the halves
  // live in local state (e.g. a time entered before the dates are picked).
  const [dates, setDates] = useState<DateRangeValue>(() =>
    startDT && endDT
      ? { start: toCalendarDate(startDT), end: toCalendarDate(endDT) }
      : null,
  );
  const [startTime, setStartTime] = useState<Time | null>(() =>
    startDT ? new Time(startDT.hour, startDT.minute) : null,
  );
  const [endTime, setEndTime] = useState<Time | null>(() =>
    endDT ? new Time(endDT.hour, endDT.minute) : null,
  );
  // Most flights land on the day they depart; a date range only appears for
  // legs that arrive the next day ("über Nacht").
  const [overnight, setOvernight] = useState(() =>
    Boolean(
      startDT &&
        endDT &&
        toCalendarDate(startDT).compare(toCalendarDate(endDT)) !== 0,
    ),
  );

  // Re-derive local state when the props change from outside (form reset,
  // another option loaded) rather than through our own emit().
  const [synced, setSynced] = useState({ start, end });
  if (synced.start !== start || synced.end !== end) {
    setSynced({ start, end });
    setDates(
      startDT && endDT
        ? { start: toCalendarDate(startDT), end: toCalendarDate(endDT) }
        : null,
    );
    setStartTime(startDT ? new Time(startDT.hour, startDT.minute) : null);
    setEndTime(endDT ? new Time(endDT.hour, endDT.minute) : null);
    setOvernight(
      Boolean(
        startDT &&
          endDT &&
          toCalendarDate(startDT).compare(toCalendarDate(endDT)) !== 0,
      ),
    );
  }

  const emit = (d: DateRangeValue, st: Time | null, et: Time | null) => {
    const startStr =
      d && st ? fmtDateTimeValue(toCalendarDateTime(d.start, st)) : "";
    const endStr = d && et ? fmtDateTimeValue(toCalendarDateTime(d.end, et)) : "";
    setSynced({ start: startStr, end: endStr });
    onChange(startStr, endStr);
  };

  const toggleOvernight = (checked: boolean) => {
    setOvernight(checked);
    if (!checked && dates && dates.start.compare(dates.end) !== 0) {
      const next = { start: dates.start, end: dates.start };
      setDates(next);
      emit(next, startTime, endTime);
    }
  };

  // Clicking anywhere in the date field opens the calendar, not just the icon
  const [dateOpen, setDateOpen] = useState(false);

  const minDT = minValue ? parseMaybeDateTime(minValue) : null;
  const timesMissing = dates !== null && (!startTime || !endTime);

  const segmentCls =
    "px-0.5 tabular-nums rounded outline-none focus:bg-amber-500 focus:text-white data-[placeholder]:text-stone-400";
  const navBtnCls =
    "w-7 h-7 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100";
  const cellCls =
    "w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer outline-none hover:bg-amber-100 data-[selected]:bg-amber-100 data-[selected]:rounded-none data-[selection-start]:bg-amber-500 data-[selection-start]:text-white data-[selection-start]:rounded-full data-[selection-end]:bg-amber-500 data-[selection-end]:text-white data-[selection-end]:rounded-full data-[outside-month]:text-stone-300 data-[disabled]:text-stone-300";
  const groupCls = `flex items-center px-2 py-1.5 border rounded-lg text-sm bg-white focus-within:ring-2 ${
    error
      ? "border-red-400 focus-within:ring-red-400"
      : "border-stone-300 focus-within:ring-amber-500"
  }`;

  const calendarInner = (
    <>
      <header className="flex items-center justify-between mb-2">
        <Button slot="previous" className={navBtnCls}>
          ‹
        </Button>
        <Heading className="text-sm font-semibold text-stone-700" />
        <Button slot="next" className={navBtnCls}>
          ›
        </Button>
      </header>
      <CalendarGrid className="text-sm">
        {(date) => <CalendarCell date={date} className={cellCls} />}
      </CalendarGrid>
    </>
  );

  const calendarButton = (
    <Button className="ml-auto pl-2 text-stone-400 hover:text-amber-600 outline-none">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
    </Button>
  );

  const popoverCls = "bg-white border border-stone-200 rounded-xl shadow-lg p-3";

  return (
    // Rest of the app formats dates with de-AT (see fmtDate/fmtTime)
    <I18nProvider locale="de-AT">
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 flex-wrap">
          {overnight ? (
            <DateRangePicker
              value={dates}
              isOpen={dateOpen}
              onOpenChange={setDateOpen}
              isInvalid={Boolean(error)}
              minValue={minDT ? toCalendarDate(minDT) : undefined}
              onChange={(range) => {
                const next = range
                  ? { start: range.start, end: range.end }
                  : null;
                setDates(next);
                emit(next, startTime, endTime);
              }}
              className="flex-1 min-w-0"
            >
              <Label className="block text-xs text-stone-500 mb-1">
                {label} (Abflug – Ankunft)
              </Label>
              <Group
                onClick={() => setDateOpen(true)}
                className={`${groupCls} w-full cursor-pointer`}
              >
                <DateInput slot="start" className="flex">
                  {(segment) => (
                    <DateSegment segment={segment} className={segmentCls} />
                  )}
                </DateInput>
                <span aria-hidden="true" className="px-1.5 text-stone-400">
                  –
                </span>
                <DateInput slot="end" className="flex">
                  {(segment) => (
                    <DateSegment segment={segment} className={segmentCls} />
                  )}
                </DateInput>
                {calendarButton}
              </Group>
              <Popover className={popoverCls}>
                <Dialog>
                  <RangeCalendar>{calendarInner}</RangeCalendar>
                </Dialog>
              </Popover>
            </DateRangePicker>
          ) : (
            <DatePicker
              value={dates ? dates.start : null}
              isOpen={dateOpen}
              onOpenChange={setDateOpen}
              isInvalid={Boolean(error)}
              minValue={minDT ? toCalendarDate(minDT) : undefined}
              onChange={(date) => {
                const next = date ? { start: date, end: date } : null;
                setDates(next);
                emit(next, startTime, endTime);
              }}
              className="flex-1 min-w-0"
            >
              <Label className="block text-xs text-stone-500 mb-1">
                {label} (Datum)
              </Label>
              <Group
                onClick={() => setDateOpen(true)}
                className={`${groupCls} w-full cursor-pointer`}
              >
                <DateInput className="flex">
                  {(segment) => (
                    <DateSegment segment={segment} className={segmentCls} />
                  )}
                </DateInput>
                {calendarButton}
              </Group>
              <Popover className={popoverCls}>
                <Dialog>
                  <Calendar>{calendarInner}</Calendar>
                </Dialog>
              </Popover>
            </DatePicker>
          )}
          <label className="flex items-center gap-1.5 text-xs text-stone-500 self-end pb-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={overnight}
              onChange={(e) => toggleOvernight(e.target.checked)}
              className="accent-amber-500"
            />
            über Nacht
          </label>
          <div className="shrink-0">
            <span className="block text-xs text-stone-500 mb-1">
              Uhrzeit (Abflug – Ankunft)
            </span>
            <div className={groupCls}>
              <TimePickerField
                value={startTime}
                ariaLabel={`${label}: Abflug Uhrzeit`}
                onChange={(t) => {
                  setStartTime(t);
                  emit(dates, t, endTime);
                }}
              />
              <span aria-hidden="true" className="px-1.5 text-stone-400">
                –
              </span>
              <TimePickerField
                value={endTime}
                ariaLabel={`${label}: Ankunft Uhrzeit`}
                onChange={(t) => {
                  setEndTime(t);
                  emit(dates, startTime, t);
                }}
              />
            </div>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        ) : timesMissing ? (
          <p className="text-xs text-stone-400 mt-1">
            Uhrzeiten für Abflug und Ankunft ergänzen
          </p>
        ) : null}
      </div>
    </I18nProvider>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Time value rendered as a button; clicking it opens an hour/minute picker
function TimePickerField({
  value,
  ariaLabel,
  onChange,
}: {
  value: Time | null;
  ariaLabel: string;
  onChange: (t: Time) => void;
}) {
  const [open, setOpen] = useState(false);
  const optionCls = (selected: boolean) =>
    `w-8 h-7 flex items-center justify-center rounded text-sm tabular-nums cursor-pointer outline-none ${
      selected
        ? "bg-amber-500 text-white"
        : "hover:bg-amber-100 text-stone-700"
    }`;

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        aria-label={ariaLabel}
        className={`px-0.5 tabular-nums rounded outline-none cursor-pointer focus:bg-amber-500 focus:text-white ${
          value ? "" : "text-stone-400"
        }`}
      >
        {value ? `${pad2(value.hour)}:${pad2(value.minute)}` : "––:––"}
      </Button>
      <Popover className="bg-white border border-stone-200 rounded-xl shadow-lg p-3">
        <Dialog className="outline-none">
          <div className="flex gap-3">
            <div>
              <p className="text-xs text-stone-500 mb-1">Stunde</p>
              <div className="grid grid-cols-4 gap-0.5">
                {Array.from({ length: 24 }, (_, h) => (
                  <Button
                    key={h}
                    className={optionCls(value?.hour === h)}
                    onPress={() => onChange(new Time(h, value?.minute ?? 0))}
                  >
                    {pad2(h)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1">Minute</p>
              <div className="grid grid-cols-2 gap-0.5">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <Button
                    key={m}
                    className={optionCls(value?.minute === m)}
                    onPress={() => {
                      onChange(new Time(value?.hour ?? 0, m));
                      setOpen(false);
                    }}
                  >
                    {pad2(m)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

// Left gutter of the timeline: vote buttons + price per row
const CHART_GUTTER_PX = 96;

function TravelTimelineChart({
  options,
  votingEnabled,
  voterToken,
  castVote,
}: {
  options: TravelOption[];
  votingEnabled: boolean;
  voterToken: string;
  castVote: (args: {
    travelOptionId: Id<"travelOptions">;
    voterToken: string;
    value: number;
  }) => Promise<null>;
}) {
  // options are pre-filtered with isPlottable, so all four times are set
  const minDep = Math.min(...options.map((o) => o.outboundDepartureTime!));
  const maxArr = Math.max(...options.map((o) => o.returnArrivalTime!));
  const domainStart = startOfDay(minDep);
  const endDay = new Date(startOfDay(maxArr));
  endDay.setDate(endDay.getDate() + 1);
  const domainEnd = endDay.getTime();

  const days: number[] = [];
  const cursor = new Date(domainStart);
  while (cursor.getTime() <= domainEnd) {
    days.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }
  const labelStep = Math.max(1, Math.ceil(days.length / 10));

  const pct = (t: number) =>
    ((t - domainStart) / (domainEnd - domainStart)) * 100;

  return (
    <div className="relative">
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{ left: CHART_GUTTER_PX }}
      >
        {days.map((d, i) =>
          i % labelStep === 0 ? (
            <div
              key={d}
              className="absolute inset-y-0 w-px bg-stone-200"
              style={{ left: `${pct(d)}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="relative h-5" style={{ marginLeft: CHART_GUTTER_PX }}>
        {days.map((d, i) =>
          i % labelStep === 0 ? (
            <span
              key={d}
              className="absolute top-0 -translate-x-1/2 text-[10px] text-stone-400 whitespace-nowrap"
              style={{ left: `${pct(d)}%` }}
            >
              {fmtDay(d)}
            </span>
          ) : null,
        )}
      </div>
      {options.map((opt) => {
        const outDep = opt.outboundDepartureTime!;
        const outArr = opt.outboundArrivalTime!;
        const retDep = opt.returnDepartureTime!;
        const retArr = opt.returnArrivalTime!;
        const outLeft = pct(outDep);
        const outWidth = Math.max(pct(outArr) - outLeft, 0);
        const retLeft = pct(retDep);
        const retWidth = Math.max(pct(retArr) - retLeft, 0);
        const lineLeft = pct(outArr);
        const lineWidth = Math.max(retLeft - lineLeft, 0);
        const boxCls = opt.isSelected
          ? "bg-green-500 group-hover:bg-green-600"
          : "bg-stone-400 group-hover:bg-stone-500";
        const lineCls = opt.isSelected ? "bg-green-300" : "bg-stone-300";
        const label = [
          opt.airline,
          `Hinflug ${opt.outboundFlightNumber ?? ""} ${fmtDate(outDep)} ${fmtTime(outDep)} bis ${fmtTime(outArr)}`,
          `Rückflug ${opt.returnFlightNumber ?? ""} ${fmtDate(retDep)} ${fmtTime(retDep)} bis ${fmtTime(retArr)}`,
          `${opt.expectedCost} Euro pro Person`,
          opt.isSelected ? "ausgewählt" : "",
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <div
            key={opt._id}
            className={`flex items-center h-12 rounded-lg ${
              opt.isSelected ? "bg-green-50" : ""
            } ${opt.isHidden ? "opacity-60" : ""}`}
          >
            <div
              className="flex items-center gap-1.5 pr-2 pl-1 shrink-0"
              style={{ width: CHART_GUTTER_PX }}
            >
              {votingEnabled && (
                <TravelVoteButtons
                  travelOptionId={opt._id}
                  voteScore={opt.voteScore}
                  voterToken={voterToken}
                  castVote={castVote}
                />
              )}
              <span className="text-xs font-medium text-stone-600 tabular-nums truncate">
                &euro;{opt.expectedCost}
              </span>
            </div>
            <div
              tabIndex={0}
              aria-label={label}
              className="group relative flex-1 h-full rounded outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-0.5 ${lineCls}`}
                style={{ left: `${lineLeft}%`, width: `${lineWidth}%` }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-4 rounded transition-colors ${boxCls}`}
                style={{ left: `${outLeft}%`, width: `${outWidth}%`, minWidth: 10 }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-4 rounded transition-colors ${boxCls}`}
                style={{ left: `${retLeft}%`, width: `${retWidth}%`, minWidth: 10 }}
              />
              <div
                className="absolute top-full z-20 hidden group-hover:block group-focus-within:block pointer-events-none"
                style={{ left: `${Math.min(outLeft, 55)}%` }}
              >
                <div className="mt-1 bg-white border border-stone-200 rounded-lg shadow-lg px-3 py-2 text-xs w-max max-w-xs">
                  <div className="flex items-center gap-2">
                    {opt.airline && (
                      <span className="font-semibold">{opt.airline}</span>
                    )}
                    <span className="font-semibold">
                      &euro;{opt.expectedCost}/Person
                    </span>
                  </div>
                  <p className="text-stone-600 mt-0.5">
                    ✈ {opt.outboundFlightNumber ? `${opt.outboundFlightNumber} · ` : ""}
                    {fmtDate(outDep)} {fmtTime(outDep)} – {fmtTime(outArr)}
                  </p>
                  <p className="text-stone-600">
                    ⇠ {opt.returnFlightNumber ? `${opt.returnFlightNumber} · ` : ""}
                    {fmtDate(retDep)} {fmtTime(retDep)} – {fmtTime(retArr)}
                  </p>
                  {opt.notes && (
                    <p className="text-stone-400 mt-0.5">{opt.notes}</p>
                  )}
                  {opt.isSelected && (
                    <p className="text-green-600 mt-0.5">Ausgewählt</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
  destinationAirport,
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
  destinationAirport?: string;
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
          destinationAirport,
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
          Suche: {originAirport} →{" "}
          {destinationAirport
            ? `${destinationAirport} (${destinationCity})`
            : destinationCity}
          , {nights} Nächte, {people ?? 1} Personen
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
