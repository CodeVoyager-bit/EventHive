import type { MetadataRoute } from "next";

// Installable app: add EventHive to the home screen; My Tickets then opens even without signal
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EventHive",
    short_name: "EventHive",
    description: "Find gigs, meetups and more across India, and get in with a live ticket.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f6f3",
    theme_color: "#f6f6f3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My tickets", url: "/bookings" },
      { name: "Explore events", url: "/events" },
    ],
  };
}
