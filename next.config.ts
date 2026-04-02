import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Imported source documents are uploaded through a server action.
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
