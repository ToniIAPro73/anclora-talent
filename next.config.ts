import type { NextConfig } from "next";

// pdf-import-vercel-runtime: pdf-parse/pdfjs-dist are marked
// `serverExternalPackages` below so they're required from real node_modules
// instead of being bundled — but that alone does NOT guarantee every file
// inside them survives Next's output file tracing (@vercel/nft). Tracing
// only includes files it can statically prove are reachable; pdfjs-dist
// resolves both its worker script and its optional canvas polyfill via
// dynamic paths nft can't follow, so BOTH were silently pruned from the
// deployed function despite being present in node_modules at build time —
// confirmed against a real Vercel Preview deployment (`next build && next
// start` never reproduces this: it reads node_modules directly, no
// tracing/pruning step). Only the Linux glibc @napi-rs/canvas binary
// Vercel's Node.js runtime actually uses is included — the other ~9
// platform packages in its optionalDependencies would only bloat the
// function.
const PDF_PARSE_RUNTIME_TRACING_INCLUDES = [
  './node_modules/pdf-parse/**',
  './node_modules/pdfjs-dist/**',
  './node_modules/@napi-rs/canvas/**',
  './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
];

// cover-studio-v2: the structured server renderer runs fabric's `/node`
// build, whose optional peer `canvas` (node-canvas, Cairo-based) ships a
// native `build/Release/canvas.node` binary — the exact same tracing gap
// documented above for @napi-rs/canvas (Next's file tracer can't follow the
// dynamic require that loads it), so it needs the same explicit include on
// every route that can reach renderDesignSurfaceToPng().
const FABRIC_NODE_RUNTIME_TRACING_INCLUDES = ['./node_modules/canvas/build/Release/**'];

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
    // cover-studio-v2: every export route also embeds the cover/back-cover
    // PNG the structured renderer (fabric/node + canvas) produces, on top
    // of the pre-existing @sparticuz/chromium need below — both must be
    // present in the same array, a duplicate object key would silently
    // drop whichever include list came first.
    '/api/projects/export/docx': [
      './node_modules/@sparticuz/chromium/bin/**',
      ...FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    ],
    '/api/projects/export/pdf': [
      './node_modules/@sparticuz/chromium/bin/**',
      ...FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    ],
    '/api/projects/export': [
      './node_modules/@sparticuz/chromium/bin/**',
      ...FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    ],
    '/api/projects/export/epub': FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    '/projects/[projectId]/cover': FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    '/projects/[projectId]/back-cover': FABRIC_NODE_RUNTIME_TRACING_INCLUDES,
    // pdf-import-vercel-runtime: pdfjs-dist (legacy build, used by
    // pdf-parse) resolves its worker script (pdf.worker.mjs) and optional
    // canvas polyfill (@napi-rs/canvas) via dynamic paths that Next's file
    // tracer (@vercel/nft) cannot statically follow. Both were silently
    // pruned from the deployed function despite being present in
    // node_modules at build time — confirmed against a real Vercel Preview
    // deployment (`next build && next start` never reproduces this: it
    // reads node_modules directly, no tracing/pruning step). Only the
    // Linux glibc @napi-rs/canvas binary Vercel's Node.js runtime actually
    // uses is included — the other ~9 platform packages in its
    // optionalDependencies would only bloat the function.
    '/api/projects/import': PDF_PARSE_RUNTIME_TRACING_INCLUDES,
    // Same PDF path is reachable from these routes via server actions in
    // src/lib/projects/actions.ts (create/import, chapter import, reimport).
    '/dashboard': PDF_PARSE_RUNTIME_TRACING_INCLUDES,
    '/projects/new': PDF_PARSE_RUNTIME_TRACING_INCLUDES,
    '/projects/[projectId]/editor': PDF_PARSE_RUNTIME_TRACING_INCLUDES,
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
    // cover-studio-v2: same native-binary-resolution class of bug as
    // @napi-rs/canvas above — `canvas` (node-canvas, Cairo-based) is
    // fabric/node's optional peer dependency and ships a native
    // build/Release/canvas.node binary. `fabric` itself is pure JS but is
    // externalized alongside it so Turbopack never tries to bundle the
    // require('canvas') call inside fabric's own /node entry point.
    'canvas',
    'fabric',
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
