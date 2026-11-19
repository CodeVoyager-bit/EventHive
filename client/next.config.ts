import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // keep the floating Next.js badge out of demos and screenshots
  // Lighthouse and crawlers that do not run JavaScript get metadata in <head> instead of streamed into the body
  htmlLimitedBots: /Chrome-Lighthouse|Bingbot|DuckDuckBot|Slurp|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|Applebot/i,
  images: {
    // Organizers paste any https image URL for their event
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
