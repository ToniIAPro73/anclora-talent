# Chapters / Editor Full-Viewport Closure — v1

## Objective

Close Step 2 as a dedicated workspace transition: chapter management and the
single-chapter editor must be mutually exclusive visual states, while using
the existing Anclora button primitives and preserving real chapter behavior.

## Contract

- The editor is rendered as the active workspace state, not as a modal overlay.
- The management list, preview, properties, and management action bar are not
  mounted while the editor is active.
- The editor fills the usable application content viewport and owns one
  deliberate internal scroll model.
- Chapter navigation appears once, in the editor header.
- The canonical eight-step workflow rail is rendered in Chapter Management and
  is not rendered in the Chapter Editor; the editor header is the only route
  context/navigation chrome for the active chapter.
- Save remains a real action and the bottom bar reports real editor status.
- Normal editing is already full viewport; focus mode is an additional
  distraction-free state.
- Chapter controls use the existing `ac-button` variants and compact icon
  treatment; no new visual button system is introduced.
- Management and editor controls use the design-system `0.6.0` contract for
  compact density and icon-only accessible names, while the rich-text toolbar
  continues to use the design-system editorial toolbar pattern.
- Existing chapter CRUD, ordering, persistence, navigation, formatting, and
  responsive behavior remain functional.

## Verification

- Add regression assertions for editor viewport ownership and the absence of
  management-specific elements.
- Verify TypeScript, Vitest, ESLint, production build, and diff whitespace.
- Run shared visual QA at desktop, tablet, and mobile sizes in both themes and
  Spanish/English where available.
- Deploy a preview for the exact final `development` SHA; do not promote.
