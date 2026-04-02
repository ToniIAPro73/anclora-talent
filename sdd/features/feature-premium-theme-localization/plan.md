# Premium Dark Theme And Localization Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `Anclora Talent` into a contract-compliant Premium app with dark mode by default, visible theme and locale toggles, `es/en` UI support, and synchronized contract documentation in the app repo and the vault.

**Architecture:** Add a lightweight UI-preferences layer shared by server and client, expose it through the authenticated shell, move hardcoded critical copy to an `es/en` dictionary, and normalize theme tokens across public/authenticated surfaces. In parallel, classify `anclora-talent` as Premium in the vault and copy the applicable contracts into the app repo.

**Tech Stack:** Next.js App Router, Clerk, React, Tailwind CSS v4, Vitest, Obsidian markdown docs.

---

### Task 1: Normalize feature docs and contract inputs

**Files:**
- Delete: `sdd/features/feature-premium-dark-theme-localization/spec.md`
- Modify: `sdd/features/feature-premium-theme-localization/spec.md`
- Create: `sdd/features/feature-premium-theme-localization/plan.md`

- [ ] **Step 1: Remove the duplicate spec path**

Delete the duplicate spec so the canonical feature path is only:

```text
sdd/features/feature-premium-theme-localization/
```

- [ ] **Step 2: Re-read the canonical spec and confirm file targets**

Run:

```bash
Get-Content sdd/features/feature-premium-theme-localization/spec.md
```

Expected: one canonical spec describing `dark default`, `es/en`, toggles, Clerk alignment, and vault propagation.

- [ ] **Step 3: Commit the docs-only normalization**

```bash
git add sdd/features/feature-premium-theme-localization/spec.md sdd/features/feature-premium-theme-localization/plan.md
git commit -m "docs: define premium theme localization feature"
```

### Task 2: Add UI preferences foundation with failing tests first

**Files:**
- Create: `src/lib/ui-preferences/preferences.ts`
- Create: `src/lib/ui-preferences/preferences.client.ts`
- Create: `src/lib/ui-preferences/preferences.test.ts`
- Create: `src/components/providers/UiPreferencesProvider.tsx`
- Create: `src/components/providers/UiPreferencesProvider.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing preference tests**

Cover:
- default theme is `dark`
- default locale is `es`
- invalid cookie values fall back safely
- updates persist to document dataset or class hooks

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
npm run test:run -- src/lib/ui-preferences/preferences.test.ts src/components/providers/UiPreferencesProvider.test.tsx
```

Expected: FAIL because the preferences layer does not exist yet.

- [ ] **Step 3: Implement the minimal preferences utilities and provider**

Implement:
- server helpers to read `theme` and `locale`
- client helpers to persist preferences
- provider that exposes preference state and syncs the DOM

- [ ] **Step 4: Wire the provider into `src/app/layout.tsx`**

The root layout must:
- read initial preferences
- set stable document attributes
- wrap children with the provider

- [ ] **Step 5: Run the preference tests again**

Run:

```bash
npm run test:run -- src/lib/ui-preferences/preferences.test.ts src/components/providers/UiPreferencesProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the foundation**

```bash
git add src/lib/ui-preferences src/components/providers src/app/layout.tsx
git commit -m "feat: add ui preferences foundation"
```

### Task 3: Add `es/en` UI dictionary and shell toggles

**Files:**
- Create: `src/lib/i18n/messages.ts`
- Create: `src/lib/i18n/messages.test.ts`
- Create: `src/components/layout/ThemeToggle.tsx`
- Create: `src/components/layout/LocaleToggle.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/auth/AuthShell.tsx`

- [ ] **Step 1: Write the failing i18n tests**

Cover:
- `es` and `en` dictionaries expose shell/auth labels
- locale fallback resolves to Spanish
- toggles render the current active value

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npm run test:run -- src/lib/i18n/messages.test.ts
```

Expected: FAIL because the dictionary and toggles do not exist yet.

- [ ] **Step 3: Implement the dictionary and toggle components**

Add:
- compact message map for `es/en`
- `ThemeToggle`
- `LocaleToggle`

- [ ] **Step 4: Rebuild `AppShell` around the premium topbar**

The shell must:
- keep `dark` as default
- show theme and locale toggles visibly
- localize the navigation and framing copy
- preserve premium visual treatment

- [ ] **Step 5: Rebuild `AuthShell` around the same contract**

Auth must:
- use localized copy
- keep dark as the primary mode
- remain visually aligned with the workspace shell

- [ ] **Step 6: Run the shell/auth tests**

Run:

```bash
npm run test:run -- src/lib/i18n/messages.test.ts src/components/providers/UiPreferencesProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the shell and localization layer**

```bash
git add src/lib/i18n src/components/layout src/components/auth
git commit -m "feat: add premium shell toggles and i18n layer"
```

### Task 4: Convert global tokens and Clerk appearance to dark-first

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/auth/clerkAppearance.ts`
- Create: `src/components/auth/clerkAppearance.test.ts`

- [ ] **Step 1: Write the failing appearance test**

Cover:
- dark-first Clerk controls
- readable primary/secondary states
- support for both dark and light modes through tokens

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
npm run test:run -- src/components/auth/clerkAppearance.test.ts
```

Expected: FAIL because the appearance still assumes the light shell.

- [ ] **Step 3: Replace root globals with theme-aware tokens**

`globals.css` must:
- define a dark-first token system
- expose light overrides
- stop treating light as the only root theme

- [ ] **Step 4: Rework `clerkAppearance.ts`**

Make Clerk follow the same theme contract:
- dark surfaces by default
- premium contrast
- light mode parity without broken states

- [ ] **Step 5: Run the appearance test**

Run:

```bash
npm run test:run -- src/components/auth/clerkAppearance.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the theme token conversion**

```bash
git add src/app/globals.css src/components/auth/clerkAppearance.ts src/components/auth/clerkAppearance.test.ts
git commit -m "feat: make global theme dark-first"
```

### Task 5: Localize and restyle public and authenticated surfaces

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/marketing/landing-hero.tsx`
- Modify: `src/components/marketing/landing-proof-strip.tsx`
- Modify: `src/components/marketing/landing-workflow.tsx`
- Modify: `src/components/marketing/landing-product-showcase.tsx`
- Modify: `src/components/marketing/landing-benefits.tsx`
- Modify: `src/components/marketing/landing-final-cta.tsx`
- Modify: `src/components/marketing/marketing-data.ts`
- Modify: `src/components/marketing/marketing-helpers.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/projects/CreateProjectForm.tsx`
- Modify: `src/components/projects/ProjectCard.tsx`
- Modify: `src/components/projects/EditorForm.tsx`
- Modify: `src/components/projects/CoverForm.tsx`
- Modify: `src/app/(app)/projects/new/page.tsx`
- Modify: `src/app/(app)/projects/[projectId]/editor/page.tsx`
- Modify: `src/app/(app)/projects/[projectId]/preview/page.tsx`
- Modify: `src/app/(app)/projects/[projectId]/cover/page.tsx`
- Modify: existing tests tied to these screens

- [ ] **Step 1: Write failing tests for localized critical strings**

Cover:
- landing renders Spanish by default
- shell and dashboard can render English labels
- critical CTAs respect the selected locale

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npm run test:run -- src/app/page.test.tsx src/components/marketing/landing-hero.test.tsx src/components/marketing/landing-final-cta.test.tsx
```

Expected: FAIL because strings and preferences are not yet fully wired together.

- [ ] **Step 3: Move critical copy to the dictionary and consume locale in screens**

Apply localization and dark/light tokens to:
- landing
- dashboard
- create project
- project card
- editor
- preview
- cover

- [ ] **Step 4: Keep the premium visual grammar stable in both themes**

Audit:
- topbar
- hero
- cards
- forms
- CTA families

- [ ] **Step 5: Run the targeted UI tests**

Run:

```bash
npm run test:run -- src/app/page.test.tsx src/components/marketing/landing-hero.test.tsx src/components/marketing/landing-final-cta.test.tsx src/components/ui/button-styles.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the UI rollout**

```bash
git add src/app src/components
git commit -m "feat: localize and unify premium dark surfaces"
```

### Task 6: Propagate contracts to the app repo and vault

**Files:**
- Create: `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Create: `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`
- Create: `docs/standards/UI_MOTION_CONTRACT.md`
- Create: `docs/standards/MODAL_CONTRACT.md`
- Create: `docs/standards/LOCALIZATION_CONTRACT.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\Boveda-Anclora\docs\standards\ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\Boveda-Anclora\docs\governance\CONTRACT_COMPLIANCE_MATRIX.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\Boveda-Anclora\proyectos\anclora-talent.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\Boveda-Anclora\resources\anclora-group.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\Boveda-Anclora\Anclora Command Center.md`

- [ ] **Step 1: Copy the applicable contracts into `anclora-talent/docs/standards`**

Use the vault as source of truth and copy the current canonical versions.

- [ ] **Step 2: Update the ecosystem contract map**

Add `anclora-talent` as:
- family `Premium`
- locales `es`, `en`
- theme `dark/light`
- contracts `Base + premium`

- [ ] **Step 3: Update the compliance matrix**

Add an initial audit row with evidence from this implementation pass and mark realistic status values.

- [ ] **Step 4: Update the vault’s project documentation**

Document:
- `Premium` family assignment
- locale and theme contract
- current compliance and pending gaps if any

- [ ] **Step 5: Commit the contract propagation**

```bash
git add docs/standards C:/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/docs C:/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/proyectos C:/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/resources C:/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/Anclora\ Command\ Center.md
git commit -m "docs: classify anclora talent as premium"
```

### Task 7: Full verification and integration

**Files:**
- Review all modified files from Tasks 1-6

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Run a visual pass in browser**

Verify:
- landing in `es` and `en`
- sign-in and sign-up in `dark`
- dashboard toggle behavior
- editor, preview and cover in both themes
- mobile and desktop

- [ ] **Step 5: Commit the verified integration state**

```bash
git add -A
git commit -m "feat: complete premium dark theme localization contract"
```
