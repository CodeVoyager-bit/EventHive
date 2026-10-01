import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Organizers paste any https image URL for their event
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
