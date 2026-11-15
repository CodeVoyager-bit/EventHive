import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lighthouse and crawlers that do not run JavaScript get metadata in <head> instead of streamed into the body
  htmlLimitedBots: /Chrome-Lighthouse|Bingbot|DuckDuckBot|Slurp|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|Applebot/i,
  images: {
    // Organizers paste any https image URL for their event
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
