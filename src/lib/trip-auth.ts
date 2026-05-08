import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function verifyTripAccess(
  slug: string | undefined,
  userId: string | undefined,
): Promise<NextResponse | null> {
  if (!slug) {
    return NextResponse.json(
      { error: "slug is required" },
      { status: 400 },
    );
  }

  const vacation = await convex.query(api.vacations.getBySlug, { slug });

  if (!vacation) {
    return NextResponse.json(
      { error: "Trip not found" },
      { status: 404 },
    );
  }

  if (!vacation.publicEdit && (!userId || vacation.userId !== userId)) {
    return NextResponse.json(
      { error: "Not authorized" },
      { status: 403 },
    );
  }

  return null;
}
