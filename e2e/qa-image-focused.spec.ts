import { expect, test } from '@playwright/test';
import {
  BOX,
  CONTROLS,
  HANDLE,
  chapterTexts,
  CHAPTERS,
  deleteProjectByTitle,
  dragHandle,
  ensureProject,
  flowGeometry,
  imageAttrs,
  imageColumn,
  insertImage,
  makeFirstImageFloating,
  openChapterReady,
  rectOf,
  signInAsQaIdentity,
  siblingSnapshot,
} from './helpers/image-qa';

// Focused image gates. Run one at a time while iterating, e.g.
//   npx playwright test e2e/qa-image-focused.spec.ts -g "A\." --reporter=list --workers=1
// Set QA_IMAGE_PROJECT_ID to reuse a QA project (the specs never save).

let projectId = '';
let createdTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000); // cold dev server + ODT import
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  const project = await ensureProject(page);
  projectId = project.projectId;
  createdTitle = project.created ? project.title : '';
  await page.close();
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(120_000);
  if (!createdTitle || process.env.QA_KEEP_PROJECT) return;
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  await deleteProjectByTitle(page, createdTitle).catch(() => undefined);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await signInAsQaIdentity(page);
});

test('A. positioned drag moves only the image (attrs only, siblings untouched)', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await insertImage(page, editor, 1);
  await makeFirstImageFloating(page, editor);

  const textsBefore = await chapterTexts(page);
  const before = await siblingSnapshot(page);
  const column = await imageColumn(page);

  let samples = 0;
  await dragHandle(page, 40, 70, async () => {
    const snap = await siblingSnapshot(page);
    samples += 1;
    snap.blocks.forEach((block, i) => {
      expect(block.transform, `block ${i} has no drag transform`).toBe('none');
      expect(block.rect, `block ${i} does not follow the pointer`).toEqual(before.blocks[i].rect);
    });
    expect(snap.pmTransform).toBe('none');
    expect(snap.trackTransform).toBe(before.trackTransform);
    snap.wrapperTransforms.forEach((transform) => expect(transform).toBe('none'));
  });
  expect(samples).toBeGreaterThan(3);

  expect(await chapterTexts(page)).toEqual(textsBefore);
  const attrs = await imageAttrs(page);
  expect(attrs.mode).toBe('floating');
  expect(Number(attrs.x)).toBeGreaterThan(20);
  expect(Number(attrs.y)).toBeGreaterThan(40);
  expect(await imageColumn(page)).toBe(column);
});

test('B. dragging far down crosses to the next page without duplicating text', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await insertImage(page, editor, 1);
  await insertImage(page, editor, 2);
  await insertImage(page, editor, 3);
  await makeFirstImageFloating(page, editor);

  const textsBefore = await chapterTexts(page);
  const columnBefore = await imageColumn(page);
  const imagesBefore = await editor.locator('img').count();
  const pagesBefore = await page.evaluate(() => document.body.innerText.match(/\/(\d+)\s*págin/)?.[1]);

  await dragHandle(page, 0, 1500);

  await expect.poll(() => imageColumn(page), { message: 'image moved to a later page', timeout: 8_000 }).toBeGreaterThan(columnBefore);
  expect(await chapterTexts(page), 'no duplicated or lost text').toEqual(textsBefore);
  expect(await editor.locator('img').count()).toBe(imagesBefore);
  const pagesAfter = await page.evaluate(() => document.body.innerText.match(/\/(\d+)\s*págin/)?.[1]);
  expect(Number(pagesAfter)).toBeGreaterThanOrEqual(Number(pagesBefore));
});

test('C. image controls stay attached to the image after crossing pages', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await insertImage(page, editor, 1);
  await insertImage(page, editor, 2);
  await insertImage(page, editor, 3);
  await makeFirstImageFloating(page, editor);
  await dragHandle(page, 0, 1500);

  const geometry = await flowGeometry(page);
  const box = (await rectOf(page, BOX))!;
  const controls = (await rectOf(page, CONTROLS))!;
  expect(controls, 'controls rendered').not.toBeNull();

  // same page: controls horizontally inside the image's column and adjacent to it
  const centerX = controls.x + controls.w / 2;
  expect(centerX).toBeGreaterThanOrEqual(box.x - 2);
  expect(centerX).toBeLessThanOrEqual(box.x + box.w + 2);
  const above = Math.abs(controls.y + controls.h - box.y) < 20;
  const below = Math.abs(controls.y - (box.y + box.h)) < 20;
  expect(above || below, 'controls adjacent to the image').toBe(true);
  // and fully inside the visible page window (not clipped, not in a neighbour page)
  expect(controls.y).toBeGreaterThanOrEqual(geometry.flow.y - 1);
  expect(controls.y + controls.h).toBeLessThanOrEqual(geometry.flow.y + geometry.flow.h + 1);
  expect(controls.x).toBeGreaterThanOrEqual(geometry.flow.x - 1);
  expect(controls.x + controls.w).toBeLessThanOrEqual(geometry.flow.x + geometry.flow.w + 1);
  // the page on screen is the image's page
  expect(box.x + box.w / 2).toBeGreaterThanOrEqual(geometry.flow.x);
  expect(box.x + box.w / 2).toBeLessThanOrEqual(geometry.flow.x + geometry.flow.w);
  await expect(page.locator(HANDLE)).toHaveCount(1);
});

test('D. a real caret exists after the image and typing lands after it', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.notaEditorial);
  // image as the last block of a short chapter (room is left below it on the page)
  await editor.focus();
  await editor.evaluate((root) => {
    const paragraphs = root.querySelectorAll(':scope > p');
    const last = paragraphs[paragraphs.length - 1] as HTMLElement;
    const walker = document.createTreeWalker(last, NodeFilter.SHOW_TEXT);
    let node: Node | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) node = n;
    const range = document.createRange();
    range.setStart(node as Node, (node as Text).length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({
    name: 'qa.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP8z8Dwn4EIwDiqkL4KAEEXAxHsGZz9AAAAAElFTkSuQmCC', 'base64'),
  });
  await expect(editor.locator('img')).toHaveCount(1);
  // centred image = no text wrap, so the next paragraph sits below it
  await page.locator('[data-testid="image-node-align-center-button"]').click();
  await page.waitForTimeout(800);

  const structure = () =>
    editor.evaluate((root) => Array.from(root.children).map((c) => (c.querySelector('img') ? 'image' : c.tagName.toLowerCase())));
  expect((await structure()).at(-1), 'a paragraph always follows a trailing image').toBe('p');

  // click directly below the image: caret must land in the paragraph after it
  await editor.locator(':scope > p').last().scrollIntoViewIfNeeded();
  const box = (await rectOf(page, '[data-testid="image-node-box"]'))!;
  const trailing = (await editor.locator(':scope > p').last().boundingBox())!;
  // the empty paragraph right after the image is where the click must land
  const clickY = trailing.y + Math.min(trailing.height / 2, 8);
  expect(clickY, 'click point is below the image').toBeGreaterThanOrEqual(box.y + box.h - 1);
  await page.mouse.click(box.x + 20, clickY);
  await page.keyboard.type('Texto después de imagen');
  const result = await editor.evaluate((root) => {
    const children = Array.from(root.children);
    const imageIndex = children.findIndex((c) => c.querySelector('img'));
    const next = children[imageIndex + 1];
    const selection = window.getSelection();
    return {
      nextText: next?.textContent ?? '',
      caretInNext: Boolean(selection?.anchorNode && next?.contains(selection.anchorNode)),
      collapsed: selection?.isCollapsed ?? false,
    };
  });
  expect(result.nextText).toContain('Texto después de imagen');
  expect(result.caretInNext).toBe(true);
  expect(result.collapsed).toBe(true);

  // NodeSelection(image) + Enter also opens a paragraph with a caret
  await editor.locator('img').first().click();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Otra línea');
  const second = await page.evaluate(() => {
    const selection = window.getSelection();
    const block = selection?.anchorNode ? (selection.anchorNode as Node).parentElement?.closest('p') : null;
    return block?.textContent ?? '';
  });
  expect(second).toContain('Otra línea');
});
