# Landing Signup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer la landing publica de `Anclora Talent` para mejorar legibilidad y empujar con claridad al registro.

**Architecture:** La home se mantiene como server component y delega presentacion a componentes de marketing desacoplados. La logica de CTA se extrae a un helper tipado y testeado para que la UI solo consuma datos ya resueltos segun sesion.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Clerk, Vitest, Testing Library.

---

### Task 1: Resolver datos y CTAs de marketing

**Files:**
- Create: `src/components/marketing/marketing-data.ts`
- Create: `src/components/marketing/marketing-helpers.ts`
- Test: `src/components/marketing/marketing-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getPrimaryCta, getSecondaryCta } from './marketing-helpers';

describe('marketing helpers', () => {
  it('returns signup as primary CTA for anonymous users', () => {
    expect(getPrimaryCta(null)).toEqual({
      href: '/sign-up',
      label: 'Crear cuenta',
    });
  });

  it('returns dashboard as primary CTA for authenticated users', () => {
    expect(getPrimaryCta('user_123')).toEqual({
      href: '/dashboard',
      label: 'Ir al dashboard',
    });
  });

  it('returns platform overview as secondary CTA for anonymous users', () => {
    expect(getSecondaryCta(null)).toEqual({
      href: '#product-showcase',
      label: 'Ver como funciona',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/marketing/marketing-helpers.test.ts`
Expected: FAIL because `marketing-helpers.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type MarketingCta = {
  href: string;
  label: string;
};

export function getPrimaryCta(userId: string | null): MarketingCta {
  if (userId) {
    return {
      href: '/dashboard',
      label: 'Ir al dashboard',
    };
  }

  return {
    href: '/sign-up',
    label: 'Crear cuenta',
  };
}

export function getSecondaryCta(userId: string | null): MarketingCta {
  if (userId) {
    return {
      href: '/dashboard',
      label: 'Abrir plataforma',
    };
  }

  return {
    href: '#product-showcase',
    label: 'Ver como funciona',
  };
}
```

- [ ] **Step 4: Add shared marketing content**

```ts
export const proofItems = [
  'Proyectos persistentes desde el primer dia',
  'Documento, preview y portada en un mismo flujo',
  'Acceso autenticado y listo para produccion',
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/components/marketing/marketing-helpers.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/marketing-data.ts src/components/marketing/marketing-helpers.ts src/components/marketing/marketing-helpers.test.ts
git commit -m "feat: add landing marketing helpers"
```

### Task 2: Construir secciones de marketing reutilizables

**Files:**
- Create: `src/components/marketing/landing-hero.tsx`
- Create: `src/components/marketing/landing-proof-strip.tsx`
- Create: `src/components/marketing/landing-workflow.tsx`
- Create: `src/components/marketing/landing-product-showcase.tsx`
- Create: `src/components/marketing/landing-benefits.tsx`
- Create: `src/components/marketing/landing-final-cta.tsx`
- Modify: `src/components/marketing/marketing-data.ts`

- [ ] **Step 1: Write the failing render test**

```ts
import { render, screen } from '@testing-library/react';
import { LandingHero } from './landing-hero';

describe('LandingHero', () => {
  it('renders the signup CTA label', () => {
    render(
      <LandingHero
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
        secondaryCta={{ href: '#product-showcase', label: 'Ver como funciona' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/marketing/landing-hero.test.tsx`
Expected: FAIL because `landing-hero.tsx` does not exist yet.

- [ ] **Step 3: Write minimal implementation for the hero**

```tsx
type LandingHeroProps = {
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
};

export function LandingHero({ primaryCta, secondaryCta }: LandingHeroProps) {
  return (
    <section>
      <h1>Convierte talento en una presencia editorial lista para publicar.</h1>
      <p>Crea tu cuenta, lanza tu proyecto y trabaja sobre un flujo claro de documento, preview y portada.</p>
      <a href={primaryCta.href}>{primaryCta.label}</a>
      <a href={secondaryCta.href}>{secondaryCta.label}</a>
    </section>
  );
}
```

- [ ] **Step 4: Implement the remaining sections**

Create focused presentational components that consume arrays from `marketing-data.ts`:
- `LandingProofStrip`
- `LandingWorkflow`
- `LandingProductShowcase`
- `LandingBenefits`
- `LandingFinalCta`

Each component should:
- accept only the data it needs via typed props
- avoid client hooks
- preserve semantic headings and list markup

- [ ] **Step 5: Expand `marketing-data.ts`**

Add typed arrays for:
- workflow steps
- benefit cards
- showcase panels
- closing trust notes

- [ ] **Step 6: Run tests to verify hero passes**

Run: `npm run test:run -- src/components/marketing/landing-hero.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing
git commit -m "feat: add landing marketing sections"
```

### Task 3: Integrar la nueva landing en la home

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing integration test**

```ts
import { render, screen } from '@testing-library/react';
import HomePage from './page';

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: null }),
}));

describe('HomePage', () => {
  it('shows Crear cuenta for anonymous users', async () => {
    render(await HomePage());
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/page.test.tsx`
Expected: FAIL because the old page content does not match the new contract.

- [ ] **Step 3: Implement the new page composition**

`src/app/page.tsx` should:
- call `auth()`
- derive CTAs via `getPrimaryCta` and `getSecondaryCta`
- render the six marketing sections in order
- keep `main` and container structure slim

Use this composition shape:

```tsx
export default async function HomePage() {
  const { userId } = await auth();
  const primaryCta = getPrimaryCta(userId);
  const secondaryCta = getSecondaryCta(userId);

  return (
    <main>
      <LandingHero primaryCta={primaryCta} secondaryCta={secondaryCta} />
      <LandingProofStrip items={proofItems} />
      <LandingWorkflow steps={workflowSteps} />
      <LandingProductShowcase panels={showcasePanels} />
      <LandingBenefits items={benefitItems} />
      <LandingFinalCta primaryCta={primaryCta} />
    </main>
  );
}
```

- [ ] **Step 4: Update page metadata**

Replace the generic platform description in `src/app/layout.tsx` with copy aligned to the landing:

```ts
export const metadata: Metadata = {
  title: 'Anclora Talent | Crea y publica proyectos editoriales con claridad',
  description:
    'Anclora Talent te permite crear tu cuenta, lanzar proyectos editoriales y trabajar sobre documento, preview y portada desde un mismo flujo.',
};
```

- [ ] **Step 5: Run integration tests**

Run: `npm run test:run -- src/app/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/page.test.tsx
git commit -m "feat: integrate redesigned landing page"
```

### Task 4: Aplicar sistema visual y legibilidad premium

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/marketing/landing-hero.tsx`
- Modify: `src/components/marketing/landing-product-showcase.tsx`
- Modify: `src/components/marketing/landing-benefits.tsx`
- Modify: `src/components/marketing/landing-final-cta.tsx`

- [ ] **Step 1: Write the failing visual smoke test**

```ts
import { render, screen } from '@testing-library/react';
import { LandingFinalCta } from './landing-final-cta';

describe('LandingFinalCta', () => {
  it('renders the primary CTA as a visible action', () => {
    render(<LandingFinalCta primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }} />);
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/marketing/landing-final-cta.test.tsx`
Expected: FAIL because the component contract is not implemented yet.

- [ ] **Step 3: Implement visual system updates**

Apply:
- stronger background variables in `globals.css`
- higher contrast text tokens
- premium surfaces, gradients and shadows
- mobile-safe spacing

Guardrails:
- no hard-to-read pale text over light surfaces
- CTA buttons must remain readable in hover and rest states
- avoid decorative noise that reduces clarity

- [ ] **Step 4: Pass CTA props through the final section**

Ensure `LandingFinalCta` repeats the main action and includes one concise reassurance line.

- [ ] **Step 5: Run visual smoke tests**

Run: `npm run test:run -- src/components/marketing/landing-final-cta.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/marketing
git commit -m "feat: apply premium landing visual system"
```

### Task 5: Validar comportamiento y cierre

**Files:**
- Verify only

- [ ] **Step 1: Run targeted tests**

Run: `npm run test:run -- src/components/marketing/marketing-helpers.test.ts src/components/marketing/landing-hero.test.tsx src/components/marketing/landing-final-cta.test.tsx src/app/page.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Launch dev server and verify visually**

Run: `npm run dev`
Then verify:
- the hero headline is readable on first load
- `Crear cuenta` is visible above the fold on mobile
- authenticated state switches CTA to dashboard
- product showcase anchors and spacing feel coherent

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: verify landing signup redesign"
```
