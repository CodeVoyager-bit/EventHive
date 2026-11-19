// EventHive service worker: keeps My Tickets usable with no signal at the venue.
// The live QR code is computed on the device (Web Crypto), so a cached copy of the page is enough.
// Registered only in production builds (components/ServiceWorker.tsx).
const VERSION = "eh-v1";
const STATIC = `${VERSION}-static`; // hashed build files and icons: they never change
const TICKETS = `${VERSION}-tickets`; // the signed-in person's My Tickets page; cleared on log out

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

// Saves My Tickets and every build file it needs, so it can boot offline
async function saveTickets() {
  const res = await fetch("/bookings", { credentials: "include" });
  if (!res.ok || res.redirected) return;
  const html = await res.clone().text();
  await (await caches.open(TICKETS)).put("/bookings", res);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  const store = await caches.open(STATIC);
  await Promise.all(assets.map((url) => store.match(url).then((hit) => hit || store.add(url).catch(() => {}))));
}

const offline = () =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · EventHive</title>
    <style>body{font-family:system-ui,sans-serif;background:#f6f6f3;color:#16161d;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
    a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#ffd23f;color:#16161d;font-weight:700;text-decoration:none}</style></head>
    <body><div><h1>You're offline</h1><p>Your tickets still work without signal.</p><a href="/bookings">Open My Tickets</a></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // ponytail: the static cache isn't trimmed; VERSION bumps clear it
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (store) => {
        const hit = await store.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) store.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    const isTickets = url.pathname === "/bookings";
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isTickets && res.ok && !res.redirected) event.waitUntil(saveTickets());
          return res;
        })
        .catch(async () => (isTickets && (await caches.match("/bookings", { cacheName: TICKETS }))) || offline())
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "save-tickets") event.waitUntil(saveTickets());
  if (event.data === "logout") event.waitUntil(caches.delete(TICKETS));
});
