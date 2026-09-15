/**
 * Fixed-PDF commercial sidecar (Fase 2).
 *
 * `project.document.chapters` and `project.document.documentModel` are
 * always empty for a fixed-pdf project — Talent never builds a semantic
 * document for one (see `capabilities.ts`, `canCompose: false`). Commercial
 * surfaces (Launch Pack's marketing assets, Hotmart, Gumroad) still need a
 * `SemanticDocument` to derive a title/description/benefit bullets from, so
 * this module re-runs the SAME real-extraction pipeline the importer uses
 * (`extractImportedDocumentSeed`) against the stored original PDF and
 * converts its output into a `SemanticDocument` through the existing
 * chapter-blocks → HTML → AST pipeline (`chapterBlocksToHtml` +
 * `htmlToBlocks`, the same one `projectToSemanticDocument` uses for
 * editable chapters). Nothing here is invented: every field is either
 * extracted text or explicitly `undefined`/omitted when it can't be
 * determined — never a placeholder string.
 */

import { chapterBlocksToHtml } from './chapter-html';
import { htmlToBlocks } from '@/lib/document/from-html';
import { ensureBlockIds, type SemanticDocument } from '@/lib/document/model';
import type { DocumentBlock as ChapterBlock } from './types';
import { extractImportedDocumentSeed } from './import';
import { fetchOriginalPdfBuffer } from './original-pdf';
import type { ProjectRecord } from './types';

export async function buildFixedPdfSemanticSidecar(project: ProjectRecord): Promise<SemanticDocument> {
  const { buffer, fileName } = await fetchOriginalPdfBuffer(project);
  const file = new File([buffer], fileName, { type: 'application/pdf' });
  const seed = await extractImportedDocumentSeed(file);

  const seedChapters = seed.chapters?.length ? seed.chapters : [{ title: seed.chapterTitle, blocks: seed.blocks }];
  const chapterAstBlocks = seedChapters
    .map((chapter, chapterIndex): ChapterBlock[] =>
      chapter.blocks.map((block, blockIndex) => ({
        id: `sidecar-${chapterIndex}-${blockIndex}`,
        type: block.type,
        order: blockIndex,
        content: block.content,
      })),
    )
    .map((blocks) => htmlToBlocks(chapterBlocksToHtml(blocks)))
    .filter((blocks) => blocks.length > 0);

  const blocks = ensureBlockIds(chapterAstBlocks.flat());

  // Explicit project metadata (ProductMetadataPanel) always wins over a
  // fresh re-extraction of the original file — see cover title precedence
  // (Fase 7.6) for the same principle applied elsewhere.
  const metadata = project.document.metadata;

  return {
    version: 1,
    metadata: {
      title: metadata?.title || project.document.title || seed.title || project.title,
      subtitle: metadata?.subtitle || project.document.subtitle || seed.subtitle || undefined,
      author: metadata?.author || project.document.author || seed.author || undefined,
      language: metadata?.language || project.document.language || undefined,
      description: metadata?.description || undefined,
      keywords: metadata?.keywords ?? [],
      isbn: metadata?.isbn || undefined,
    },
    blocks,
  };
}
