"use client";

import { useEffect } from "react";

// Installs the offline worker in production builds only (a dev server's files change constantly)
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

// My Tickets asks the worker to keep a copy, even when it was reached by in-app navigation
export function SaveTicketsOffline() {
  useEffect(() => {
    navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage("save-tickets")).catch(() => {});
  }, []);
  return null;
}

// Signing out removes the offline copy of someone's tickets from this device
export async function forgetOfflineTickets() {
  try {
    navigator.serviceWorker?.controller?.postMessage("logout");
    if ("caches" in window) for (const key of await caches.keys()) if (key.endsWith("-tickets")) await caches.delete(key);
  } catch {
    /* nothing cached */
  }
}
