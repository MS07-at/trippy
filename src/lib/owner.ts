import { nanoid } from "nanoid";

const OWNER_TOKEN_KEY = "trippy_owner_token";

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = nanoid(21);
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}
