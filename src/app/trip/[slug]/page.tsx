import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import TripClient from "./TripClient";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vacation = await convex.query(api.vacations.getBySlug, { slug });

  if (!vacation) {
    return { title: "Urlaub nicht gefunden - Trippy" };
  }

  return {
    title: `${vacation.name} - Trippy`,
    description: vacation.description || "Plant euren Gruppenurlaub gemeinsam",
    openGraph: {
      title: vacation.name,
      description: vacation.description || "Plant euren Gruppenurlaub gemeinsam",
      siteName: "Trippy",
      images: ["/favicon.png"],
    },
  };
}

export default function TripPage() {
  return <TripClient />;
}
