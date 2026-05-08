"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { VacationHeader } from "@/components/VacationHeader";
import { AddDestination } from "@/components/AddDestination";
import { DestinationCard } from "@/components/DestinationCard";
import Link from "next/link";

export default function TripPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();

  const vacation = useQuery(api.vacations.getBySlug, { slug });
  const destinations = useQuery(
    api.destinations.listByVacation,
    vacation ? { vacationId: vacation._id } : "skip",
  );

  if (vacation === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Laden...</div>
      </div>
    );
  }

  if (vacation === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500">Urlaub nicht gefunden</p>
        <Link href="/" className="text-amber-600 hover:underline">
          Zur Startseite
        </Link>
      </div>
    );
  }

  const isOwner = !!user && vacation.userId === user.id;

  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwner && (
          <Link
            href="/"
            className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block"
          >
            &larr; Zurück
          </Link>
        )}

        <VacationHeader vacation={vacation} isOwner={isOwner} userId={user?.id} />

        {isOwner && user && (
          <AddDestination vacationId={vacation._id} userId={user.id} />
        )}

        <div className="space-y-6 mt-6">
          {destinations?.map((dest) => (
            <DestinationCard
              key={dest._id}
              destination={dest}
              isOwner={isOwner}
              userId={user?.id}
              nights={vacation.nights}
              people={vacation.people}
            />
          ))}
          {destinations?.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Noch keine Reiseziele.{" "}
              {isOwner
                ? "Füge oben eines hinzu!"
                : "Der Organisator hat noch keine Reiseziele hinzugefügt."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
