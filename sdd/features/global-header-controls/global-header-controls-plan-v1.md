# Global Header Controls Implementation Plan

1. Inspect TableExtractor's `LangToggle`, `ThemeToggle`, header, theme tokens,
   and interaction CSS; inspect Talent preference persistence and shared header.
2. Add named shared Talent controls and TableExtractor-derived semantic CSS.
3. Replace authenticated AppShell copies with the shared controls. Preserve the
   public Talent Landing controls exactly as-is to avoid a visual regression.
4. Add component and Playwright checks for locale/theme state, persistence,
   responsive layout, keyboard/focus, and button/switch regressions.
5. Capture reference and Talent visual states at matching viewports and inspect
   actual application surfaces.
6. Run full TypeScript, Vitest, lint, build, visual QA, and diff checks; commit
   and push only to `development`, then verify the exact Vercel preview SHA.
