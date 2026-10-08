/**
 * Aligns the pages the source document really has (rendered text of each page, see source-page-map-renderer.ts) with
 * the imported chapters, and puts a page break exactly where each source page starts. The imported book then
 * paginates like the original: no page more, none less.
 */
export interface PageBreakChapter {
  blocks: Array<{ type: string; content: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

const KEY_LENGTH = 28;

// Letters and digits only: immune to hyphenation, tab leaders, spacing and punctuation differences between the
// renderer's text and the imported markup.
function pageKey(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export interface PageBreakAlignment {
  inserted: number;
  matchedPages: number;
  renderedPages: number;
}

export function applyRenderedPageBreaks<T extends PageBreakChapter>(chapters: T[], renderedPages: string[]): { chapters: T[]; alignment: PageBreakAlignment } {
  type Slot = { chapter: number; block: number; key: string };
  const slots: Slot[] = [];
  chapters.forEach((chapter, chapterIndex) => chapter.blocks.forEach((block, blockIndex) => {
    if (block.type === 'pageBreak') return;
    slots.push({ chapter: chapterIndex, block: blockIndex, key: pageKey(block.content) });
  }));

  const starts = new Map<string, true>();
  let pointer = 0;
  let matchedPages = 0;
  const pageKeys = renderedPages.map(pageKey).filter((key) => key.length >= 6);
  for (const key of pageKeys) {
    const wanted = key.slice(0, KEY_LENGTH);
    for (let index = pointer; index < slots.length; index += 1) {
      // The page may start with a short block (a kicker, a heading) whose text continues into the next blocks.
      let joined = '';
      for (let next = index; next < slots.length && joined.length < wanted.length; next += 1) joined += slots[next].key;
      if (joined.startsWith(wanted)) {
        starts.set(`${slots[index].chapter}:${slots[index].block}`, true);
        pointer = index + 1;
        matchedPages += 1;
        break;
      }
    }
  }

  // Too few pages recognised: the alignment cannot be trusted, keep the importer's own breaks.
  if (pageKeys.length === 0 || matchedPages / pageKeys.length < 0.5) {
    return { chapters, alignment: { inserted: 0, matchedPages, renderedPages: pageKeys.length } };
  }

  let inserted = 0;
  const result = chapters.map((chapter, chapterIndex) => {
    const blocks: T['blocks'] = [];
    let firstContent = true;
    chapter.blocks.forEach((block, blockIndex) => {
      // The source pagination replaces whatever breaks the importer guessed from paragraph properties.
      if (block.type === 'pageBreak') return;
      if (!firstContent && starts.has(`${chapterIndex}:${blockIndex}`)) {
        blocks.push({ type: 'pageBreak', content: '' });
        inserted += 1;
      }
      firstContent = false;
      blocks.push(block);
    });
    return { ...chapter, blocks };
  });
  return { chapters: result, alignment: { inserted, matchedPages, renderedPages: pageKeys.length } };
}
