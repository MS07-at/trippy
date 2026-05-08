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
      const cat = act.category || "Other";
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
          Things to Do
        </h4>
        {isOwner && (
          <button
            onClick={generateActivities}
            disabled={generating}
            className="text-xs px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {generating ? "Generating..." : "Generate with AI"}
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
                      <span className="text-sm font-medium">{act.name}</span>
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
          No activities yet.
          {isOwner && " Click 'Generate with AI' to get suggestions."}
        </p>
      )}
    </div>
  );
}
