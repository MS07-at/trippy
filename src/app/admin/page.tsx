"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import Link from "next/link";

type Tab = "info" | "trips";

function UserDetail({
  token,
  selectedUser,
  isSelf,
}: {
  token: string;
  selectedUser: {
    id: Id<"users">;
    username: string;
    admin: boolean;
    createdAt: number;
  };
  isSelf: boolean;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [error, setError] = useState("");

  const vacations = useQuery(api.admin.listVacationsForUser, {
    token,
    userId: selectedUser.id,
  });
  const setAdmin = useMutation(api.admin.setAdmin);

  const handleToggleAdmin = async () => {
    setError("");
    try {
      await setAdmin({
        token,
        userId: selectedUser.id,
        admin: !selectedUser.admin,
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "data" in err && typeof (err as { data: unknown }).data === "string") {
        setError((err as { data: string }).data);
      } else {
        setError("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-lg font-semibold mb-4">{selectedUser.username}</h2>

      <div className="flex gap-4 mb-4 border-b border-stone-200">
        <button
          onClick={() => setTab("info")}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${tab === "info" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Informationen
        </button>
        <button
          onClick={() => setTab("trips")}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${tab === "trips" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Geplante Urlaube
        </button>
      </div>

      {tab === "info" ? (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-stone-700">Benutzername</div>
            <div className="text-sm text-stone-500 mt-0.5">{selectedUser.username}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-stone-700">Registriert am</div>
            <div className="text-sm text-stone-500 mt-0.5">
              {new Date(selectedUser.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-stone-700">Administrator</div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-stone-500">
                {selectedUser.admin ? "Ja" : "Nein"}
              </span>
              {!isSelf && (
                <button
                  onClick={handleToggleAdmin}
                  className="text-sm text-amber-600 hover:text-amber-700 transition-colors font-medium"
                >
                  {selectedUser.admin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          {vacations === undefined ? (
            <div className="animate-pulse text-stone-400 text-sm">Laden...</div>
          ) : !vacations || vacations.length === 0 ? (
            <p className="text-sm text-stone-500">Keine geplanten Urlaube.</p>
          ) : (
            <ul className="space-y-2">
              {vacations.map((vac) => (
                <li key={vac.id}>
                  <Link
                    href={`/trip/${vac.slug}`}
                    className="block rounded-lg border border-stone-200 px-4 py-3 text-sm font-medium hover:border-amber-300 transition-colors"
                  >
                    {vac.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<Id<"users"> | null>(null);

  const users = useQuery(api.admin.listUsers, user ? { token: user.token } : "skip");

  if (loading || (user && users === undefined)) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Laden...</div>
      </main>
    );
  }

  if (!user || users === null) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 mb-4">
            Du hast keinen Zugriff auf diese Seite.
          </p>
          <Link href="/" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
            Zurück zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const selectedUser = users?.find((u) => u.id === selectedId) ?? null;

  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Zurück zur Startseite
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Benutzerverwaltung
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[16rem_1fr] gap-6 items-start">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3">
            <h2 className="text-sm font-semibold text-stone-500 px-2 py-1 mb-1">
              Benutzer ({users?.length ?? 0})
            </h2>
            <ul className="space-y-1">
              {users?.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => setSelectedId(u.id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${u.id === selectedId ? "bg-amber-50 text-amber-700 font-medium" : "text-stone-600 hover:bg-stone-50"}`}
                  >
                    {u.username}
                    {u.admin && (
                      <span className="ml-2 text-xs text-amber-600">Admin</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedUser ? (
            <UserDetail
              token={user.token}
              selectedUser={selectedUser}
              isSelf={selectedUser.id === user.id}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-sm text-stone-500">
              Wähle einen Benutzer aus, um Details anzuzeigen.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
