"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { VacationHeader } from "@/components/VacationHeader";
import { AddDestination } from "@/components/AddDestination";
import { DestinationCard } from "@/components/DestinationCard";
import Link from "next/link";
import { useState } from "react";

export default function TripClient() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

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
  const canEdit = isOwner || !!vacation.publicEdit;
  const effectiveCanEdit = canEdit && isEditing;

  // Hidden destinations are only shown to editors (sorted to the bottom by the query)
  const visibleDestinations = effectiveCanEdit
    ? destinations
    : destinations?.filter((dest) => !dest.isHidden);

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

        <VacationHeader vacation={vacation} isOwner={isOwner} canEdit={effectiveCanEdit} userId={user?.id} isEditing={isEditing} onToggleEditing={() => setIsEditing(!isEditing)} showEditToggle={canEdit} slug={slug} />

        {effectiveCanEdit && (
          <AddDestination vacationId={vacation._id} userId={user?.id} slug={slug} />
        )}

        <div className="space-y-6 mt-6">
          {visibleDestinations?.map((dest) => (
            <DestinationCard
              key={dest._id}
              destination={dest}
              isOwner={isOwner}
              canEdit={effectiveCanEdit}
              userId={user?.id}
              nights={vacation.nights}
              people={vacation.people}
              originAirport={vacation.originAirport}
              votingEnabled={vacation.votingEnabled !== false}
              slug={slug}
            />
          ))}
          {visibleDestinations?.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Noch keine Reiseziele.{" "}
              {canEdit
                ? "Füge oben eines hinzu!"
                : "Der Organisator hat noch keine Reiseziele hinzugefügt."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
