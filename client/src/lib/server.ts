import { cookies } from "next/headers";
import type { Pagination, SessionUser } from "@/types";
import { decodeSession, TOKEN_COOKIE } from "./session";

// Server-side helpers: used by server components only.

const API_URL = process.env.API_URL ?? "http://localhost:5001/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return decodeSession((await cookies()).get(TOKEN_COOKIE)?.value);
}

async function call(path: string) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error ?? `API request failed (${res.status})`);
  return json as { data: unknown; pagination?: Pagination };
}

export async function apiFetch<T>(path: string): Promise<T> {
  return (await call(path)).data as T;
}

export async function apiFetchPaged<T>(path: string): Promise<{ items: T[]; pagination: Pagination }> {
  const json = await call(path);
  return { items: json.data as T[], pagination: json.pagination! };
}
