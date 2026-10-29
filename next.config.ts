import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  poweredByHeader: false,
  // Protezioni del browser su tutte le pagine: niente pagine dentro siti altrui (clickjacking),
  // niente "indovinare" il tipo dei file, indirizzo di provenienza ridotto, sensori solo per noi.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self)' },
        ],
      },
    ]
  },
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
