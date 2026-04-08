# Cover Editor Coherence and Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify basic and advanced cover editing for cover and back cover, add a richer split template system, and make preview/export consume the same saved editorial state.

**Architecture:** Introduce a shared surface model for cover and back cover editing, refactor the advanced editors to use a common engine, and make the basic editors edit a simplified projection of the same state. Split templates into independent cover and back-cover catalogs while preserving user content and only changing composition defaults.

**Tech Stack:** Next.js App Router, React, TypeScript, server actions, existing canvas/fabric-based cover editor utilities, Vitest, ESLint.

---

## File Structure

### Shared model and template data

- Create: `src/lib/projects/cover-surface.ts`
  - Shared cover/back-cover surface types, field visibility, layer model, template application helpers, merge helpers.
- Create: `src/lib/projects/cover-surface.test.ts`
  - Unit tests for model normalization, field visibility, template application, and preservation of user content.
- Create: `src/lib/projects/cover-templates.ts`
  - Separate cover and back-cover template catalogs with richer categories and initial layer/layout defaults.
- Create: `src/lib/projects/cover-templates.test.ts`
  - Tests for template families, surface separation, and non-destructive application.

### Cover/back-cover persistence and mapping

- Modify: `src/lib/projects/types.ts`
  - Extend project types to carry shared surface configuration safely.
- Modify: `src/lib/projects/factories.ts`
  - Add defaults for the new cover/back-cover surface shape.
- Modify: `src/lib/db/repositories.ts`
  - Persist and hydrate the shared surface fields without wiping advanced properties.
- Modify: `src/lib/projects/actions.ts`
  - Save actions should update only the intended portion of the shared model and preserve advanced fields.

### Basic editors

- Modify: `src/components/projects/CoverForm.tsx`
  - Change from standalone local cover form state to simplified editing of shared surface state.
- Modify: `src/components/projects/BackCoverForm.tsx`
  - Match the same editing contract and field visibility semantics as the cover basic editor.
- Create or Modify: `src/components/projects/CoverPreview.tsx`
  - Render from shared surface state instead of only title/subtitle/palette.

### Advanced editors

- Create: `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`
  - Shared advanced engine for cover and back cover.
- Create: `src/components/projects/advanced-cover/advanced-surface-utils.ts`
  - Shared fabric/canvas loading and serialization helpers.
- Create: `src/components/projects/advanced-cover/advanced-surface-utils.test.ts`
  - Tests for mapping project state to canvas state and back.
- Modify: `src/components/projects/advanced-cover/AdvancedCoverEditor.tsx`
  - Convert into a thin wrapper around `AdvancedSurfaceEditor`.
- Modify: `src/components/projects/advanced-back-cover/AdvancedBackCoverEditor.tsx`
  - Convert from custom HTML-to-image editor to the same advanced engine as cover.
- Modify: `src/components/projects/advanced-cover/Canvas.tsx`
  - Fix canvas framing so the advanced cover reflects a final editorial composition.
- Modify: `src/components/projects/advanced-cover/PropertyPanel.tsx`
  - Ensure field visibility/content editing is consistent with the shared model.
- Modify: `src/components/projects/advanced-back-cover/BackCoverPropertyPanel.tsx`
  - Bring parity with the cover property panel.

### Template step and workspace orchestration

- Modify: `src/components/projects/TemplateSelector.tsx`
  - Split into cover and back-cover template groups with more categories.
- Modify: `src/components/projects/ProjectWorkspace.tsx`
  - Separate selected cover/back-cover template state and apply templates non-destructively through the new model/actions.
- Modify: `src/components/projects/ProjectWorkspace.test.tsx`
  - Cover template selection, editor switching, and advanced/back-cover parity.

### Preview and export

- Modify: `src/lib/preview/preview-builder.ts`
  - Read the normalized shared surface model so cover/back-cover preview matches saved design state.
- Modify: `src/app/api/projects/export/route.ts`
  - Use saved visibility/content rules so removed fields do not reappear.

## Task 1: Define the Shared Surface Model

**Files:**
- Create: `src/lib/projects/cover-surface.ts`
- Test: `src/lib/projects/cover-surface.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  applySurfaceTemplate,
  createDefaultSurfaceState,
  normalizeSurfaceState,
} from './cover-surface';

describe('cover-surface', () => {
  it('preserves user content when applying a new template', () => {
    const state = createDefaultSurfaceState('cover');
    state.fields.title.value = 'Nunca más en la sombra';
    state.fields.subtitle.value = 'Subtítulo real';

    const next = applySurfaceTemplate(state, {
      id: 'minimal-editorial-cover',
      surface: 'cover',
      visibility: { subtitle: false },
      layout: { kind: 'stacked-center' },
    });

    expect(next.fields.title.value).toBe('Nunca más en la sombra');
    expect(next.fields.subtitle.value).toBe('Subtítulo real');
    expect(next.fields.subtitle.visible).toBe(false);
  });

  it('normalizes empty fields as hidden content on render surfaces', () => {
    const state = normalizeSurfaceState({
      surface: 'back-cover',
      fields: {
        title: { value: '', visible: true },
        body: { value: 'Texto',
          visible: true },
      },
    });

    expect(state.fields.title.value).toBe('');
    expect(state.fields.title.visible).toBe(false);
    expect(state.fields.body.visible).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/projects/cover-surface.test.ts`

Expected: FAIL because `cover-surface.ts` and exported helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type SurfaceKind = 'cover' | 'back-cover';

type SurfaceFieldKey = 'title' | 'subtitle' | 'author' | 'body' | 'authorBio';

export interface SurfaceFieldState {
  value: string;
  visible: boolean;
}

export interface SurfaceTemplateDefinition {
  id: string;
  surface: SurfaceKind;
  visibility?: Partial<Record<SurfaceFieldKey, boolean>>;
  layout: { kind: string };
}

export interface SurfaceState {
  surface: SurfaceKind;
  fields: Partial<Record<SurfaceFieldKey, SurfaceFieldState>>;
  layout: { kind: string };
}

const EMPTY_FIELD: SurfaceFieldState = { value: '', visible: false };

export function createDefaultSurfaceState(surface: SurfaceKind): SurfaceState {
  return {
    surface,
    layout: { kind: 'stacked-center' },
    fields: {
      title: { value: '', visible: true },
      subtitle: { value: '', visible: false },
      author: { value: '', visible: surface === 'cover' },
      body: { value: '', visible: surface === 'back-cover' },
      authorBio: { value: '', visible: surface === 'back-cover' },
    },
  };
}

export function normalizeSurfaceState(input: Partial<SurfaceState> & { surface: SurfaceKind }): SurfaceState {
  const base = createDefaultSurfaceState(input.surface);
  const fields = { ...base.fields, ...input.fields };

  for (const key of Object.keys(fields) as SurfaceFieldKey[]) {
    const current = fields[key] ?? EMPTY_FIELD;
    const trimmed = current.value?.trim?.() ?? '';
    fields[key] = {
      value: current.value ?? '',
      visible: Boolean(current.visible && trimmed),
    };
  }

  return {
    surface: input.surface,
    layout: input.layout ?? base.layout,
    fields,
  };
}

export function applySurfaceTemplate(
  state: SurfaceState,
  template: SurfaceTemplateDefinition,
): SurfaceState {
  const next = normalizeSurfaceState(state);
  const fields = { ...next.fields };

  for (const [key, visible] of Object.entries(template.visibility ?? {})) {
    const fieldKey = key as SurfaceFieldKey;
    const current = fields[fieldKey] ?? EMPTY_FIELD;
    fields[fieldKey] = {
      ...current,
      visible: Boolean(visible && current.value.trim()),
    };
  }

  return {
    ...next,
    layout: template.layout,
    fields,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/projects/cover-surface.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects/cover-surface.ts src/lib/projects/cover-surface.test.ts
git commit -m "add shared cover surface model"
```

## Task 2: Add Separate Cover and Back-Cover Template Catalogs

**Files:**
- Create: `src/lib/projects/cover-templates.ts`
- Test: `src/lib/projects/cover-templates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES } from './cover-templates';

describe('cover-templates', () => {
  it('exposes independent template catalogs for cover and back cover', () => {
    expect(COVER_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(BACK_COVER_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(COVER_TEMPLATES.every((template) => template.surface === 'cover')).toBe(true);
    expect(BACK_COVER_TEMPLATES.every((template) => template.surface === 'back-cover')).toBe(true);
  });

  it('includes multiple editorial categories', () => {
    const categories = new Set(COVER_TEMPLATES.map((template) => template.category));
    expect(categories.has('fiction')).toBe(true);
    expect(categories.has('business')).toBe(true);
    expect(categories.has('memoir')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/projects/cover-templates.test.ts`

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { SurfaceTemplateDefinition } from './cover-surface';

export interface EditorialTemplate extends SurfaceTemplateDefinition {
  name: string;
  description: string;
  category: 'essay' | 'business' | 'workbook' | 'fiction' | 'minimal' | 'memoir' | 'statement';
  previewTone: string;
}

export const COVER_TEMPLATES: EditorialTemplate[] = [
  { id: 'essay-premium-cover', surface: 'cover', category: 'essay', name: 'Ensayo premium', description: 'Jerarquía editorial sobria', previewTone: 'obsidian', visibility: { subtitle: true, author: true }, layout: { kind: 'stacked-center' } },
  { id: 'business-leadership-cover', surface: 'cover', category: 'business', name: 'Negocio / liderazgo', description: 'Titular fuerte y contraste alto', previewTone: 'teal', visibility: { subtitle: true, author: true }, layout: { kind: 'title-dominant' } },
  { id: 'workbook-cover', surface: 'cover', category: 'workbook', name: 'Workbook / guía práctica', description: 'Bloques claros y ritmo funcional', previewTone: 'sand', visibility: { subtitle: true, author: true }, layout: { kind: 'functional-grid' } },
  { id: 'fiction-cover', surface: 'cover', category: 'fiction', name: 'Ficción literaria', description: 'Composición atmosférica', previewTone: 'obsidian', visibility: { subtitle: false, author: true }, layout: { kind: 'image-dominant' } },
  { id: 'minimal-editorial-cover', surface: 'cover', category: 'minimal', name: 'Minimal editorial', description: 'Mucho aire y jerarquía tipográfica', previewTone: 'sand', visibility: { subtitle: false, author: true }, layout: { kind: 'minimal-stack' } },
  { id: 'memoir-cover', surface: 'cover', category: 'memoir', name: 'Memoria / autobiografía', description: 'Cercanía y retrato', previewTone: 'teal', visibility: { subtitle: true, author: true }, layout: { kind: 'portrait-balanced' } },
  { id: 'statement-cover', surface: 'cover', category: 'statement', name: 'High contrast statement', description: 'Mensaje frontal y gran titular', previewTone: 'obsidian', visibility: { subtitle: false, author: false }, layout: { kind: 'statement-bold' } },
];

export const BACK_COVER_TEMPLATES: EditorialTemplate[] = [
  { id: 'essay-premium-back', surface: 'back-cover', category: 'essay', name: 'Ensayo premium back', description: 'Texto de solapa elegante', previewTone: 'obsidian', visibility: { title: true, body: true, authorBio: true }, layout: { kind: 'body-led' } },
  { id: 'business-leadership-back', surface: 'back-cover', category: 'business', name: 'Negocio / liderazgo back', description: 'Resumen y promesa del libro', previewTone: 'teal', visibility: { title: true, body: true, authorBio: true }, layout: { kind: 'summary-card' } },
  { id: 'workbook-back', surface: 'back-cover', category: 'workbook', name: 'Workbook back', description: 'Beneficios y uso esperado', previewTone: 'sand', visibility: { title: true, body: true, authorBio: false }, layout: { kind: 'benefits-grid' } },
  { id: 'fiction-back', surface: 'back-cover', category: 'fiction', name: 'Ficción back', description: 'Sinopsis y tono', previewTone: 'obsidian', visibility: { title: true, body: true, authorBio: false }, layout: { kind: 'synopsis-focus' } },
  { id: 'minimal-editorial-back', surface: 'back-cover', category: 'minimal', name: 'Minimal editorial back', description: 'Texto limpio y aire', previewTone: 'sand', visibility: { title: false, body: true, authorBio: true }, layout: { kind: 'minimal-body' } },
  { id: 'memoir-back', surface: 'back-cover', category: 'memoir', name: 'Memoria back', description: 'Bio y contexto humano', previewTone: 'teal', visibility: { title: true, body: true, authorBio: true }, layout: { kind: 'bio-balanced' } },
  { id: 'statement-back', surface: 'back-cover', category: 'statement', name: 'Statement back', description: 'Mensaje corto con impacto', previewTone: 'obsidian', visibility: { title: false, body: true, authorBio: false }, layout: { kind: 'statement-body' } },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/projects/cover-templates.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects/cover-templates.ts src/lib/projects/cover-templates.test.ts
git commit -m "add split cover and back cover templates"
```

## Task 3: Persist the Shared Surface State Without Wiping Advanced Data

**Files:**
- Modify: `src/lib/projects/types.ts`
- Modify: `src/lib/projects/factories.ts`
- Modify: `src/lib/db/repositories.ts`
- Modify: `src/lib/projects/actions.ts`
- Test: `src/lib/projects/cover-surface.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mergePartialSurfaceUpdate } from './cover-surface';

describe('mergePartialSurfaceUpdate', () => {
  it('preserves advanced fields when a basic form updates title and subtitle only', () => {
    const previous = {
      surface: 'cover',
      layout: { kind: 'statement-bold' },
      layers: [{ id: 'title-layer', type: 'text', fieldKey: 'title' }],
      fields: {
        title: { value: 'Antes', visible: true },
        subtitle: { value: 'Sub', visible: true },
        author: { value: 'Autor', visible: true },
      },
    };

    const next = mergePartialSurfaceUpdate(previous, {
      fields: {
        title: { value: 'Después', visible: true },
        subtitle: { value: '', visible: false },
      },
    });

    expect(next.layout.kind).toBe('statement-bold');
    expect(next.layers).toHaveLength(1);
    expect(next.fields.author?.value).toBe('Autor');
    expect(next.fields.subtitle?.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/projects/cover-surface.test.ts`

Expected: FAIL because `mergePartialSurfaceUpdate` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface SurfaceLayer {
  id: string;
  type: 'text' | 'image';
  fieldKey?: SurfaceFieldKey;
}

export interface SurfaceState {
  surface: SurfaceKind;
  fields: Partial<Record<SurfaceFieldKey, SurfaceFieldState>>;
  layout: { kind: string };
  layers?: SurfaceLayer[];
}

export function mergePartialSurfaceUpdate(
  previous: SurfaceState,
  partial: Partial<SurfaceState>,
): SurfaceState {
  return normalizeSurfaceState({
    ...previous,
    ...partial,
    fields: {
      ...previous.fields,
      ...partial.fields,
    },
    layers: partial.layers ?? previous.layers ?? [],
  });
}
```

Also update type carriers in `types.ts`, factory defaults in `factories.ts`, and save/hydrate paths in `repositories.ts` / `actions.ts` so the shared state shape survives persistence.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/projects/cover-surface.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects/types.ts src/lib/projects/factories.ts src/lib/db/repositories.ts src/lib/projects/actions.ts src/lib/projects/cover-surface.ts src/lib/projects/cover-surface.test.ts
git commit -m "preserve shared cover state across saves"
```

## Task 4: Make the Basic Cover and Back-Cover Editors Edit the Shared Model

**Files:**
- Modify: `src/components/projects/CoverForm.tsx`
- Modify: `src/components/projects/BackCoverForm.tsx`
- Modify: `src/components/projects/CoverPreview.tsx`
- Test: `src/components/projects/ProjectWorkspace.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
test('basic cover save does not reintroduce a removed subtitle', async () => {
  render(<ProjectWorkspace project={projectWithHiddenSubtitle} copy={copy} />);

  const coverStep = screen.getByText(copy.stepCover);
  await user.click(coverStep);

  expect(screen.getByLabelText(copy.coverSubtitleLabel)).toHaveValue('');
  expect(screen.getByTestId('cover-preview-subtitle')).not.toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/ProjectWorkspace.test.tsx`

Expected: FAIL because the basic form still reads standalone title/subtitle state and preview does not consume the normalized model.

- [ ] **Step 3: Write minimal implementation**

```tsx
const surface = normalizeSurfaceState(project.cover.surfaceState ?? createDefaultSurfaceState('cover'));
const [draftSurface, setDraftSurface] = useState(surface);

const updateField = (fieldKey: 'title' | 'subtitle', value: string) => {
  setDraftSurface((current) =>
    mergePartialSurfaceUpdate(current, {
      fields: {
        [fieldKey]: { value, visible: Boolean(value.trim()) },
      },
    }),
  );
};

formData.set('surfaceState', JSON.stringify(draftSurface));
```

Update `CoverPreview` and `BackCoverForm` to render from `draftSurface.fields` and respect field visibility rather than raw string props.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/ProjectWorkspace.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/CoverForm.tsx src/components/projects/BackCoverForm.tsx src/components/projects/CoverPreview.tsx src/components/projects/ProjectWorkspace.test.tsx
git commit -m "unify basic cover editors with shared state"
```

## Task 5: Replace the Two Advanced Editors With One Shared Surface Engine

**Files:**
- Create: `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`
- Create: `src/components/projects/advanced-cover/advanced-surface-utils.ts`
- Create: `src/components/projects/advanced-cover/advanced-surface-utils.test.ts`
- Modify: `src/components/projects/advanced-cover/AdvancedCoverEditor.tsx`
- Modify: `src/components/projects/advanced-back-cover/AdvancedBackCoverEditor.tsx`
- Modify: `src/components/projects/advanced-cover/Canvas.tsx`
- Modify: `src/components/projects/advanced-cover/PropertyPanel.tsx`
- Modify: `src/components/projects/advanced-back-cover/BackCoverPropertyPanel.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildInitialSurfaceLayers } from './advanced-surface-utils';

describe('advanced surface utils', () => {
  it('builds editable layers for both cover and back cover from the same engine', () => {
    const coverLayers = buildInitialSurfaceLayers('cover', {
      title: { value: 'Título', visible: true },
      subtitle: { value: 'Sub', visible: true },
    });
    const backLayers = buildInitialSurfaceLayers('back-cover', {
      title: { value: 'Contra', visible: true },
      body: { value: 'Texto', visible: true },
    });

    expect(coverLayers.some((layer) => layer.fieldKey === 'title')).toBe(true);
    expect(backLayers.some((layer) => layer.fieldKey === 'body')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/advanced-cover/advanced-surface-utils.test.ts`

Expected: FAIL because the shared advanced engine utilities do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { SurfaceKind, SurfaceState } from '@/lib/projects/cover-surface';

export function buildInitialSurfaceLayers(
  surface: SurfaceKind,
  fields: SurfaceState['fields'],
) {
  const layers = [];

  if (fields.title?.visible) layers.push({ id: `${surface}-title`, type: 'text', fieldKey: 'title' });
  if (fields.subtitle?.visible) layers.push({ id: `${surface}-subtitle`, type: 'text', fieldKey: 'subtitle' });
  if (fields.author?.visible) layers.push({ id: `${surface}-author`, type: 'text', fieldKey: 'author' });
  if (fields.body?.visible) layers.push({ id: `${surface}-body`, type: 'text', fieldKey: 'body' });
  if (fields.authorBio?.visible) layers.push({ id: `${surface}-author-bio`, type: 'text', fieldKey: 'authorBio' });

  return layers;
}
```

Then:

- wrap shared canvas/property logic inside `AdvancedSurfaceEditor`
- make `AdvancedCoverEditor` pass `surface="cover"`
- make `AdvancedBackCoverEditor` pass `surface="back-cover"`
- remove the back-cover-only HTML snapshot flow and use the same render/save pipeline as the cover editor
- fix `Canvas.tsx` sizing and framing so the canvas reflects the final editorial format instead of the current narrow misaligned composition

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/advanced-cover/advanced-surface-utils.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx src/components/projects/advanced-cover/advanced-surface-utils.ts src/components/projects/advanced-cover/advanced-surface-utils.test.ts src/components/projects/advanced-cover/AdvancedCoverEditor.tsx src/components/projects/advanced-back-cover/AdvancedBackCoverEditor.tsx src/components/projects/advanced-cover/Canvas.tsx src/components/projects/advanced-cover/PropertyPanel.tsx src/components/projects/advanced-back-cover/BackCoverPropertyPanel.tsx
git commit -m "share advanced editing engine across cover surfaces"
```

## Task 6: Split and Expand the Template Step

**Files:**
- Modify: `src/components/projects/TemplateSelector.tsx`
- Modify: `src/components/projects/ProjectWorkspace.tsx`
- Test: `src/components/projects/ProjectWorkspace.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
test('template step shows separate template groups for cover and back cover', async () => {
  render(<ProjectWorkspace project={project} copy={copy} />);

  await user.click(screen.getByText(copy.stepTemplate));

  expect(screen.getByText('Plantillas de portada')).toBeInTheDocument();
  expect(screen.getByText('Plantillas de contraportada')).toBeInTheDocument();
  expect(screen.getByText('Ficción literaria')).toBeInTheDocument();
  expect(screen.getByText('Workbook / guía práctica')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/ProjectWorkspace.test.tsx`

Expected: FAIL because `TemplateSelector` exposes only one three-item palette selector.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES } from '@/lib/projects/cover-templates';

<section>
  <h4>Plantillas de portada</h4>
  <TemplateGrid
    templates={COVER_TEMPLATES}
    selectedTemplateId={selectedCoverTemplateId}
    onSelect={onSelectCover}
  />
</section>

<section>
  <h4>Plantillas de contraportada</h4>
  <TemplateGrid
    templates={BACK_COVER_TEMPLATES}
    selectedTemplateId={selectedBackCoverTemplateId}
    onSelect={onSelectBackCover}
  />
</section>
```

Update `ProjectWorkspace.tsx` to track cover and back-cover template selection separately and save only composition changes through the shared model.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/ProjectWorkspace.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/TemplateSelector.tsx src/components/projects/ProjectWorkspace.tsx src/components/projects/ProjectWorkspace.test.tsx src/lib/projects/cover-templates.ts src/lib/projects/cover-templates.test.ts
git commit -m "split cover and back cover template selection"
```

## Task 7: Make Preview and Export Respect the Saved Shared State

**Files:**
- Modify: `src/lib/preview/preview-builder.ts`
- Modify: `src/app/api/projects/export/route.ts`
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/lib/preview/preview-builder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('does not render a subtitle in preview when the saved cover state hides it', () => {
  const project = createMockProject({
    cover: {
      ...createMockProject().cover,
      subtitle: '',
      showSubtitle: false,
    },
  });

  const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
  const coverPage = pages.find((page) => page.type === 'cover');

  expect(coverPage?.coverData?.subtitle).toBe('');
  expect(coverPage?.coverData?.showSubtitle).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/preview/preview-builder.test.ts`

Expected: FAIL if preview/export still reconstruct from raw fields without normalized visibility semantics.

- [ ] **Step 3: Write minimal implementation**

```ts
const normalizedCover = normalizeSurfaceState(project.cover.surfaceState ?? {
  surface: 'cover',
  fields: {
    title: { value: project.cover.title, visible: true },
    subtitle: { value: project.cover.subtitle, visible: project.cover.showSubtitle ?? true },
    author: { value: project.document.author, visible: true },
  },
});

coverData: {
  title: normalizedCover.fields.title?.value ?? '',
  subtitle: normalizedCover.fields.subtitle?.value ?? '',
  showSubtitle: normalizedCover.fields.subtitle?.visible ?? false,
  ...
}
```

Apply the same normalization in export so removed or hidden fields do not come back there either.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview/preview-builder.ts src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx src/app/api/projects/export/route.ts
git commit -m "align preview and export with shared cover state"
```

## Task 8: Run Full Verification and Publish

**Files:**
- Modify: `src/components/projects/ProjectWorkspace.test.tsx`
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/lib/preview/preview-builder.test.ts`
- Modify: `src/lib/projects/cover-surface.test.ts`
- Modify: `src/lib/projects/cover-templates.test.ts`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npm run test:run -- src/lib/projects/cover-surface.test.ts src/lib/projects/cover-templates.test.ts src/components/projects/advanced-cover/advanced-surface-utils.test.ts src/components/projects/ProjectWorkspace.test.tsx src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx
```

Expected: PASS across all files.

- [ ] **Step 2: Run eslint on touched files**

Run:

```bash
npx eslint src/lib/projects/cover-surface.ts src/lib/projects/cover-surface.test.ts src/lib/projects/cover-templates.ts src/lib/projects/cover-templates.test.ts src/components/projects/CoverForm.tsx src/components/projects/BackCoverForm.tsx src/components/projects/CoverPreview.tsx src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx src/components/projects/advanced-cover/advanced-surface-utils.ts src/components/projects/advanced-cover/advanced-surface-utils.test.ts src/components/projects/advanced-cover/AdvancedCoverEditor.tsx src/components/projects/advanced-back-cover/AdvancedBackCoverEditor.tsx src/components/projects/advanced-cover/Canvas.tsx src/components/projects/advanced-cover/PropertyPanel.tsx src/components/projects/advanced-back-cover/BackCoverPropertyPanel.tsx src/components/projects/TemplateSelector.tsx src/components/projects/ProjectWorkspace.tsx src/components/projects/ProjectWorkspace.test.tsx src/lib/preview/preview-builder.ts src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx src/app/api/projects/export/route.ts src/lib/projects/types.ts src/lib/projects/factories.ts src/lib/db/repositories.ts src/lib/projects/actions.ts
```

Expected: PASS with no lint errors.

- [ ] **Step 3: Commit final verified implementation**

```bash
git add src/lib/projects/cover-surface.ts src/lib/projects/cover-surface.test.ts src/lib/projects/cover-templates.ts src/lib/projects/cover-templates.test.ts src/components/projects/CoverForm.tsx src/components/projects/BackCoverForm.tsx src/components/projects/CoverPreview.tsx src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx src/components/projects/advanced-cover/advanced-surface-utils.ts src/components/projects/advanced-cover/advanced-surface-utils.test.ts src/components/projects/advanced-cover/AdvancedCoverEditor.tsx src/components/projects/advanced-back-cover/AdvancedBackCoverEditor.tsx src/components/projects/advanced-cover/Canvas.tsx src/components/projects/advanced-cover/PropertyPanel.tsx src/components/projects/advanced-back-cover/BackCoverPropertyPanel.tsx src/components/projects/TemplateSelector.tsx src/components/projects/ProjectWorkspace.tsx src/components/projects/ProjectWorkspace.test.tsx src/lib/preview/preview-builder.ts src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx src/app/api/projects/export/route.ts src/lib/projects/types.ts src/lib/projects/factories.ts src/lib/db/repositories.ts src/lib/projects/actions.ts
git commit -m "unify cover editors and expand template system"
```

- [ ] **Step 4: Push the branch**

```bash
git push origin staging
```
