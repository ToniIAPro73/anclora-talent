# Global Header Controls: TableExtractor Visual Parity

## Status

Open implementation spec, version 1.

## Intent

Align Talent's global language and theme header controls with the actual
TableExtractor Landing controls while preserving Talent's preference state,
normal `ac-button` styling, and all unrelated toggle controls.

## Contract

- Talent owns one reusable global language control and one reusable global
  theme control.
- The controls reproduce TableExtractor Landing's 36px height, 1.5px cyan
  outline, semantic light/dark surfaces, glow, hover, active scale, focus
  outline, and 180ms transition.
- Language uses one rounded pill containing the existing Globe icon and the
  current locale; theme uses a 36px circle with the existing Sun/Moon icon.
- The controls remain separate from `ac-button`; regular actions continue to
  use the canonical `ac-button` system.
- Authenticated AppShell consumers use the shared implementations. The public
  Talent Landing retains its currently approved local controls unchanged.
- Talent continues to support ES/EN and persisted dark/light preferences.
- No boolean switches, segmented controls, or other pressed controls change.
- TableExtractor remains read-only and is not imported at runtime.

## Acceptance

1. The reference components and CSS tokens are read from TableExtractor.
2. Both shared controls match the reference geometry and interactive states in
   dark and light themes.
3. ES/EN and dark/light changes remain keyboard operable and persistent.
4. Dashboard, New Project, Content, Chapters, Cover, Back Cover, and Export
   surfaces use AppShell's shared controls where their global header exists.
5. The public Talent Landing remains visually and functionally unchanged.
6. Focused E2E checks cover appearance, interaction, persistence, responsive
   widths, `ac-button` regression, and unrelated pressed/boolean controls.
