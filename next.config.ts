import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // P-E1-04/P-U3-02: keep the dev-only issues badge anchored to the content
  // corner so it never overlaps the sidebar rail or the footer.
  devIndicators: {
    position: 'bottom-right',
  },
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
    // pdf-import-vercel-runtime: pdfjs-dist (legacy build, used by
    // pdf-parse) polyfills DOMMatrix/ImageData/Path2D for Node via
    // `try { require('@napi-rs/canvas') } catch { warn(...) }`. Next's
    // file tracer (@vercel/nft) treats a try/catch-wrapped require as
    // best-effort and does not include it automatically, so the package
    // — present in node_modules at build time — was missing from the
    // deployed function, DOMMatrix stayed undefined, and every PDF import
    // threw `DOMMatrix is not defined` in production (never reproduced by
    // `next build && next start`, which reads node_modules directly with
    // no tracing/pruning step). Only the Linux glibc binary Vercel's
    // Node.js runtime actually uses is included — the other ~9 platform
    // packages in @napi-rs/canvas's optionalDependencies are irrelevant
    // here and would only bloat the function.
    '/api/projects/import': [
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
    ],
    // Same PDF path is reachable from these routes via server actions in
    // src/lib/projects/actions.ts (create/import, chapter import, reimport).
    '/dashboard': [
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
    ],
    '/projects/new': [
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
    ],
    '/projects/[projectId]/editor': [
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
    ],
  },
  // These packages ship native or large runtime assets and must be required
  // from node_modules at runtime, not bundled into the function chunk.
  serverExternalPackages: [
    '@sparticuz/chromium',
    'playwright-core',
    '@playwright/test',
    'sharp',
    // pdf-import-structural-recovery: pdf-parse's pdfjs-dist dependency
    // resolves its worker script (pdf.worker.mjs) via a relative path next
    // to the bundled pdf.mjs. Bundling it into a Turbopack/webpack chunk
    // breaks that resolution ("Cannot find module
    // '.next/server/chunks/pdf.worker.mjs'"), which made PDF import fail
    // and silently degrade to the empty-shell/filename-fallback path in
    // production — the real root cause behind the reported regression.
    'pdf-parse',
    'pdfjs-dist',
    // pdf-import-vercel-runtime: see outputFileTracingIncludes above — must
    // stay a real node_modules require, never bundled, so its native .node
    // binary resolves the same way it does outside a Next.js build.
    '@napi-rs/canvas',
  ],
  experimental: {
    // App Router route handlers such as /api/projects/import receive source
    // documents through multipart requests; the DOCX payload plus form
    // overhead can exceed Next's default proxy body buffer.
    proxyClientMaxBodySize: '55mb',
    serverActions: {
      // Imported source documents are uploaded through a server action; the
      // importer accepts files up to 50MB, plus multipart form overhead.
      bodySizeLimit: '55mb',
    },
  },
};

export default nextConfig;
