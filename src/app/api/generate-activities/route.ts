import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { city, country } = await req.json();

  if (!city || !country) {
    return NextResponse.json(
      { error: "city and country are required" },
      { status: 400 },
    );
  }

  const result = await generateText({
    model: "openai/gpt-4o-mini",
    output: Output.object({
      schema: z.object({
        activities: z.array(
          z.object({
            name: z.string().describe("Name der Aktivität oder Sehenswürdigkeit"),
            description: z
              .string()
              .describe("Kurze Beschreibung (1-2 Sätze) auf Deutsch"),
            category: z
              .string()
              .describe(
                "Kategorie wie Sehenswürdigkeiten, Essen & Trinken, Natur, Kultur, Nachtleben, Shopping, Abenteuer",
              ),
          }),
        ),
      }),
    }),
    prompt: `Erstelle eine Liste von 10-15 interessanten Sehenswürdigkeiten in ${city}, ${country} für Touristen. Beinhalte eine Mischung aus beliebten Attraktionen, lokalen Geheimtipps, kulinarischen Erlebnissen und Outdoor-Aktivitäten. Gruppiere sie nach Kategorie. Über den Namen muss man mit Google Maps die Attraktionen finden können.. `,
  });

  return NextResponse.json(result.output);
}
