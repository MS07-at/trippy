"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";

export function VacationHeader({
  vacation,
  isOwner,
  userId,
}: {
  vacation: Doc<"vacations">;
  isOwner: boolean;
  userId?: Id<"users">;
}) {
  const [copied, setCopied] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [shareError, setShareError] = useState("");
  const updateVacation = useMutation(api.vacations.update);
  const { user } = useAuth();

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/trip/${vacation.slug}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendShareEmail = async () => {
    if (!shareEmail.trim()) return;

    setShareStatus("sending");
    setShareError("");

    try {
      const res = await fetch("/api/share-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: shareEmail.trim(),
          tripName: vacation.name,
          tripUrl: shareUrl,
          senderName: user?.username ?? "Someone",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setShareStatus("sent");
      setShareEmail("");
      setTimeout(() => {
        setShareStatus("idle");
        setShowShareForm(false);
      }, 2000);
    } catch (e) {
      setShareStatus("error");
      setShareError(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const handleNightsChange = (value: string) => {
    const nights = parseInt(value, 10);
    if (nights > 0 && userId) {
      updateVacation({ id: vacation._id, userId, nights });
    }
  };

  const handlePeopleChange = (value: string) => {
    const people = parseInt(value, 10);
    if (people > 0 && userId) {
      updateVacation({ id: vacation._id, userId, people });
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
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={copyLink}
            className="px-4 py-2 text-sm bg-white border border-stone-200 rounded-lg hover:border-amber-300 transition-colors"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={() => setShowShareForm(!showShareForm)}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Invite
          </button>
        </div>
      </div>

      {showShareForm && (
        <div className="mt-3 p-4 bg-white border border-stone-200 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendShareEmail();
              }}
              disabled={shareStatus === "sending"}
              className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={sendShareEmail}
              disabled={shareStatus === "sending" || !shareEmail.trim()}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {shareStatus === "sending" ? "Sending..." : "Send"}
            </button>
          </div>
          {shareStatus === "sent" && (
            <p className="text-sm text-green-600 mt-2">Invitation sent!</p>
          )}
          {shareStatus === "error" && (
            <p className="text-sm text-red-600 mt-2">{shareError}</p>
          )}
        </div>
      )}

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
