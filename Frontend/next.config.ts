import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

let formattedBackendUrl = backendUrl;
if (!formattedBackendUrl.startsWith("http://") && !formattedBackendUrl.startsWith("https://")) {
  if (formattedBackendUrl.includes(":")) {
    formattedBackendUrl = `http://${formattedBackendUrl}`;
  } else {
    // If it's a Render internal hostname (no port and no protocol),
    // append Render's default internal port :10000.
    formattedBackendUrl = `http://${formattedBackendUrl}:10000`;
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${formattedBackendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
