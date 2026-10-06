import { expect, test, type Page } from '@playwright/test';
import { CHAPTERS, ensureProject, insertImage, openChapterReady, deleteProjectByTitle, signInAsQaIdentity } from './helpers/image-qa';

// Typing stability. Run alone while iterating:
//   QA_IMAGE_PROJECT_ID=<id> npx playwright test e2e/qa-multipage-typing-stability.spec.ts --reporter=list --workers=1

// Real browsers show classic scrollbars, which take layout width; headless hides them by default.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

let projectId = '';
let createdTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  const project = await ensureProject(page);
  projectId = project.projectId;
  createdTitle = project.created ? project.title : '';
  await page.close();
});
test.afterAll(async ({ browser }) => {
  if (!createdTitle || process.env.QA_KEEP_PROJECT) return;
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  await deleteProjectByTitle(page, createdTitle).catch(() => undefined);
  await page.close();
});
test.beforeEach(async ({ page }) => {
  await signInAsQaIdentity(page);
});

type Sample = {
  flow: number[];
  track: number[];
  trackTransform: string;
  pm: number[];
  pmTransform: string;
  scrollers: Array<[number, number]>;
  pages: string;
  blocks: string[];
  pmChildren: number;
};

async function sample(page: Page): Promise<Sample> {
  return page.evaluate(() => {
    const r = (el: Element) => {
      const b = el.getBoundingClientRect();
      return [b.left, b.top, b.width, b.height].map((v) => Number(v.toFixed(2)));
    };
    const flow = document.querySelector('.multipage-editor-flow') as HTMLElement;
    const track = flow.querySelector('.multipage-editor-flow-track') as HTMLElement;
    const pm = flow.querySelector('.ProseMirror') as HTMLElement;
    const scrollers: Array<[number, number]> = [];
    for (let el: HTMLElement | null = flow; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) scrollers.push([el.scrollTop, el.scrollLeft]);
    }
    return {
      flow: r(flow),
      track: r(track),
      trackTransform: getComputedStyle(track).transform,
      pm: r(pm),
      pmTransform: getComputedStyle(pm).transform,
      scrollers,
      pages: document.body.innerText.match(/\d+\/\d+\s*págin/)?.[0] ?? '',
      blocks: Array.from(pm.querySelectorAll(':scope > p, :scope > h1, :scope > h2')).slice(0, 6).map((el) => r(el).join(',')),
      pmChildren: pm.children.length,
    };
  });
}

/** Everything that is *not* the typed paragraph must stay put. */
function maxDelta(a: number[], b: number[]) {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}

async function typeAndSample(page: Page, text: string) {
  const samples: Sample[] = [await sample(page)];
  for (const char of text) {
    await page.keyboard.type(char);
    await page.waitForTimeout(120);
    samples.push(await sample(page));
  }
  return samples;
}

function summarize(allSamples: Sample[]) {
  // The first keystrokes may legitimately scroll the caret into view (smooth scroll); judge the settled rest.
  const samples = allSamples.slice(3);
  const first = samples[0];
  return {
    flow: Math.max(...samples.map((s) => maxDelta(s.flow, first.flow))),
    track: Math.max(...samples.map((s) => maxDelta(s.track, first.track))),
    pm: Math.max(...samples.map((s) => maxDelta(s.pm, first.pm))),
    transforms: new Set(samples.map((s) => `${s.trackTransform}|${s.pmTransform}`)).size,
    scroll: Math.max(...samples.map((s) => Math.max(...s.scrollers.map((v, i) => Math.abs(v[0] - (first.scrollers[i]?.[0] ?? 0)) + Math.abs(v[1] - (first.scrollers[i]?.[1] ?? 0)))))),
    pages: new Set(samples.map((s) => s.pages)).size,
    children: new Set(samples.map((s) => s.pmChildren)).size,
  };
}

test('A. one page: typing leaves the paper fixed (oracle)', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.notaEditorial);
  await editor.locator('p').first().click();
  await page.keyboard.press('End');
  const raw = await typeAndSample(page, 'abcdefghijklmnopqrst');
  console.log('[SERIES]', raw.map((x) => `${x.flow[0]},${x.flow[1]}|${x.scrollers.map((v) => v.join('/')).join(';')}`).join('  '));
  const result = summarize(raw);
  console.log('[TYPING] one page', JSON.stringify(result));
  expect(result.flow).toBeLessThanOrEqual(0.5);
  expect(result.pm).toBeLessThanOrEqual(0.5);
  expect(result.pages).toBe(1);
});

test('B. two pages: typing on page 2 keeps both pages fixed', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  for (const n of [1, 2]) await insertImage(page, editor, n);
  await page.waitForTimeout(1500);
  // last paragraph of the chapter lives on the last page
  await editor.locator(':scope > p').last().click();
  await page.keyboard.press('End');
  const samples = await typeAndSample(page, 'abcdefghijklmnopqrst');
  console.log('[SERIES]', samples.map((x) => `${x.flow[0]},${x.flow[1]}|${x.track[0]}|${x.scrollers.map((v) => v.join('/')).join(';')}|${x.pages}`).join('  '));
  const result = summarize(samples);
  console.log('[TYPING] page 2', JSON.stringify(result), samples[0].pages);
  expect(result.flow).toBeLessThanOrEqual(0.5);
  expect(result.track).toBeLessThanOrEqual(0.5);
  expect(result.pm).toBeLessThanOrEqual(0.5);
  expect(result.transforms).toBe(1);
  expect(result.scroll).toBeLessThanOrEqual(0.5);
  expect(result.pages).toBe(1);
});

test('C. two pages: typing on page 1 keeps both pages fixed', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  for (const n of [1, 2]) await insertImage(page, editor, n);
  await page.waitForTimeout(1500);
  await editor.locator(':scope > p').first().click();
  await page.keyboard.press('End');
  const samples = await typeAndSample(page, 'abcdefghijklmnopqrst');
  console.log('[SERIES]', samples.map((x) => `${x.flow[0]},${x.flow[1]}|${x.track[0]}|${x.scrollers.map((v) => v.join('/')).join(';')}|${x.pages}`).join('  '));
  const result = summarize(samples);
  console.log('[TYPING] page 1', JSON.stringify(result), samples[0].pages);
  expect(result.flow).toBeLessThanOrEqual(0.5);
  expect(result.track).toBeLessThanOrEqual(0.5);
  expect(result.pm).toBeLessThanOrEqual(0.5);
  expect(result.transforms).toBe(1);
  expect(result.scroll).toBeLessThanOrEqual(0.5);
});

const LOREM = 'La atención sostenida exige condiciones estables y una rutina sencilla que no dependa de la fuerza de voluntad. '.repeat(5);

const pageCount = (page: Page) =>
  page.evaluate(() => Number(document.body.innerText.match(/\d+\/(\d+)\s*págin/)?.[1] ?? 0));

test('D. real overflow creates the page once, then typing is stable again; E. undo compacts it once', async ({ page }) => {
  test.setTimeout(240_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await editor.locator(':scope > p').last().click();
  await page.keyboard.press('End');

  const counts: number[] = [await pageCount(page)];
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press('Enter');
    await page.keyboard.insertText(LOREM);
    await page.waitForTimeout(500);
    counts.push(await pageCount(page));
  }
  console.log('[OVERFLOW] pages after each paragraph', counts.join('>'));
  const monotonic = counts.every((value, i) => i === 0 || value >= counts[i - 1]);
  expect(monotonic, `page count never oscillates while growing (${counts.join('>')})`).toBe(true);
  expect(counts[counts.length - 1]).toBeGreaterThan(counts[0]);

  // after the transition, normal typing is stable again
  await page.keyboard.type('x');
  await page.waitForTimeout(1500);
  const samples = await typeAndSample(page, 'abcdefghij');
  const result = summarize(samples.slice(0));
  expect(result.flow).toBeLessThanOrEqual(0.5);
  expect(result.pm).toBeLessThanOrEqual(0.5);
  expect(result.pages).toBe(1);

  // underflow: undoing the growth compacts the pages, once and monotonically
  const down: number[] = [await pageCount(page)];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Control+z');
    if (i % 3 === 2) {
      await page.waitForTimeout(250);
      down.push(await pageCount(page));
    }
  }
  console.log('[UNDERFLOW] pages while undoing', down.join('>'));
  expect(down.every((value, i) => i === 0 || value <= down[i - 1]), `page count never oscillates while shrinking (${down.join('>')})`).toBe(true);
  expect(down[down.length - 1]).toBeLessThan(down[0]);
});
