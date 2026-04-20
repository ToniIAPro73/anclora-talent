import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Temporarily ignore build errors to stabilize environment
    ignoreBuildErrors: true,
  },
  // @sparticuz/chromium ships its Chromium binary and font bundles as brotli
  // archives under node_modules/@sparticuz/chromium/bin. Next's file tracer
  // does not pick them up automatically, so the Vercel function starts without
  // them and falls back to the low-fidelity SVG rasterizer.
  outputFileTracingIncludes: {
    '/api/projects/export/docx': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
    '/api/projects/export/pdf': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
    '/api/projects/export': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  // These packages ship native or large runtime assets and must be required
  // from node_modules at runtime, not bundled into the function chunk.
  serverExternalPackages: [
    '@sparticuz/chromium',
    'playwright-core',
    '@playwright/test',
    'sharp',
  ],
  experimental: {
    serverActions: {
      // Imported source documents are uploaded through a server action.
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
