// Only allow same-site relative redirects after sign-in (no open redirects).
// "/\\evil.com" and "//evil.com" both resolve off-site in browsers, so resolve and compare origins.
export const safeNext = (next: string | string[] | undefined) => {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || /[\\\u0000-\u001f]/.test(value)) return "/";
  const base = "https://eventhive.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
};
