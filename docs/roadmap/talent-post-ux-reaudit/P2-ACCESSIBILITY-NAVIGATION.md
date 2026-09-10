# P2 — Immediate Accessibility and Navigation Corrections

Repo status: NEEDS_HARDENING

Findings: UX-05, UX-06, UX-07, UX-08, UX-09, UX-18.

## P2-M00 — Landmarks and native navigation

- **ID:** P2-M00
- **TITLE:** Make page structure and destinations semantic
- **OBJECTIVE:** give public/auth/application navigation meaningful landmarks and native links.
- **SOURCE_DRIVERS:** UX-05, UX-09; localization/modal/premium contracts.
- **CURRENT_STATE:** generic wrappers and `NavigatingLink` button/router.push pattern.
- **TARGET_STATE:** one meaningful `main`, labeled navigation groups, native links for destinations and preserved pending feedback.
- **SCOPE:** landing/auth/app shell/navigation component.
- **OUT_OF_SCOPE:** visual rebrand and state-changing buttons.
- **DEPENDENCIES:** P0 PASS; P1 export contract for adjacent regression.
- **PREREQUISITES:** link/landmark tests.
- **RISKS:** changing link behavior affects query navigation and loading states.
- **DO_NOT_BREAK:** route authorization, current pending feedback, auth form labels.
- **AFFECTED_ROUTES:** `/`, `/sign-in`, `/sign-up`, `/dashboard`, `/projects`, preview and editor transitions.
- **AFFECTED_COMPONENTS:** page wrappers, AppShell, NavigatingLink.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** navigation/landmark component and E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert semantic wrapper while retaining regression assertions.
- **OBSERVABILITY:** DOM role snapshots and keyboard traces.
- **DOCUMENTATION_UPDATES:** accessibility contract evidence.

### TASKS
#### P2-M00-T01 — Add landmarks
- P2-M00-T01.01 Add one meaningful `main` to landing.
- P2-M00-T01.02 Add one meaningful `main` to sign-in/sign-up.
- P2-M00-T01.03 Label only real navigation groups.
#### P2-M00-T02 — Replace destination buttons
- P2-M00-T02.01 Implement native link behavior for route destinations.
- P2-M00-T02.02 Preserve pending indicator without suppressing open-in-new-tab behavior.
- P2-M00-T02.03 Retain buttons for toggles, submits and state changes.
#### P2-M00-T03 — Test semantics
- P2-M00-T03.01 Add landmark and link-role component assertions.
- P2-M00-T03.02 Add keyboard/open-in-new-tab E2E assertions.
- P2-M00-T03.03 Run axe on landing/auth/application shell.

### ACCEPTANCE CRITERIA

GIVEN landing, sign-in, sign-up and authenticated navigation, WHEN a keyboard user navigates by landmarks and links, THEN the primary content and destinations are discoverable as native semantics, AND pending feedback does not change a destination into a button.

## P2-M01 — Names and target sizing

- **ID:** P2-M01
- **TITLE:** Close target/name gaps in auth and chapter controls
- **OBJECTIVE:** make password visibility and chapter actions actionable by touch, keyboard and assistive technology.
- **SOURCE_DRIVERS:** UX-06, UX-07; audit evidence B-080/B-085/B-003.
- **CURRENT_STATE:** eye control is about 18×18px; move/delete icons have no names.
- **TARGET_STATE:** target ≥44×44px where layout permits; every action has localized verb + object context; boundary actions remain disabled.
- **SCOPE:** login/register password controls and ChapterOrganizer.
- **OUT_OF_SCOPE:** changing password behavior or chapter mutation semantics.
- **DEPENDENCIES:** P2-M00 locale/semantic foundations.
- **PREREQUISITES:** target geometry and accessible-name assertions.
- **RISKS:** target expansion overlaps inputs or changes chapter row density.
- **DO_NOT_BREAK:** password autocomplete/masking; named edit; order/boundary disable.
- **AFFECTED_ROUTES:** auth and project editor chapters.
- **AFFECTED_COMPONENTS:** auth inputs, ChapterOrganizer, tooltips.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** component, axe, keyboard and responsive tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert sizing/name presentation without changing actions.
- **OBSERVABILITY:** DOM bounding boxes and accessible tree.
- **DOCUMENTATION_UPDATES:** target-size and naming evidence.

### TASKS
#### P2-M01-T01 — Password target
- P2-M01-T01.01 Preserve 18px icon and input caret space.
- P2-M01-T01.02 Add ≥44×44px button target at mobile/desktop constraints.
- P2-M01-T01.03 Assert show/hide name and state remain correct in ES/EN.
#### P2-M01-T02 — Chapter names
- P2-M01-T02.01 Name move-up with chapter title/context.
- P2-M01-T02.02 Name move-down and delete with chapter title/context.
- P2-M01-T02.03 Preserve disabled first/last and single-chapter states.
#### P2-M01-T03 — Test geometry/names
- P2-M01-T03.01 Assert target geometry from rendered DOM, not regex.
- P2-M01-T03.02 Assert accessible names and focus-visible state.
- P2-M01-T03.03 Run affected chapter/auth keyboard journeys.

### ACCEPTANCE CRITERIA

GIVEN a 390px auth form and a populated chapter list, WHEN the user inspects or operates controls, THEN the eye target is at least 44×44px and each chapter action names its verb and target, AND boundary disable behavior is unchanged.

## P2-M02 — Responsive shell

- **ID:** P2-M02
- **TITLE:** Resolve mobile brand/navigation overlap
- **OBJECTIVE:** keep brand, menu, locale, theme and account controls visually distinct at 390px.
- **SOURCE_DRIVERS:** UX-08; premium shell and responsive requirements.
- **CURRENT_STATE:** wordmark minimum content competes with persistent controls.
- **TARGET_STATE:** compact identity, `min-width:0`, predictable wrap/stack and no hit-area overlap.
- **SCOPE:** AppShell and global shell CSS.
- **OUT_OF_SCOPE:** workspace/editor mobile layout (P4).
- **DEPENDENCIES:** P2-M00.
- **PREREQUISITES:** viewport screenshot harness.
- **RISKS:** hiding frequent controls or changing theme/locale reachability.
- **DO_NOT_BREAK:** visible language/theme controls, menu reachability, user menu.
- **AFFECTED_ROUTES:** authenticated application shell.
- **AFFECTED_COMPONENTS:** AppShell, BrandLogo, toggles/menu.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** shell responsive and visual tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert CSS/identity variant only.
- **OBSERVABILITY:** screenshot and element rectangles at 390/430/768/1440.
- **DOCUMENTATION_UPDATES:** responsive evidence and premium shell note.

### TASKS
#### P2-M02-T01 — Compact shell layout
- P2-M02-T01.01 Allow brand copy to shrink without overlap.
- P2-M02-T01.02 Define compact wordmark/identity treatment at narrow breakpoint.
- P2-M02-T01.03 Keep menu, locale, theme and account controls reachable.
#### P2-M02-T02 — Theme/locale validation
- P2-M02-T02.01 Validate light/dark geometry at 390 and 430.
- P2-M02-T02.02 Validate ES/EN label expansion at 390 and 768.
- P2-M02-T02.03 Validate menu open/close and focus order.
#### P2-M02-T03 — Regression evidence
- P2-M02-T03.01 Capture before/after shell screenshots.
- P2-M02-T03.02 Assert no document overflow or overlap rectangles.
- P2-M02-T03.03 Run shell E2E and full test subset.

### ACCEPTANCE CRITERIA

GIVEN the authenticated shell at 390×844, WHEN ES/EN and light/dark are rendered, THEN brand and navigation hit areas do not overlap, AND language/theme/menu/account controls remain reachable and visibly named.

## P2-M03 — Project dialog keyboard lifecycle

- **ID:** P2-M03
- **TITLE:** Implement a real modal contract for projects
- **OBJECTIVE:** make focus, Escape, `aria-modal` and focus restoration behavior real.
- **SOURCE_DRIVERS:** UX-18; MODAL_CONTRACT; audit B-037.
- **CURRENT_STATE:** bespoke dialog declares role/aria-modal but focus can escape and Escape does not close.
- **TARGET_STATE:** on open focus enters; Tab/Shift+Tab stay inside; Escape closes; close restores opener; background is inert/unreachable.
- **SCOPE:** ProjectsTableModal and opener integration.
- **OUT_OF_SCOPE:** retrieval search/filter (P5); visual opacity (P5).
- **DEPENDENCIES:** P2-M00, P2-M01.
- **PREREQUISITES:** canonical design-system dialog primitive availability or a tested local lifecycle.
- **RISKS:** autofocus on destructive action; route replacement loses opener focus.
- **DO_NOT_BREAK:** pagination, row links/actions, close control and no destructive autofocus.
- **AFFECTED_ROUTES:** `/dashboard?projects=1`.
- **AFFECTED_COMPONENTS:** ProjectsTableModal, opener and dialog primitive.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** modal keyboard/component/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert primitive integration; keep failing regression test and block close.
- **OBSERVABILITY:** keyboard trace, activeElement snapshots, dialog state.
- **DOCUMENTATION_UPDATES:** modal contract evidence.

### TASKS
#### P2-M03-T01 — Open/contain
- P2-M03-T01.01 Move focus to close or non-destructive dialog heading on open.
- P2-M03-T01.02 Trap Tab and Shift+Tab inside the dialog.
- P2-M03-T01.03 Ensure background controls are not reachable while open.
#### P2-M03-T02 — Dismiss/restore
- P2-M03-T02.01 Close on Escape without submitting/deleting.
- P2-M03-T02.02 Close through visible close/backdrop contract.
- P2-M03-T02.03 Restore focus to the opener after route/modal close.
#### P2-M03-T03 — Behavioral test
- P2-M03-T03.01 Assert role/name/aria-modal matches actual behavior.
- P2-M03-T03.02 Assert pagination and row links remain keyboard reachable.
- P2-M03-T03.03 Run axe and mobile/desktop keyboard E2E.

### ACCEPTANCE CRITERIA

GIVEN the project modal is opened from its button, WHEN the user presses Tab, Shift+Tab or Escape, THEN focus remains inside until dismissal and Escape closes it, AND focus returns to the opener without moving to a destructive action.

## P2-FINAL-GATE

- P2-M00..M03 PASS.
- G7 has no unresolved critical affected-journey violations.
- G9 passes 390/430/768/1440 in light/dark as applicable.
- Native link, target-size, accessible-name and modal keyboard evidence is attached.
- Existing auth feedback, chapter ordering, pagination and project row operations pass regression.
- No phase close or promotion on a mandatory FAIL/BLOCKED.
