/**
 * Project → simple HTML slides (F2 — MVP, launch pack `slides` asset).
 *
 * Minimum viable shape, intentionally flat:
 * - One title slide (document title + subtitle + author).
 * - One `<section class="slide">` per project chapter: the chapter title as
 *   `<h1>` followed by the chapter blocks rendered with the same HTML dialect
 *   the editor/export use (`chapterBlocksToHtml`).
 * - A tiny inline stylesheet (system fonts, centered slide, page-break per
 *   slide) so the file is presentable standalone and printable to PDF from
 *   any browser. No JS, no slide navigation, no per-block fragmentation —
 *   those land when the course product needs real deck semantics.
 */

import { chapterBlocksToHtml } from './chapter-html';
import type { ProjectRecord } from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SLIDES_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, 'Segoe UI', sans-serif; color: #1a1a2e; background: #0b133f; }
  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center;
    gap: 1rem; padding: 8vh 10vw; background: #fdfbf7; page-break-after: always; }
  .slide--title { align-items: center; text-align: center; background: #0b133f; color: #f2e3b3; }
  .slide h1 { font-size: 2.25rem; line-height: 1.2; }
  .slide--title h1 { font-size: 3rem; }
  .slide--title .slides-subtitle { font-size: 1.25rem; opacity: 0.85; }
  .slide--title .slides-author { margin-top: 2rem; font-size: 1rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .slide h2 { font-size: 1.5rem; }
  .slide p, .slide li { font-size: 1.125rem; line-height: 1.6; }
  .slide ul, .slide ol { padding-left: 1.5rem; }
  .slide blockquote { border-left: 4px solid #d4af37; padding-left: 1rem; font-style: italic; }
  .slide img { max-width: 100%; height: auto; }
  .slide table { border-collapse: collapse; width: 100%; }
  .slide th, .slide td { border: 1px solid #d4d4d8; padding: 0.5rem 0.75rem; text-align: left; }
`;

/** Builds the standalone HTML slides document from the project chapters. */
export function buildSlidesHtml(project: ProjectRecord): string {
  const { title, subtitle, author } = project.document;
  const safeTitle = escapeHtml(title || project.title);

  const titleSlide = `
    <section class="slide slide--title">
      <h1>${safeTitle}</h1>
      ${subtitle ? `<p class="slides-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${author ? `<p class="slides-author">${escapeHtml(author)}</p>` : ''}
    </section>`;

  const chapterSlides = project.document.chapters
    .map((chapter) => {
      const content = chapterBlocksToHtml(chapter.blocks);
      return `
    <section class="slide">
      <h1>${escapeHtml(chapter.title)}</h1>
      ${content}
    </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(project.document.language || 'es')}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} — Slides</title>
    <style>${SLIDES_STYLES}</style>
  </head>
  <body>
    ${titleSlide}
    ${chapterSlides}
  </body>
</html>`;
}
