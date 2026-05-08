"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const AUTH_KEY = "trippy_auth";

type AuthUser = {
  id: Id<"users">;
  username: string;
  token: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loginMutation = useMutation(api.users.login);
  const registerMutation = useMutation(api.users.register);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginMutation({ username, password });
    const authUser: AuthUser = { id: result.id, username: result.username, token: result.token };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, [loginMutation]);

  const register = useCallback(async (username: string, password: string) => {
    const result = await registerMutation({ username, password });
    const authUser: AuthUser = { id: result.id, username: result.username, token: result.token };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, [registerMutation]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
