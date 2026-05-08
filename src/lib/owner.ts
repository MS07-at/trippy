import { nanoid } from "nanoid";

const OWNER_TOKEN_KEY = "trippy_owner_token";
const AUTH_KEY = "trippy_auth";

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  const auth = localStorage.getItem(AUTH_KEY);
  if (auth) {
    try {
      const { token } = JSON.parse(auth);
      if (token) return token;
    } catch {}
  }
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = nanoid(21);
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}
