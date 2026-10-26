import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  outputFileTracingIncludes: {
    "/**/*": ["./assets/fonts/**/*", "./public/mascot-512.png"],
  },
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
