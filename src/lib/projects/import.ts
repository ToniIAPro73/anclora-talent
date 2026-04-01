import 'server-only';
import { PDFParse } from 'pdf-parse';
import WordExtractor from 'word-extractor';
import type { ImportedDocumentSeed } from './types';
export { supportedImportAccept } from './import-config';

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) ?? '' : '';
}

function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function paragraphsFromText(input: string) {
  return normalizeText(input)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function fileNameToTitle(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildImportedDocumentSeed({
  fileName,
  mimeType,
  text,
}: {
  fileName: string;
  mimeType: string;
  text: string;
}): ImportedDocumentSeed {
  const paragraphs = paragraphsFromText(text);
  const fallbackTitle = fileNameToTitle(fileName) || 'Documento importado';
  const title = paragraphs[0] && paragraphs[0].length <= 120 ? paragraphs[0] : fallbackTitle;
  const subtitleParagraph = paragraphs.find((paragraph, index) => index > 0 && paragraph !== title) ?? '';
  const subtitle = subtitleParagraph ? subtitleParagraph.slice(0, 180) : `Documento importado desde ${fileName}`;
  const contentParagraphs = (paragraphs[0] === title ? paragraphs.slice(1) : paragraphs)
    .filter((paragraph) => paragraph !== subtitleParagraph)
    .slice(0, 6);

  const blocks =
    contentParagraphs.length > 0
      ? contentParagraphs.map((paragraph, index) => ({
          type: index === 0 ? ('heading' as const) : ('paragraph' as const),
          content: paragraph,
        }))
      : [
          { type: 'heading' as const, content: title },
          { type: 'paragraph' as const, content: subtitle },
        ];

  return {
    title,
    subtitle,
    chapterTitle: title,
    blocks,
    sourceFileName: fileName,
    sourceMimeType: mimeType,
  };
}

async function extractTextFromBuffer(fileName: string, mimeType: string, buffer: Buffer) {
  const extension = getExtension(fileName);

  if (!SUPPORTED_IMPORT_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported import format: ${extension || 'unknown'}`);
  }

  if (extension === 'txt' || extension === 'md' || mimeType.startsWith('text/')) {
    return buffer.toString('utf8');
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text;
  }

  if (extension === 'doc' || extension === 'docx') {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    return document.getBody();
  }

  throw new Error(`Import format is not supported yet: ${extension}`);
}

export async function extractImportedDocumentSeed(file: File) {
  const fileName = file.name || 'documento-importado';
  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const extractedText = await extractTextFromBuffer(fileName, mimeType, Buffer.from(arrayBuffer));
  const normalized = normalizeText(extractedText);

  if (!normalized) {
    throw new Error('Imported document is empty');
  }

  return buildImportedDocumentSeed({
    fileName,
    mimeType,
    text: normalized,
  });
}
