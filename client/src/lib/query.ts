export type SearchParams = Record<string, string | string[] | undefined>;

// Builds "?a=1&b=2" from the current params plus overrides (null/"" removes a key)
export function qs(params: SearchParams, overrides: Record<string, string | number | null | undefined> = {}): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) u.set(k, s);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null || v === "") u.delete(k);
    else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
