import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // L'emulatore Android raggiunge il Mac all'indirizzo 10.0.2.2 (solo sviluppo).
  allowedDevOrigins: ["10.0.2.2"],
  experimental: {
    // Le foto profilo vengono ridimensionate nel browser, ma lasciamo margine.
    serverActions: { bodySizeLimit: "5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
