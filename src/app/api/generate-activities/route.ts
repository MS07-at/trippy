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
    model: openai("gpt-4o-mini"),
    output: Output.object({
      schema: z.object({
        activities: z.array(
          z.object({
            name: z.string().describe("Name of the activity or attraction"),
            description: z
              .string()
              .describe("Brief description (1-2 sentences)"),
            category: z
              .string()
              .describe(
                "Category like Sightseeing, Food & Drink, Nature, Culture, Nightlife, Shopping, Adventure",
              ),
          }),
        ),
      }),
    }),
    prompt: `Generate a list of 10-15 interesting things to do in ${city}, ${country} for tourists. Include a mix of popular attractions, local hidden gems, food experiences, and outdoor activities. Group them by category.`,
  });

  return NextResponse.json(result.output);
}
