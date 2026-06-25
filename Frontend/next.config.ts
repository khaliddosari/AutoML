import type { NextConfig } from "next";

// The browser calls same-origin /api/backend/* (see lib/api.ts) and Next.js proxies
// those requests to the real backend here. This keeps the backend URL out of the
// client bundle and avoids browser CORS entirely.
//
// Set BACKEND_URL to the backend's PUBLIC https URL, e.g.
// https://modelforge-backend-2ht9.onrender.com. We use the public URL (not Render's
// private network) because free-tier web services cannot receive private traffic.
// A bare hostname is assumed public and gets https://. Defaults to local dev.
const rawBackend = process.env.BACKEND_URL ?? "http://localhost:8000";
const backendOrigin = (
  /^https?:\/\//i.test(rawBackend) ? rawBackend : `https://${rawBackend}`
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
