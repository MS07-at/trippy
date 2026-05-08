"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

type Activity = {
  _id: Id<"activities">;
  destinationId: Id<"destinations">;
  name: string;
  description: string;
  category?: string;
};

export function ActivitySection({
  activities,
  destinationId,
  city,
  country,
  isOwner,
  userId,
}: {
  activities: Activity[];
  destinationId: Id<"destinations">;
  city: string;
  country: string;
  isOwner: boolean;
  userId?: Id<"users">;
}) {
  const [generating, setGenerating] = useState(false);
  const removeActivity = useMutation(api.activities.remove);
  const saveBatch = useMutation(api.activities.saveBatch);

  const generateActivities = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, country }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      await saveBatch({
        destinationId,
        activities: data.activities,
      });
    } catch (err) {
      console.error("Failed to generate activities:", err);
    } finally {
      setGenerating(false);
    }
  };

  const grouped = activities.reduce(
    (acc, act) => {
      const cat = act.category || "Sonstiges";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(act);
      return acc;
    },
    {} as Record<string, Activity[]>,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-stone-700">
          Aktivitäten
        </h4>
        {isOwner && (
          <button
            onClick={generateActivities}
            disabled={generating}
            className="text-xs px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {generating ? "Wird generiert..." : "Mit KI generieren"}
          </button>
        )}
      </div>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, acts]) => (
            <div key={category}>
              <h5 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                {category}
              </h5>
              <div className="space-y-1">
                {acts.map((act) => (
                  <div
                    key={act._id}
                    className="flex items-start justify-between bg-stone-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ", " + city + ", " + country)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/tip relative text-sm font-medium hover:text-amber-600 transition-colors"
                      >
                        {act.name}
                        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100">
                          In Maps öffnen
                        </span>
                      </a>
                      <p className="text-xs text-stone-500">
                        {act.description}
                      </p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() =>
                          removeActivity({ id: act._id, userId: userId! })
                        }
                        className="text-stone-400 hover:text-red-500 text-xs ml-2 shrink-0"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Noch keine Aktivitäten.
          {isOwner && " Klicke auf 'Mit KI generieren' für Vorschläge."}
        </p>
      )}
    </div>
  );
}
