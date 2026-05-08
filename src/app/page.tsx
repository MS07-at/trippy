"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import Link from "next/link";

function AuthForm() {
  const { login, register } = useAuth();
  const registrationEnabled = useQuery(api.users.isRegistrationEnabled) ?? false;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "data" in err && typeof (err as { data: unknown }).data === "string") {
        setError((err as { data: string }).data);
      } else if (err instanceof Error) {
        setError("Something went wrong. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-10">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => { setMode("login"); setError(""); }}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${mode === "login" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Log in
        </button>
        {registrationEnabled && (
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${mode === "register" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
          >
            Register
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? "..." : mode === "login" ? "Log in" : "Register"}
        </button>
      </form>
    </div>
  );
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const vacations = useQuery(
    api.vacations.list,
    user ? { userId: user.id } : "skip",
  );
  const createVacation = useMutation(api.vacations.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setCreating(true);
    try {
      const result = await createVacation({
        name: name.trim(),
        description: description.trim() || undefined,
        userId: user.id,
      });
      window.location.href = `/trip/${result.slug}`;
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Trippy</h1>
          <p className="text-stone-500 text-lg">
            Plan your next group vacation together
          </p>
        </div>

        {!user ? (
          <>
            <p className="text-center text-stone-500 mb-6">
              Log in or register to create and manage vacations.
            </p>
            <AuthForm />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 bg-white rounded-lg border border-stone-200 px-4 py-3">
              <span className="text-sm text-stone-600">
                Logged in as <span className="font-semibold">{user.username}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                Log out
              </button>
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
          </>
        )}
      </div>
    </main>
  );
}
