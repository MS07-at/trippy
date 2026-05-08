import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { verifyTripAccess } from "@/lib/trip-auth";

export async function POST(req: NextRequest) {
  const { city, country, slug, userId } = await req.json();

  const denied = await verifyTripAccess(slug, userId);
  if (denied) return denied;

  if (!city || !country) {
    return NextResponse.json(
      { error: "city and country are required" },
      { status: 400 },
    );
  }

  const result = await generateText({
    model: "openai/gpt-4o-mini",
    prompt: `Schreibe eine kurze, ansprechende Beschreibung der Stadt ${city} in ${country} für Urlauber. Maximal 4 Sätze auf Deutsch. Keine Überschrift, nur den Fließtext in Markdown.`,
  });

  return NextResponse.json({ description: result.text.trim() });
}
