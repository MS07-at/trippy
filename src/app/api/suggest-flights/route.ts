import { NextRequest, NextResponse } from "next/server";
import { verifyTripAccess } from "@/lib/trip-auth";
import {
  createOfferRequest,
  findAirport,
  type DuffelOffer,
  type DuffelSlice,
} from "@/lib/duffel";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_DAYS = 31;
const MAX_PAIR_SAMPLES = 8;
const MAX_RESULTS = 20;

type Pattern = "A" | "B";

type SuggestedOffer = {
  pattern: Pattern;
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
  notes?: string;
};

function toIsoDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

function startOfDay(epoch: number): number {
  const d = new Date(epoch);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function firstSegment(slice: DuffelSlice) {
  return slice.segments[0];
}

function lastSegment(slice: DuffelSlice) {
  return slice.segments[slice.segments.length - 1];
}

function hourOf(iso: string): number {
  return parseInt(iso.slice(11, 13), 10);
}

function offerToSuggestion(
  offer: DuffelOffer,
  pattern: Pattern,
  tripStartDate: number,
  tripEndDate: number,
): SuggestedOffer | null {
  const outboundSlice = offer.slices[0];
  const returnSlice = offer.slices[1];
  if (!outboundSlice || !returnSlice) return null;

  const outFirst = firstSegment(outboundSlice);
  const outLast = lastSegment(outboundSlice);
  const retFirst = firstSegment(returnSlice);
  const retLast = lastSegment(returnSlice);
  if (!outFirst || !outLast || !retFirst || !retLast) return null;

  const outHour = hourOf(outFirst.departing_at);
  const retHour = hourOf(retFirst.departing_at);

  if (pattern === "A") {
    if (outHour >= 12 || retHour < 18) return null;
  } else {
    if (outHour < 18 || retHour >= 12) return null;
  }

  const outDepart = Date.parse(outFirst.departing_at);
  const outArrive = Date.parse(outLast.arriving_at);
  const retDepart = Date.parse(retFirst.departing_at);
  const retArrive = Date.parse(retLast.arriving_at);
  const total = parseFloat(offer.total_amount);
  if (!Number.isFinite(total)) return null;

  const airline =
    outFirst.marketing_carrier?.name ?? outFirst.operating_carrier?.name;
  const outNumber = `${outFirst.marketing_carrier.iata_code} ${outFirst.marketing_carrier_flight_number}`;
  const retNumber = `${retFirst.marketing_carrier.iata_code} ${retFirst.marketing_carrier_flight_number}`;

  return {
    pattern,
    patternLabel:
      pattern === "A" ? "Volltagsbetrieb" : "Maximal vor Ort",
    airline,
    outboundFlightNumber: outNumber,
    outboundDepartureTime: outDepart,
    outboundArrivalTime: outArrive,
    returnFlightNumber: retNumber,
    returnDepartureTime: retDepart,
    returnArrivalTime: retArrive,
    tripStartDate,
    tripEndDate,
    expectedCost: total,
    currency: offer.total_currency,
  };
}

export async function POST(req: NextRequest) {
  const {
    slug,
    userId,
    originAirport,
    destinationCity,
    destinationCountry,
    nights,
    people,
    searchStart,
    searchEnd,
  } = await req.json();

  const denied = await verifyTripAccess(slug, userId);
  if (denied) return denied;

  if (!originAirport || typeof originAirport !== "string") {
    return NextResponse.json(
      { error: "originAirport is required" },
      { status: 400 },
    );
  }
  if (!destinationCity || typeof destinationCity !== "string") {
    return NextResponse.json(
      { error: "destinationCity is required" },
      { status: 400 },
    );
  }
  const tripNights = Number(nights);
  if (!Number.isFinite(tripNights) || tripNights < 1) {
    return NextResponse.json(
      { error: "nights must be ≥ 1" },
      { status: 400 },
    );
  }
  const passengers = Math.max(1, Number(people) || 1);
  const winStart = startOfDay(Number(searchStart));
  const winEnd = startOfDay(Number(searchEnd));
  if (!Number.isFinite(winStart) || !Number.isFinite(winEnd) || winEnd <= winStart) {
    return NextResponse.json(
      { error: "searchStart/searchEnd invalid" },
      { status: 400 },
    );
  }
  if ((winEnd - winStart) / DAY_MS > MAX_WINDOW_DAYS) {
    return NextResponse.json(
      { error: "Search window may not exceed 31 days" },
      { status: 400 },
    );
  }

  const origin = originAirport.trim().toUpperCase();
  const destPlace = await findAirport(
    `${destinationCity} ${destinationCountry ?? ""}`.trim(),
  );
  if (!destPlace?.iata_code) {
    return NextResponse.json(
      { error: `Could not resolve an airport for ${destinationCity}` },
      { status: 502 },
    );
  }
  const destination = destPlace.iata_code;

  const tripDurationMs = tripNights * DAY_MS;
  const latestStart = winEnd - tripDurationMs;
  if (latestStart < winStart) {
    return NextResponse.json(
      { error: "Window is too short for the given trip duration" },
      { status: 400 },
    );
  }

  const totalCandidates = Math.floor((latestStart - winStart) / DAY_MS) + 1;
  const step = Math.max(1, Math.floor(totalCandidates / MAX_PAIR_SAMPLES));
  const tripStarts: number[] = [];
  for (let i = 0; i < totalCandidates && tripStarts.length < MAX_PAIR_SAMPLES; i += step) {
    tripStarts.push(winStart + i * DAY_MS);
  }

  const results: SuggestedOffer[] = [];
  for (const tripStart of tripStarts) {
    const tripEnd = tripStart + tripDurationMs;

    const aOffers = await createOfferRequest({
      origin,
      destination,
      outboundDate: toIsoDate(tripStart),
      returnDate: toIsoDate(tripEnd),
      passengers,
    }).catch(() => [] as DuffelOffer[]);
    for (const offer of aOffers) {
      const s = offerToSuggestion(offer, "A", tripStart, tripEnd);
      if (s) results.push(s);
    }

    const bOutbound = tripStart - DAY_MS;
    const bReturn = tripEnd + DAY_MS;
    if (bOutbound >= winStart && bReturn <= winEnd) {
      const bOffers = await createOfferRequest({
        origin,
        destination,
        outboundDate: toIsoDate(bOutbound),
        returnDate: toIsoDate(bReturn),
        passengers,
      }).catch(() => [] as DuffelOffer[]);
      for (const offer of bOffers) {
        const s = offerToSuggestion(offer, "B", bOutbound, bReturn);
        if (s) results.push(s);
      }
    }
  }

  const seen = new Set<string>();
  const deduped = results
    .filter((s) => {
      const key = `${s.outboundFlightNumber}|${s.returnFlightNumber}|${s.tripStartDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.expectedCost - b.expectedCost)
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ offers: deduped });
}
