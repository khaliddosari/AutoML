import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
const formattedBackendUrl = backendUrl.startsWith("http://") || backendUrl.startsWith("https://")
  ? backendUrl
  : `http://${backendUrl}`;

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
