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
  imageCenter,
  pageCenter,
  guideCount,
  dragCenterTo,
  grabHandle,
  GUIDE_H,
  GUIDE_V,
  importFreshProject,
  QA_PROJECT_TITLE_PREFIX,
  insertImage,
  makeFirstImageFloating,
  openChapterReady,
  PNG,
  placeCaretAtEnd,
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

test('E. roundtrip: image goes down a page and comes back up', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await insertImage(page, editor, 1);
  await insertImage(page, editor, 2);
  await insertImage(page, editor, 3);
  await makeFirstImageFloating(page, editor);

  const textsBefore = await chapterTexts(page);
  const columnStart = await imageColumn(page);
  const imagesBefore = await editor.locator('img').count();

  await dragHandle(page, 0, 1500);
  await expect.poll(() => imageColumn(page), { message: 'image went down', timeout: 8_000 }).toBeGreaterThan(columnStart);
  const columnDown = await imageColumn(page);

  // drag it back up (the handle follows the image on the displayed page)
  await page.waitForTimeout(600);
  await dragHandle(page, 0, -1500);
  await expect.poll(() => imageColumn(page), { message: 'image came back', timeout: 8_000 }).toBeLessThan(columnDown);

  expect(await chapterTexts(page), 'no duplicated or lost text').toEqual(textsBefore);
  expect(await editor.locator('img').count()).toBe(imagesBefore);
  await expect(page.locator(CONTROLS)).toHaveCount(1);
  const box = (await rectOf(page, BOX))!;
  const controls = (await rectOf(page, CONTROLS))!;
  expect(Math.abs(controls.y + controls.h - box.y) < 20 || Math.abs(controls.y - (box.y + box.h)) < 20).toBe(true);
});

test('E2. multi-page roundtrip: every page crossed down is crossed back up', async ({ page }) => {
  test.setTimeout(200_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  for (const n of [1, 2, 3, 3]) await insertImage(page, editor, n);
  await makeFirstImageFloating(page, editor);
  const textsBefore = await chapterTexts(page);
  const imagesBefore = await editor.locator('img').count();

  const down: number[] = [await imageColumn(page)];
  for (let i = 0; i < 3; i += 1) {
    await dragHandle(page, 0, 1500);
    await page.waitForTimeout(900);
    const column = await imageColumn(page);
    if (column <= down[down.length - 1]) break;
    down.push(column);
  }
  expect(down.length, `went down at least one page (columns ${down.join('>')})`).toBeGreaterThan(1);

  const up: number[] = [down[down.length - 1]];
  for (let i = 0; i < down.length - 1; i += 1) {
    await dragHandle(page, 0, -1500);
    await page.waitForTimeout(900);
    up.push(await imageColumn(page));
    expect(up[up.length - 1], `up step ${i + 1} (down ${down.join('>')}, up ${up.join('>')})`).toBeLessThan(up[up.length - 2]);
  }
  expect(up[up.length - 1]).toBe(down[0]);
  expect(await chapterTexts(page)).toEqual(textsBefore);
  expect(await editor.locator('img').count()).toBe(imagesBefore);
  await expect(page.locator(CONTROLS)).toHaveCount(1);
});

test('F. click in the blank space above a positioned image puts a caret before it', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.notaEditorial);
  await placeCaretAtEnd(editor, 2);
  await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: PNG });
  await expect(editor.locator('img')).toHaveCount(1);
  await page.waitForTimeout(600);
  await page.locator('[data-testid="image-node-mode-toggle-button"]').click();
  await page.waitForTimeout(500);
  // push the image down inside its page: blank slot appears above it
  await dragHandle(page, 0, 150);
  await page.waitForTimeout(500);

  const box = (await rectOf(page, BOX))!;
  const textsBefore = await chapterTexts(page);
  const slotTop = box.y - 90; // inside the slot, above the displaced image
  await page.mouse.click(box.x + 40, slotTop);
  await page.keyboard.type('Texto antes de imagen');

  const result = await editor.evaluate((root) => {
    const children = Array.from(root.children);
    const imageIndex = children.findIndex((c) => c.querySelector('img'));
    const selection = window.getSelection();
    return {
      before: children[imageIndex - 1]?.textContent ?? '',
      caretInBefore: Boolean(selection?.anchorNode && children[imageIndex - 1]?.contains(selection.anchorNode)),
    };
  });
  expect(result.before).toContain('Texto antes de imagen');
  expect(result.caretInBefore).toBe(true);
  expect((await chapterTexts(page)).slice(0, textsBefore.length)).toEqual(textsBefore);
});

test('G. blank page space maps to the nearest valid position (no freeform text)', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.notaEditorial);
  const geometry = await flowGeometry(page);
  const lastParagraph = (await editor.locator(':scope > p').last().boundingBox())!;
  // far below the last block, still inside the page content area
  const y = Math.min(lastParagraph.y + lastParagraph.height + 80, geometry.flow.y + geometry.flow.h - 10);
  await page.mouse.click(lastParagraph.x + 60, y);
  await page.keyboard.type('X');
  const placed = await editor.evaluate((root) => {
    const selection = window.getSelection();
    const block = selection?.anchorNode ? (selection.anchorNode as Node).parentElement?.closest('.ProseMirror > *') : null;
    return { text: block?.textContent ?? '', blocks: Array.from(root.children).length };
  });
  expect(placed.text).toContain('X');
});

test('H. paragraph typed before the image survives save and reload', async ({ page }) => {
  // This one saves, so it runs on its own throw-away project and never dirties the shared one.
  test.setTimeout(300_000);
  const title = `${QA_PROJECT_TITLE_PREFIX}H ${Date.now()}`;
  const ownProject = await importFreshProject(page, title);
  try {
    const editor = await openChapterReady(page, ownProject, CHAPTERS.notaEditorial);
    await placeCaretAtEnd(editor, 2);
    await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: PNG });
    await expect(editor.locator('img')).toHaveCount(1);
    await page.waitForTimeout(600);
    await page.locator('[data-testid="image-node-mode-toggle-button"]').click();
    await page.waitForTimeout(500);
    await dragHandle(page, 0, 150);
    await page.waitForTimeout(500);
    const box = (await rectOf(page, BOX))!;
    await page.mouse.click(box.x + 40, box.y - 90);
    await page.keyboard.type('Texto antes de imagen');

    await page.locator('[data-testid="chapter-editor-header-save-button"]').click();
    await expect(page.locator('.ac-editor-shell__status')).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.reload();
    const reopened = await openChapterReady(page, ownProject, CHAPTERS.notaEditorial);
    const order = await reopened.evaluate((root) =>
      Array.from(root.children).map((c) => (c.querySelector('img') ? 'IMG' : (c.textContent ?? '').trim())),
    );
    const imageIndex = order.indexOf('IMG');
    expect(imageIndex).toBeGreaterThan(0);
    expect(order[imageIndex - 1]).toBe('Texto antes de imagen');
    expect(await reopened.locator('img').count()).toBe(1);
    expect(await reopened.locator('[data-image-mode]').first().getAttribute('data-image-mode')).toBe('floating');
  } finally {
    await deleteProjectByTitle(page, title).catch(() => undefined);
  }
});

async function floatingImageOnShortPage(page: import('@playwright/test').Page, project: string) {
  const editor = await openChapterReady(page, project, CHAPTERS.notaEditorial);
  await placeCaretAtEnd(editor, 2);
  await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: PNG });
  await expect(editor.locator('img')).toHaveCount(1);
  await page.waitForTimeout(600);
  await page.locator('[data-testid="image-node-mode-toggle-button"]').click();
  await page.waitForTimeout(500);
  return editor;
}

test('I1. horizontal centre snap: guide appears near centre, disappears away and after drop', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await floatingImageOnShortPage(page, projectId);
  const centerPage = await pageCenter(page, await imageColumn(page));
  const textsBefore = await chapterTexts(page);
  const siblingsBefore = await siblingSnapshot(page);

  const grab = await grabHandle(page);
  // far from the centre: no guide
  await dragCenterTo(page, { x: centerPage.x + 70 }, grab);
  expect(await guideCount(page)).toEqual({ v: 0, h: 0 });
  // within the threshold: vertical guide only
  const handle = (await page.locator('[data-testid="image-node-drag-handle"]').boundingBox())!;
  await dragCenterTo(page, { x: centerPage.x + 4 }, { x: handle.x + 6, y: handle.y + 6 });
  expect(await guideCount(page)).toEqual({ v: 1, h: 0 });
  // guides never affect layout: siblings stay put while dragging
  const during = await siblingSnapshot(page);
  during.blocks.forEach((block, i) => expect(block.rect).toEqual(siblingsBefore.blocks[i].rect));
  await page.mouse.up();
  await page.waitForTimeout(400);

  expect(await guideCount(page)).toEqual({ v: 0, h: 0 });
  expect(Math.abs((await imageCenter(page)).x - centerPage.x), 'snapped to the exact page centre').toBeLessThan(0.6);
  expect(await chapterTexts(page)).toEqual(textsBefore);
  void editor;
});

test('I2. vertical and full-centre snap', async ({ page }) => {
  test.setTimeout(120_000);
  await floatingImageOnShortPage(page, projectId);
  const centerPage = await pageCenter(page, await imageColumn(page));

  const grab = await grabHandle(page);
  await dragCenterTo(page, { x: centerPage.x + 90, y: centerPage.y + 5 }, grab);
  expect(await guideCount(page)).toEqual({ v: 0, h: 1 });
  const handle = (await page.locator('[data-testid="image-node-drag-handle"]').boundingBox())!;
  await dragCenterTo(page, { x: centerPage.x - 3, y: centerPage.y - 4 }, { x: handle.x + 6, y: handle.y + 6 });
  expect(await guideCount(page)).toEqual({ v: 1, h: 1 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const after = await imageCenter(page);
  expect(Math.abs(after.x - centerPage.x)).toBeLessThan(0.6);
  expect(Math.abs(after.y - centerPage.y)).toBeLessThan(0.6);
  expect(await guideCount(page)).toEqual({ v: 0, h: 0 });

  // one drag = one undo step: undo restores the pre-drag position
  await page.locator('[data-testid="editor-toolbar-undo-button"]').click();
  await page.waitForTimeout(300);
  const undone = await imageCenter(page);
  expect(Math.abs(undone.x - centerPage.x) > 2 || Math.abs(undone.y - centerPage.y) > 2).toBe(true);
});

test('I3. the guide centre follows the image to another page', async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await openChapterReady(page, projectId, CHAPTERS.capitulo1);
  await insertImage(page, editor, 1);
  await insertImage(page, editor, 2);
  await insertImage(page, editor, 3);
  await makeFirstImageFloating(page, editor);
  const columnBefore = await imageColumn(page);
  await dragHandle(page, 0, 1500);
  await expect.poll(() => imageColumn(page), { timeout: 8_000 }).toBeGreaterThan(columnBefore);
  await page.waitForTimeout(600);

  const column = await imageColumn(page);
  const centerPage = await pageCenter(page, column);
  const grab = await grabHandle(page);
  await dragCenterTo(page, { x: centerPage.x + 3 }, grab);
  expect(await guideCount(page), 'guide on the new page').toMatchObject({ v: 1 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(Math.abs((await imageCenter(page)).x - centerPage.x), 'centred on the NEW page').toBeLessThan(0.6);
  void GUIDE_H; void GUIDE_V;
});

test('I4. snapped position survives save and reload', async ({ page }) => {
  test.setTimeout(300_000);
  const title = `${QA_PROJECT_TITLE_PREFIX}I4 ${Date.now()}`;
  const ownProject = await importFreshProject(page, title);
  try {
    await floatingImageOnShortPage(page, ownProject);
    const centerPage = await pageCenter(page, await imageColumn(page));
    const grab = await grabHandle(page);
    await dragCenterTo(page, { x: centerPage.x + 3, y: centerPage.y + 3 }, grab);
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="chapter-editor-header-save-button"]').click();
    await expect(page.locator('.ac-editor-shell__status')).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.reload();
    const reopened = await openChapterReady(page, ownProject, CHAPTERS.notaEditorial);
    await reopened.locator('img').first().click();
    const center = await pageCenter(page, await imageColumn(page));
    const image = await imageCenter(page);
    expect(Math.abs(image.x - center.x)).toBeLessThan(0.8);
    expect(Math.abs(image.y - center.y)).toBeLessThan(0.8);
  } finally {
    await deleteProjectByTitle(page, title).catch(() => undefined);
  }
});
