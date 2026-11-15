import type { SessionUser } from "@/types";

// Shared by the Next server (lib/server.ts) and the route proxy (proxy.ts). No Next imports here.
export const TOKEN_COOKIE = "token";

// Reads the signed-in user from the JWT for rendering and redirects.
// ponytail: payload decoded without verifying the signature; every data request still carries
// the token to Express, which verifies it, so a forged cookie only changes page chrome.
export function decodeSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { id: payload.id, name: payload.name ?? "", email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
