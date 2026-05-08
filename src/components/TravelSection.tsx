"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

const MODE_LABELS: Record<string, string> = {
  flight: "Flight",
  train: "Train",
  car: "Car",
};

const MODE_ICONS: Record<string, string> = {
  flight: "\u2708\uFE0F",
  train: "\uD83D\uDE86",
  car: "\uD83D\uDE97",
};

type TravelOption = {
  _id: Id<"travelOptions">;
  destinationId: Id<"destinations">;
  mode: "flight" | "train" | "car";
  expectedCost: number;
  notes?: string;
};

export function TravelSection({
  travelOptions,
  destinationId,
  isOwner,
  userId,
}: {
  travelOptions: TravelOption[];
  destinationId: Id<"destinations">;
  isOwner: boolean;
  userId?: Id<"users">;
}) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"flight" | "train" | "car">("flight");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<Id<"travelOptions"> | null>(null);
  const [editMode, setEditMode] = useState<"flight" | "train" | "car">("flight");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const addTravel = useMutation(api.travelOptions.add);
  const updateTravel = useMutation(api.travelOptions.update);
  const removeTravel = useMutation(api.travelOptions.remove);

  const startEdit = (opt: TravelOption) => {
    setEditingId(opt._id);
    setEditMode(opt.mode);
    setEditCost(String(opt.expectedCost));
    setEditNotes(opt.notes ?? "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editCost) return;
    await updateTravel({
      id: editingId,
      mode: editMode,
      expectedCost: parseFloat(editCost),
      notes: editNotes.trim() || undefined,
      userId: userId!,
    });
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost) return;
    await addTravel({
      destinationId,
      mode,
      expectedCost: parseFloat(cost),
      notes: notes.trim() || undefined,
      userId: userId!,
    });
    setCost("");
    setNotes("");
    setAdding(false);
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-stone-700 mb-2">
        Travel Options
      </h4>
      {travelOptions.length > 0 ? (
        <div className="space-y-2">
          {travelOptions.map((opt) =>
            editingId === opt._id ? (
              <form
                key={opt._id}
                onSubmit={handleEdit}
                className="flex items-end gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200"
              >
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Mode</label>
                  <select
                    value={editMode}
                    onChange={(e) =>
                      setEditMode(e.target.value as "flight" | "train" | "car")
                    }
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="flight">Flight</option>
                    <option value="train">Train</option>
                    <option value="car">Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Cost/person (&euro;)
                  </label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-stone-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-stone-500 text-sm"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div
                key={opt._id}
                className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span>{MODE_ICONS[opt.mode]}</span>
                  <span className="text-sm font-medium">
                    {MODE_LABELS[opt.mode]}
                  </span>
                  <span className="text-sm text-stone-500">
                    &euro;{opt.expectedCost}/person
                  </span>
                  {opt.notes && (
                    <span className="text-xs text-stone-400">
                      &mdash; {opt.notes}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(opt)}
                      className="text-stone-400 hover:text-amber-600 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeTravel({ id: opt._id, userId: userId! })}
                      className="text-stone-400 hover:text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-400">No travel options yet</p>
      )}

      {isOwner && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-sm text-amber-600 hover:text-amber-700"
        >
          + Add travel option
        </button>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-2 flex items-end gap-2">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "flight" | "train" | "car")
              }
              className="px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Cost/person (&euro;)
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="150"
              className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ryanair, 2h drive"
              className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-3 py-1.5 text-stone-500 text-sm"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
