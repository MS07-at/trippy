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

const CATEGORIES = [
  "Sehenswürdigkeiten",
  "Essen & Trinken",
  "Natur",
  "Kultur",
  "Nachtleben",
  "Shopping",
  "Abenteuer",
  "Sonstiges",
];

function ActivityForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { name: string; description: string; category?: string };
  onSave: (data: {
    name: string;
    description: string;
    category?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      category: category || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-stone-50 rounded-lg p-3 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        className="w-full text-sm border border-stone-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        ref={(el) => {
          if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }
        }}
        rows={1}
        placeholder="Beschreibung"
        className="w-full text-sm border border-stone-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none overflow-hidden"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full text-sm border border-stone-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
      >
        <option value="">Kategorie wählen...</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-2.5 py-1 text-stone-500 hover:text-stone-700 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          Speichern
        </button>
      </div>
    </form>
  );
}

export function ActivitySection({
  activities,
  destinationId,
  city,
  country,
  canEdit,
  userId,
}: {
  activities: Activity[];
  destinationId: Id<"destinations">;
  city: string;
  country: string;
  canEdit: boolean;
  userId?: Id<"users">;
}) {
  const [generating, setGenerating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"activities"> | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  const removeActivity = useMutation(api.activities.remove);
  const saveBatch = useMutation(api.activities.saveBatch);
  const addActivity = useMutation(api.activities.add);
  const updateActivity = useMutation(api.activities.update);

  const generateActivities = async () => {
    setGenerating(true);
    setShowOverwriteWarning(false);
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

  const handleGenerateClick = () => {
    if (activities.length > 0) {
      setShowOverwriteWarning(true);
    } else {
      generateActivities();
    }
  };

  const handleAdd = async (data: {
    name: string;
    description: string;
    category?: string;
  }) => {
    await addActivity({
      destinationId,
      userId,
      ...data,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async (
    id: Id<"activities">,
    data: { name: string; description: string; category?: string },
  ) => {
    await updateActivity({
      id,
      userId,
      ...data,
    });
    setEditingId(null);
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
        <h4 className="text-sm font-semibold text-stone-700">Aktivitäten</h4>
        {canEdit && (
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
              className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
            >
              Hinzufügen
            </button>
            <button
              onClick={handleGenerateClick}
              disabled={generating}
              className="text-xs px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {generating ? "Wird generiert..." : "Mit KI generieren"}
            </button>
          </div>
        )}
      </div>

      {showOverwriteWarning && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            Es gibt bereits {activities.length} Aktivität
            {activities.length !== 1 && "en"}. Die KI-Generierung wird alle
            bestehenden Aktivitäten überschreiben.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowOverwriteWarning(false)}
              className="text-xs px-2.5 py-1 text-stone-500 hover:text-stone-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={generateActivities}
              disabled={generating}
              className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {generating ? "Wird generiert..." : "Überschreiben & generieren"}
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-3">
          <ActivityForm
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {activities.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, acts]) => (
            <div key={category}>
              <h5 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                {category}
              </h5>
              <div className="space-y-1">
                {acts.map((act) =>
                  editingId === act._id ? (
                    <ActivityForm
                      key={act._id}
                      initial={{
                        name: act.name,
                        description: act.description,
                        category: act.category,
                      }}
                      onSave={(data) => handleUpdate(act._id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
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
                      {canEdit && (
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(act._id);
                              setShowAddForm(false);
                            }}
                            className="text-stone-400 hover:text-amber-500 text-xs transition-colors"
                          >
                            &#9998;
                          </button>
                          <button
                            onClick={() =>
                              removeActivity({
                                id: act._id,
                                userId,
                              })
                            }
                            className="text-stone-400 hover:text-red-500 text-xs transition-colors"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Noch keine Aktivitäten.
          {canEdit &&
            " Füge manuell Aktivitäten hinzu oder nutze die KI-Generierung."}
        </p>
      )}
    </div>
  );
}
