// Only allow same-site relative redirects after sign-in (no open redirects)
export const safeNext = (next: string | string[] | undefined) => {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
};
