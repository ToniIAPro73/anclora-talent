# Cover editor parity matrix — baseline v1

Statuses describe the current Talent implementation, not completion of this modernization. “Source present” is not a claim of tested parity.

| Capability | Baseline status | Evidence / gap |
|---|---|---|
| Shared cover and back-cover model | Implemented in source | Separate `DesignSurface` surface values; route and wrapper discriminate kind |
| Basic and Professional on one V2 document | Implemented; focused wrapper tests | Both modes edit the same controlled `DesignSurface`; mode switch does not lose edits |
| Canvas selection/transforms/zoom | Present; focused tests exist | `DesignSurfaceCanvas` and `AdvancedCoverEditor` tests |
| Layer select/visibility/lock/rename/reorder/duplicate/delete/group | Present; focused tests exist | `LayersPanel`, assembly and layer tests |
| Layer workspace placement | Implemented; focused layout test | Tools, independently scrolling layers, canvas, and properties use separate columns |
| Text/image/shape property editing | Present, needs complete parity audit | Separate inspectors; source audit distinguishes unsupported fields |
| Background solid/gradient/image | Present; focused tests exist | `BackgroundEditor` |
| Guides, rulers, grid, safe area, bleed, ISBN | Present; guide-specific undo/history gap remains | overlays are separate from artwork renderer |
| Live alignment and distance feedback | Present in canvas implementation; needs visual verification | guide manager and canvas overlays |
| Save/autosave/final status | Present in source | V2 wrapper sequential autosave; focused wrapper tests |
| PNG export | Implemented and browser-download verified in Basic and Professional | Basic renders the artwork DOM; Professional exports the Fabric canvas at native surface dimensions; PNG is a flat image |
| Versioned editable JSON for both surfaces | Adapter and editor controls implemented; export verified | `cover-design-package.ts` validates a two-surface package and serializes portable image data; unit round-trip tests pass; browser import read was blocked by the local browser file permission |
| Asset portability and unknown-field rejection | Adapter implemented; focused tests pass | Remote images embed as data URLs; limits and unknown-field rejection are enforced |
| Preflight/profile/proof/resize constraints | Implemented with focused tests | Advisory only; collection profiles and checkpoints are browser-local; resize previews reject layer overflow; no print certification |
| Light/Dark canvas-first layout | Implemented; visual QA captured | Four-column desktop workspace; mobile canvas-first order; compact header, eight-step carousel, labeled JSON/PNG controls; stage remains distinct from paper |
| Global header consistency | Implemented; browser verified | All routes share brand, Dashboard, language/theme toggles, and user menu; preview/document actions and project context stay out of the masthead |
| Templates | Dropdown in Basic and Professional | Basic no longer renders a large card grid; selected template remains applied through the shared model |
| Responsive layout and proportions | Verified at 390px, 768px, and 1440px | Mobile tool categories are icon-only with accessible names; desktop tools/layers/properties use narrower rails, reserving more width for the canvas; mobile canvas stays first |
| Keyboard/accessibility and advanced parity | Partial | Controls have accessible names; full inspector, guide-history, multi-object and interaction parity still requires focused audit |

## Latest visual review

- Direct `/cover` and `/back-cover` routes show the canonical eight-step stepper with the active surface marked and no duplicate preview/back-to-editor controls.
- Evidence includes mobile 390px, tablet 768px, and desktop 1440px captures in `artifacts/qa/`. The global masthead is one row on mobile; the tool rail is compact and accessible; JSON and PNG labels remain explicit.
- Browser download checks produced valid 400×600 PNG files from Basic and Professional. Exported JSON parsed with both surfaces; re-import remained unverified because the browser refused to read the selected local file.
- Light and Dark stage surfaces remain visually distinct from the design paper; assets and user text in QA screenshots are synthetic dedicated QA data.

Update each row only with focused test or visual-runtime evidence. Keep open rows honest.
