const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

type DuffelInit = RequestInit & { searchParams?: Record<string, string> };

async function duffelFetch(path: string, init: DuffelInit = {}) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) throw new Error("DUFFEL_ACCESS_TOKEN is not set");

  const url = new URL(DUFFEL_BASE + path);
  if (init.searchParams) {
    for (const [k, val] of Object.entries(init.searchParams)) {
      url.searchParams.set(k, val);
    }
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Duffel ${res.status} ${path}: ${text}`);
  }

  return res.json();
}

export type DuffelPlace = {
  id: string;
  iata_code: string | null;
  iata_city_code?: string | null;
  name: string;
  type: "airport" | "city";
};

export async function findAirport(query: string): Promise<DuffelPlace | null> {
  const data = await duffelFetch("/places/suggestions", {
    method: "GET",
    searchParams: { query },
  });
  const places = (data.data ?? []) as DuffelPlace[];
  return (
    places.find((p) => p.type === "airport" && p.iata_code) ??
    places.find((p) => p.iata_code) ??
    null
  );
}

export type DuffelSegment = {
  marketing_carrier: { name: string; iata_code: string };
  operating_carrier?: { name: string; iata_code: string };
  marketing_carrier_flight_number: string;
  departing_at: string;
  arriving_at: string;
  origin: { iata_code: string };
  destination: { iata_code: string };
};

export type DuffelSlice = {
  segments: DuffelSegment[];
};

export type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: DuffelSlice[];
};

export type CreateOfferRequestArgs = {
  origin: string;
  destination: string;
  outboundDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  passengers: number;
};

export async function createOfferRequest({
  origin,
  destination,
  outboundDate,
  returnDate,
  passengers,
}: CreateOfferRequestArgs): Promise<DuffelOffer[]> {
  const body = {
    data: {
      slices: [
        { origin, destination, departure_date: outboundDate },
        { origin: destination, destination: origin, departure_date: returnDate },
      ],
      passengers: Array.from({ length: Math.max(1, passengers) }, () => ({
        type: "adult",
      })),
      cabin_class: "economy",
    },
  };

  const data = await duffelFetch("/air/offer_requests", {
    method: "POST",
    body: JSON.stringify(body),
    searchParams: { return_offers: "true" },
  });

  return (data.data?.offers ?? []) as DuffelOffer[];
}
