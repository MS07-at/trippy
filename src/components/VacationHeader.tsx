"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

export function VacationHeader({
  vacation,
  isOwner,
  ownerToken,
}: {
  vacation: Doc<"vacations">;
  isOwner: boolean;
  ownerToken: string;
}) {
  const [copied, setCopied] = useState(false);
  const updateVacation = useMutation(api.vacations.update);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/trip/${vacation.slug}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNightsChange = (value: string) => {
    const nights = parseInt(value, 10);
    if (nights > 0) {
      updateVacation({ id: vacation._id, ownerToken, nights });
    }
  };

  const handlePeopleChange = (value: string) => {
    const people = parseInt(value, 10);
    if (people > 0) {
      updateVacation({ id: vacation._id, ownerToken, people });
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{vacation.name}</h1>
          {vacation.description && (
            <p className="text-stone-500 mt-1">{vacation.description}</p>
          )}
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 px-4 py-2 text-sm bg-white border border-stone-200 rounded-lg hover:border-amber-300 transition-colors"
        >
          {copied ? "Copied!" : "Share Link"}
        </button>
      </div>

      <div className="flex items-center gap-4 mt-3">
        {isOwner && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            You are the organizer
          </span>
        )}

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Nights:</span>
            {isOwner ? (
              <input
                type="number"
                min="1"
                defaultValue={vacation.nights ?? ""}
                placeholder="-"
                onBlur={(e) => handleNightsChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-14 px-1.5 py-0.5 border border-stone-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            ) : (
              <span className="font-medium">
                {vacation.nights ?? "-"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">People:</span>
            {isOwner ? (
              <input
                type="number"
                min="1"
                defaultValue={vacation.people ?? ""}
                placeholder="-"
                onBlur={(e) => handlePeopleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-14 px-1.5 py-0.5 border border-stone-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            ) : (
              <span className="font-medium">
                {vacation.people ?? "-"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
