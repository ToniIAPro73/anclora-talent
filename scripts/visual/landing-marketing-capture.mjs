import { chromium } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = 'test-results/visual/marketing';
const PUBLIC_HERO = 'public/landing/hero';
const PUBLIC_FEATURES = 'public/landing/features';
const DEMO_FRONT_PATH = path.resolve('public/landing/atlas-cover-front.jpg');
const DEMO_BACK_PATH = path.resolve('public/landing/atlas-cover-back.jpg');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PUBLIC_HERO, { recursive: true });
mkdirSync(PUBLIC_FEATURES, { recursive: true });

const USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

const VIEWPORT = { width: 1440, height: 900 };

async function register(base) {
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(USER),
  });
  if (!res.ok && res.status !== 409) {
    console.warn(`Register responded with ${res.status}`);
  }
}

async function login(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({
        necessary: true,
        session: true,
        analytics: false,
        marketing: false,
        updatedAt: new Date().toISOString(),
        version: 'v1',
      })
    );
    window.localStorage.setItem('anclora-sidebar-collapsed', 'false');
  });

  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    document.cookie = `anclora-theme=${t}; path=/; max-age=31536000; samesite=lax`;
  }, theme);
  await page.waitForTimeout(600);
}

async function getOrCreateDemoProject(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });

  // Check if "Atlas de la Memoria" exists
  const projectLink = page.locator('a[href*="/projects/"]').filter({ hasText: /Atlas de la Memoria/i }).first();
  if ((await projectLink.count()) > 0) {
    const href = await projectLink.getAttribute('href');
    const match = href?.match(/\/projects\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      console.log(`Found existing demo project: ${match[1]}`);
      return match[1];
    }
  }

  // Create new demo project
  console.log('Creating demo project: Atlas de la Memoria...');
  await page.locator('[data-testid="create-project-title-input"]').fill('Atlas de la Memoria');
  await page.locator('[data-testid="create-project-submit-button"]').click();
  await page.waitForURL(/\/projects\/[a-zA-Z0-9_-]+/, { timeout: 45000 });
  const url = page.url();
  const match = url.match(/\/projects\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) {
    throw new Error(`Failed to extract projectId from URL: ${url}`);
  }
  console.log(`Created demo project with ID: ${match[1]}`);
  return match[1];
}

async function setupCoverStudio(page, projectId) {
  console.log('Configuring Front Cover Studio for Atlas de la Memoria...');
  await page.goto(`${BASE}/projects/${projectId}/cover`, { waitUntil: 'networkidle', timeout: 45000 });

  // Switch to advanced mode if in simple mode
  const modeToggle = page.locator('[data-testid="cover-studio-mode-toggle-cover"]');
  if (await modeToggle.isVisible()) {
    const text = await modeToggle.innerText();
    if (text.includes('Avanzado')) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }
  }

  // Set inputs if in simple mode or via state
  const titleInput = page.locator('[data-testid="cover-field-title-input"]');
  if ((await titleInput.count()) > 0) {
    await titleInput.fill('Atlas de la Memoria');
  }

  // Upload front artwork
  if (existsSync(DEMO_FRONT_PATH)) {
    const bgInput = page.locator('[data-testid="cover-studio-background-input"]');
    if ((await bgInput.count()) > 0) {
      console.log('Uploading demo cover artwork into Cover Studio canvas...');
      await bgInput.setInputFiles(DEMO_FRONT_PATH);
      await page.locator('[data-testid="cover-surface-canvas"] img').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(600);
    }
  }

  // Toggle off title layer so it doesn't duplicate the artwork's embossed title
  const titleVisBtn = page.locator('[data-testid="cover-field-visibility-title-button"]');
  if (await titleVisBtn.isVisible()) {
    const isActive = await titleVisBtn.getAttribute('data-active');
    if (isActive === 'true') {
      await titleVisBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Click Save & Render
  const saveBtn = page.locator('[data-testid="cover-studio-save-render-button-cover"]');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(1500);
  }

  // Configure Back Cover Studio
  console.log('Configuring Back Cover Studio for Atlas de la Memoria...');
  await page.goto(`${BASE}/projects/${projectId}/back-cover`, { waitUntil: 'networkidle', timeout: 45000 });

  const backModeToggle = page.locator('[data-testid="cover-studio-mode-toggle-back-cover"]');
  if (await backModeToggle.isVisible()) {
    const text = await backModeToggle.innerText();
    if (text.includes('Avanzado')) {
      await backModeToggle.click();
      await page.waitForTimeout(300);
    }
  }

  // Upload back cover artwork
  if (existsSync(DEMO_BACK_PATH)) {
    const backBgInput = page.locator('[data-testid="cover-studio-background-input"]');
    if ((await backBgInput.count()) > 0) {
      console.log('Uploading demo back cover artwork into Cover Studio canvas...');
      await backBgInput.setInputFiles(DEMO_BACK_PATH);
      await page.locator('[data-testid="back-cover-surface-canvas"] img').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(600);
    }
  }

  // Toggle off duplicate text layers on back cover
  const backTitleVisBtn = page.locator('[data-testid="cover-field-visibility-title-button"]');
  if (await backTitleVisBtn.isVisible()) {
    const isActive = await backTitleVisBtn.getAttribute('data-active');
    if (isActive === 'true') {
      await backTitleVisBtn.click();
      await page.waitForTimeout(200);
    }
  }
  const backBodyVisBtn = page.locator('[data-testid="cover-field-visibility-body-button"]');
  if (await backBodyVisBtn.isVisible()) {
    const isActive = await backBodyVisBtn.getAttribute('data-active');
    if (isActive === 'true') {
      await backBodyVisBtn.click();
      await page.waitForTimeout(200);
    }
  }

  // Set opacity to 100% on back cover
  await page.evaluate(() => {
    const canvasImg = document.querySelector('[data-testid="back-cover-surface-canvas"] img');
    if (canvasImg) canvasImg.style.opacity = '1';
  });

  const backSaveBtn = page.locator('[data-testid="cover-studio-save-render-button-back-cover"]');
  if (await backSaveBtn.isVisible()) {
    await backSaveBtn.click();
    await page.waitForTimeout(1500);
  }
}

async function setupChapterContent(page, projectId) {
  console.log('Setting up editorial chapter prose for Atlas de la Memoria...');
  await page.goto(`${BASE}/projects/${projectId}/editor`, { waitUntil: 'networkidle', timeout: 45000 });

  // Dismiss onboarding if present
  const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
  if (await skipIntro.isVisible().catch(() => false)) {
    await skipIntro.click();
    await page.waitForTimeout(300);
  }

  // Go to step 2 (Chapters)
  const prevBtn = page.getByTestId('previous-step-button');
  for (let i = 0; i < 5; i++) {
    if (await prevBtn.isDisabled().catch(() => true)) break;
    await prevBtn.click();
    await page.waitForTimeout(200);
  }
  const nextBtn = page.getByTestId('next-step-button');
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(400);
  }

  // Extract chapter ID from the first chapter card
  const chapterIdInput = page.locator('[data-testid="chapter-move-up-chapter-id-input-1"]');
  if ((await chapterIdInput.count()) > 0) {
    const chapterId = await chapterIdInput.inputValue();
    console.log(`Setting chapter content for chapterId: ${chapterId}`);

    const htmlProse = `<h2>Capítulo I · La Geometría de los Recuerdos</h2><p>Toda memoria comienza con una línea trazada en la penumbra. No recordamos las ciudades por sus planos catastrales, sino por la luz oblicua de las seis de la tarde sobre los sillares de arenisca, por el crujido del pavimento mojado o por aquel silencio repentino en medio de una plaza desconocida.</p><p>Construir un libro no consiste en acumular palabras, sino en esculpir el espacio que las acoge. El margen blanco no es ausencia; es el aire que permite respirar a la frase. Cuando un tipógrafo ajusta el interlineado o calibra el peso de una versalilla, no aplica una norma mecánica: compone una música silenciosa que acompaña la mirada del lector a lo largo de las páginas.</p><blockquote>«La memoria no conserva los hechos como piedras talladas, sino como sombras que se alargan cuando el sol se oculta.»</blockquote><p>Al igual que los antiguos atlas cartográficos trazaban costas inciertas con tinta de agallas y oro molido, este volumen busca delimitar las fronteras de aquello que fuimos antes de que el olvido reclame sus dominios.</p>`;

    // Open first chapter editor
    const editBtn = page.getByTestId('chapter-edit-button-1');
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      const proseMirror = page.locator('.ac-editor-shell .ProseMirror, .ProseMirror').first();
      await proseMirror.waitFor({ timeout: 15000 });

      // Update prose content
      await page.evaluate((html) => {
        const pm = document.querySelector('.ac-editor-shell .ProseMirror, .ProseMirror');
        if (pm) {
          pm.innerHTML = html;
          pm.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, htmlProse);
      await page.waitForTimeout(500);

      // Save using direct button evaluation
      const saveBtn = page.locator('[data-testid="chapter-editor-save-button"]');
      if ((await saveBtn.count()) > 0) {
        await saveBtn.evaluate((el) => el.click());
        await page.waitForTimeout(1000);
      }

      // Close chapter editor
      const cancelOrClose = page.locator('[data-testid="chapter-editor-cancel-button"]');
      if ((await cancelOrClose.count()) > 0) {
        await cancelOrClose.evaluate((el) => el.click());
        await page.waitForTimeout(400);
      }
    }
  }
}

async function getDomContentFingerprint(page) {
  const content = await page.evaluate(() => {
    return {
      url: window.location.pathname,
      scrollX: Math.round(window.scrollX),
      scrollY: Math.round(window.scrollY),
      headings: Array.from(
        document.querySelectorAll('h1, h2, h3, [data-testid*="title"], [data-testid*="chapter"]')
      )
        .map((el) => el.textContent?.trim())
        .filter(Boolean),
      hasCanvasImg: Boolean(
        document.querySelector(
          '.ac-editor-canvas-stage img, [data-testid*="canvas"] img, .talent-preview-stage img'
        )
      ),
      inputs: Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).map(
        (el) => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : '')
      ),
    };
  });

  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

async function capturePair(page, scenarioId, route, setupFn) {
  console.log(`\n=== Capturing Pair: ${scenarioId} ===`);
  if (setupFn) {
    await setupFn();
  }

  // 1. Capture DARK
  await setTheme(page, 'dark');
  await page.waitForTimeout(600);
  const darkFingerprint = await getDomContentFingerprint(page);

  const darkOut = `${OUT_DIR}/${scenarioId}-dark.png`;
  await page.screenshot({ path: darkOut });
  console.log(`Saved DARK: ${darkOut} (Fingerprint: ${darkFingerprint.slice(0, 10)})`);

  // 2. Capture LIGHT (EXACT SAME STATE, only theme toggle)
  await setTheme(page, 'light');
  await page.waitForTimeout(600);
  const lightFingerprint = await getDomContentFingerprint(page);

  // 3. Strict Parity Verification: Fail if DOM content / route / inputs changed
  if (darkFingerprint !== lightFingerprint) {
    throw new Error(
      `[PARITY MISMATCH] Scenario '${scenarioId}' state diverged between Dark (${darkFingerprint}) and Light (${lightFingerprint}). Dark/Light captures must be strictly identical in state.`
    );
  }
  console.log(`[Parity Check PASSED] '${scenarioId}' state is 100% identical between dark & light.`);

  const lightOut = `${OUT_DIR}/${scenarioId}-light.png`;
  await page.screenshot({ path: lightOut });
  console.log(`Saved LIGHT: ${lightOut}`);

  return {
    scenarioId,
    route,
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    fingerprint: darkFingerprint,
    dark: darkOut,
    light: lightOut,
    status: 'PARITY_VERIFIED',
  };
}

async function main() {
  console.log('Starting landing marketing capture process...');
  await register(BASE).catch(() => {});

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'es',
    deviceScaleFactor: 2, // Retina resolution
  });
  const page = await context.newPage();

  await login(page);
  const projectId = await getOrCreateDemoProject(page);

  // Configure demo data
  await setupChapterContent(page, projectId);
  await setupCoverStudio(page, projectId);

  const manifest = [];

  // Pair 1: Front Cover Studio
  manifest.push(
    await capturePair(page, 'cover-studio', `/projects/${projectId}/cover`, async () => {
      await page.goto(`${BASE}/projects/${projectId}/cover`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Switch to advanced mode if in simple mode
      const modeToggle = page.locator('[data-testid="cover-studio-mode-toggle-cover"]');
      if (await modeToggle.isVisible()) {
        const text = await modeToggle.innerText();
        if (text.includes('Avanzado')) {
          await modeToggle.click();
          await page.waitForTimeout(300);
        }
      }

      // Upload artwork if needed
      const bgInput = page.locator('[data-testid="cover-studio-background-input"]');
      if ((await bgInput.count()) > 0) {
        await bgInput.setInputFiles(DEMO_FRONT_PATH);
        await page.locator('[data-testid="cover-surface-canvas"] img').waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(500);
      }

      // Ensure duplicate text layer is toggled off
      const titleVisBtn = page.locator('[data-testid="cover-field-visibility-title-button"]');
      if (await titleVisBtn.isVisible()) {
        const isActive = await titleVisBtn.getAttribute('data-active');
        if (isActive === 'true') {
          await titleVisBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // Scroll canvas stage into clear view
      await page.locator('.ac-editor-canvas-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    })
  );

  // Pair 2: Back Cover Studio
  manifest.push(
    await capturePair(page, 'cover-studio-back', `/projects/${projectId}/back-cover`, async () => {
      await page.goto(`${BASE}/projects/${projectId}/back-cover`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const backModeToggle = page.locator('[data-testid="cover-studio-mode-toggle-back-cover"]');
      if (await backModeToggle.isVisible()) {
        const text = await backModeToggle.innerText();
        if (text.includes('Avanzado')) {
          await backModeToggle.click();
          await page.waitForTimeout(300);
        }
      }

      const backBgInput = page.locator('[data-testid="cover-studio-background-input"]');
      if ((await backBgInput.count()) > 0) {
        await backBgInput.setInputFiles(DEMO_BACK_PATH);
        await page.locator('[data-testid="back-cover-surface-canvas"] img').waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(500);
      }

      const backTitleVisBtn = page.locator('[data-testid="cover-field-visibility-title-button"]');
      if (await backTitleVisBtn.isVisible()) {
        const isActive = await backTitleVisBtn.getAttribute('data-active');
        if (isActive === 'true') {
          await backTitleVisBtn.click();
          await page.waitForTimeout(200);
        }
      }
      const backBodyVisBtn = page.locator('[data-testid="cover-field-visibility-body-button"]');
      if (await backBodyVisBtn.isVisible()) {
        const isActive = await backBodyVisBtn.getAttribute('data-active');
        if (isActive === 'true') {
          await backBodyVisBtn.click();
          await page.waitForTimeout(200);
        }
      }

      // Set 100% opacity for back cover artwork
      await page.evaluate(() => {
        const canvasImg = document.querySelector('[data-testid="back-cover-surface-canvas"] img');
        if (canvasImg) canvasImg.style.opacity = '1';
      });

      await page.locator('.ac-editor-canvas-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    })
  );

  // Pair 3: Double-Spread Preview
  manifest.push(
    await capturePair(page, 'preview-spread', `/projects/${projectId}/preview`, async () => {
      await page.goto(`${BASE}/projects/${projectId}/preview`, { waitUntil: 'networkidle' });
      const openModalBtn = page.getByTestId('open-full-preview-button');
      if (await openModalBtn.isVisible().catch(() => false)) {
        await openModalBtn.click();
        const stage = page.getByTestId('preview-modal-stage');
        await stage.waitFor({ timeout: 20000 });
        await page.waitForTimeout(600);

        // Advance to spread page 2
        const nextBtn = page.getByTestId('preview-modal-next-page-button');
        if (await nextBtn.isVisible().catch(() => false) && !(await nextBtn.isDisabled().catch(() => true))) {
          await nextBtn.click();
          await page.waitForTimeout(400);
        }
      }
    })
  );

  // Pair 4: Real Editor
  manifest.push(
    await capturePair(page, 'editor-preview', `/projects/${projectId}/editor`, async () => {
      await page.goto(`${BASE}/projects/${projectId}/editor`, { waitUntil: 'networkidle' });

      // Dismiss onboarding
      const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
      if (await skipIntro.isVisible().catch(() => false)) {
        await skipIntro.click();
        await page.waitForTimeout(300);
      }

      // Go to step 2 (Chapters)
      const prevBtn = page.getByTestId('previous-step-button');
      for (let i = 0; i < 5; i++) {
        if (await prevBtn.isDisabled().catch(() => true)) break;
        await prevBtn.click();
        await page.waitForTimeout(200);
      }
      const nextBtn = page.getByTestId('next-step-button');
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }

      // Open chapter 1 in fullscreen editor
      const editBtn = page.getByTestId('chapter-edit-button-1');
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        const proseMirror = page.locator('.ac-editor-shell .ProseMirror, .ProseMirror').first();
        await proseMirror.waitFor({ timeout: 15000 });
        await page.waitForTimeout(800);
      }
    })
  );

  // Copy into public/landing locations
  copyFileSync(`${OUT_DIR}/cover-studio-dark.png`, `${PUBLIC_HERO}/cover-preview-dark.png`);
  copyFileSync(`${OUT_DIR}/cover-studio-light.png`, `${PUBLIC_HERO}/cover-preview-light.png`);
  copyFileSync(`${OUT_DIR}/cover-studio-dark.png`, `${PUBLIC_FEATURES}/cover-studio-dark.png`);
  copyFileSync(`${OUT_DIR}/cover-studio-light.png`, `${PUBLIC_FEATURES}/cover-studio-light.png`);

  copyFileSync(`${OUT_DIR}/cover-studio-back-dark.png`, `${PUBLIC_FEATURES}/cover-studio-back-dark.png`);
  copyFileSync(`${OUT_DIR}/cover-studio-back-light.png`, `${PUBLIC_FEATURES}/cover-studio-back-light.png`);

  copyFileSync(`${OUT_DIR}/preview-spread-dark.png`, `${PUBLIC_FEATURES}/preview-spread-dark.png`);
  copyFileSync(`${OUT_DIR}/preview-spread-light.png`, `${PUBLIC_FEATURES}/preview-spread-light.png`);

  copyFileSync(`${OUT_DIR}/editor-preview-dark.png`, `${PUBLIC_HERO}/editor-preview-dark.png`);
  copyFileSync(`${OUT_DIR}/editor-preview-light.png`, `${PUBLIC_HERO}/editor-preview-light.png`);
  copyFileSync(`${OUT_DIR}/editor-preview-dark.png`, `${PUBLIC_FEATURES}/editor-preview-dark.png`);
  copyFileSync(`${OUT_DIR}/editor-preview-light.png`, `${PUBLIC_FEATURES}/editor-preview-light.png`);

  writeFileSync(`${OUT_DIR}/marketing-screenshot-manifest.json`, JSON.stringify(manifest, null, 2));
  console.log('\nMarketing screenshots manifest written to test-results/visual/marketing/marketing-screenshot-manifest.json');
  console.log('All theme screenshot pairs copied to public/landing/ assets.');

  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error in marketing capture:', err);
  process.exit(1);
});
