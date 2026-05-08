"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getOwnerToken } from "@/lib/owner";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [ownerToken, setOwnerToken] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setOwnerToken(getOwnerToken());
  }, []);

  const vacations = useQuery(
    api.vacations.list,
    ownerToken ? { ownerToken } : "skip",
  );
  const createVacation = useMutation(api.vacations.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const result = await createVacation({
        name: name.trim(),
        description: description.trim() || undefined,
        ownerToken,
      });
      window.location.href = `/trip/${result.slug}`;
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Trippy</h1>
          <p className="text-stone-500 text-lg">
            Plan your next group vacation together
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-10">
          <h2 className="text-lg font-semibold mb-4">Create a new vacation</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer 2026 Trip"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A week-long adventure with friends..."
                rows={2}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {creating ? "Creating..." : "Create Vacation"}
            </button>
          </form>
        </div>

        {vacations && vacations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your vacations</h2>
            <div className="space-y-3">
              {vacations.map((v) => (
                <Link
                  key={v._id}
                  href={`/trip/${v.slug}`}
                  className="block bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-amber-300 transition-colors"
                >
                  <h3 className="font-semibold">{v.name}</h3>
                  {v.description && (
                    <p className="text-sm text-stone-500 mt-1">
                      {v.description}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-2">
                    Created {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
