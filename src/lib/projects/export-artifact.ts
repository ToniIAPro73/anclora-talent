/**
 * Artifact verification for exports. "The download succeeded" is not "the export passed": before a generated file
 * is offered, its bytes are checked for the structure of its format (package parts, markers, non-empty content).
 * Pure and client-safe (JSZip only), so the same checks run in the browser and in tests.
 */

import JSZip from 'jszip';
import { formatDefinition, type ExportFormat } from './export-workspace';

export type ArtifactCheckId =
  | 'nonEmpty'
  | 'contentType'
  | 'pdfHeader'
  | 'pdfTrailer'
  | 'pdfPages'
  | 'zipPackage'
  | 'docxDocument'
  | 'docxText'
  | 'epubMimetype'
  | 'epubContainer'
  | 'epubPackage'
  | 'epubNavigation'
  | 'epubChapters'
  | 'htmlDocument'
  | 'htmlBody'
  | 'markdownText';

export interface ArtifactCheck {
  id: ArtifactCheckId;
  ok: boolean;
}

export interface ArtifactValidation {
  ok: boolean;
  checks: ArtifactCheck[];
}

const decoder = new TextDecoder('utf-8');
const latin1 = new TextDecoder('latin1');

function result(checks: ArtifactCheck[]): ArtifactValidation {
  return { ok: checks.every((check) => check.ok), checks };
}

function validatePdf(bytes: Uint8Array): ArtifactCheck[] {
  const head = latin1.decode(bytes.slice(0, 8));
  const tail = latin1.decode(bytes.slice(Math.max(0, bytes.length - 1024)));
  // Page objects are written as `/Type /Page` (never `/Pages`): at least one must exist.
  const body = latin1.decode(bytes);
  const pages = body.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
  return [
    { id: 'pdfHeader', ok: head.startsWith('%PDF-') },
    { id: 'pdfTrailer', ok: tail.includes('%%EOF') },
    { id: 'pdfPages', ok: pages > 0 },
  ];
}

async function validateDocx(bytes: Uint8Array): Promise<ArtifactCheck[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return [{ id: 'zipPackage', ok: false }];
  }
  const document = zip.file('word/document.xml');
  const xml = document ? await document.async('string') : '';
  const text = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join('').trim();
  return [
    { id: 'zipPackage', ok: Boolean(zip.file('[Content_Types].xml')) },
    { id: 'docxDocument', ok: Boolean(document) },
    { id: 'docxText', ok: text.length > 0 },
  ];
}

async function validateEpub(bytes: Uint8Array): Promise<ArtifactCheck[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return [{ id: 'zipPackage', ok: false }];
  }
  const names = Object.keys(zip.files);
  const mimetype = zip.file('mimetype');
  const mimetypeText = mimetype ? (await mimetype.async('string')).trim() : '';
  const container = zip.file('META-INF/container.xml');
  const containerXml = container ? await container.async('string') : '';
  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
  const opfFile = opfPath ? zip.file(opfPath) : null;
  const opf = opfFile ? await opfFile.async('string') : '';
  const hasNav = /properties="[^"]*\bnav\b[^"]*"/.test(opf) || Boolean(zip.file(/toc\.ncx$/i).length);
  const spineItems = opf.match(/<itemref\b/g)?.length ?? 0;
  return [
    { id: 'zipPackage', ok: true },
    // The EPUB spec requires `mimetype` to be the first entry, stored with the exact media type.
    { id: 'epubMimetype', ok: names[0] === 'mimetype' && mimetypeText === 'application/epub+zip' },
    { id: 'epubContainer', ok: Boolean(opfPath) },
    { id: 'epubPackage', ok: Boolean(opfFile) && /<spine\b/.test(opf) },
    { id: 'epubNavigation', ok: hasNav },
    { id: 'epubChapters', ok: spineItems >= 2 },
  ];
}

export async function validateExportArtifact(
  format: ExportFormat,
  bytes: Uint8Array,
  contentType: string,
): Promise<ArtifactValidation> {
  const definition = formatDefinition(format);
  const base: ArtifactCheck[] = [
    { id: 'nonEmpty', ok: bytes.length > 0 },
    { id: 'contentType', ok: definition.mime.test(contentType) },
  ];
  if (bytes.length === 0) return result(base);

  switch (format) {
    case 'pdf':
      return result([...base, ...validatePdf(bytes)]);
    case 'docx':
      return result([...base, ...(await validateDocx(bytes))]);
    case 'epub':
      return result([...base, ...(await validateEpub(bytes))]);
    case 'html': {
      const html = decoder.decode(bytes);
      return result([
        ...base,
        { id: 'htmlDocument', ok: /^\s*<!doctype html/i.test(html) && /<\/html>\s*$/i.test(html) },
        { id: 'htmlBody', ok: /<body[\s>]/i.test(html) && html.replace(/<[^>]+>/g, '').trim().length > 0 },
      ]);
    }
    case 'markdown':
      return result([...base, { id: 'markdownText', ok: decoder.decode(bytes).trim().length > 0 }]);
  }
}
