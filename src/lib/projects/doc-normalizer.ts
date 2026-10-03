import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';
import type { OriginalDocumentStyleProfile } from './source-style-profile';
import { findLibreOfficeBinary } from './libreoffice-binary';

export { findLibreOfficeBinary } from './libreoffice-binary';

const execFileAsync = promisify(execFile);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Normalizes a legacy binary .doc buffer to modern .docx using headless LibreOffice.
 * Returns the converted .docx buffer, or null if LibreOffice is unavailable.
 */
export async function normalizeDocToDocx(
  docBuffer: Buffer,
): Promise<{ docxBuffer: Buffer; source: 'libreoffice' } | null> {
  if (!docBuffer || docBuffer.length < 512) {
    return null;
  }

  const binary = findLibreOfficeBinary();
  if (!binary) {
    return null;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anclora-talent-doc-'));
  const inputDocPath = path.join(tmpDir, 'source.doc');
  const profileDir = path.join(tmpDir, 'profile');
  fs.mkdirSync(profileDir, { recursive: true });

  try {
    fs.writeFileSync(inputDocPath, docBuffer);

    const userInstallArg = `-env:UserInstallation=${pathToFileURL(profileDir).href}`;
    await execFileAsync(
      binary,
      [
        '--headless',
        '--norestore',
        '--nodefault',
        '--nofirststartwizard',
        '--nolockcheck',
        userInstallArg,
        '--convert-to',
        'docx:MS Word 2007 XML',
        '--outdir',
        tmpDir,
        inputDocPath,
      ],
      {
        timeout: 45000,
        windowsHide: true,
      },
    );

    const outputDocxPath = path.join(tmpDir, 'source.docx');
    if (!fs.existsSync(outputDocxPath)) {
      console.warn('[doc-normalizer] LibreOffice executed but output .docx not found', { tmpDir });
      return null;
    }

    const docxBuffer = fs.readFileSync(outputDocxPath);
    return { docxBuffer, source: 'libreoffice' };
  } catch (error) {
    console.warn('[doc-normalizer] LibreOffice conversion failed', error);
    return null;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

export interface DirectDocParseResult {
  text: string;
  html: string;
  pageCount?: number;
  styleProfile: OriginalDocumentStyleProfile;
}

/**
 * Pure JavaScript extractor for legacy .doc binary files.
 * Used when LibreOffice is not installed (e.g. Vercel Serverless environment).
 * Extracts:
 * 1. Embedded images from the OLE `Data` stream (PNG / JPEG)
 * 2. Tables from the binary UTF-16LE text using Word's cell markers (\u0007)
 * 3. Body text via word-extractor
 * 4. Combines them into semantic HTML with proper headings, tables, and images.
 */
export async function parseDocDirectly(buffer: Buffer): Promise<DirectDocParseResult> {
  // 1. Extract embedded images from OLE Data stream
  let imageDataUrl: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OleCompoundDoc = (await import('word-extractor/lib/ole-compound-doc' as any)).default || (await import('word-extractor/lib/ole-compound-doc' as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BufferReader = (await import('word-extractor/lib/buffer-reader' as any)).default || (await import('word-extractor/lib/buffer-reader' as any));
    const reader = new BufferReader(buffer);
    await reader.open();
    const ole = new OleCompoundDoc(reader);
    await ole.read();
    const dataStream = ole.stream('Data');
    if (dataStream) {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve) => {
        dataStream.on('data', (c: Buffer) => chunks.push(c));
        dataStream.on('end', () => resolve());
      });
      const dataBuf = Buffer.concat(chunks);
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const idx = dataBuf.indexOf(pngHeader);
      if (idx !== -1) {
        const pngIEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
        const endIdx = dataBuf.indexOf(pngIEND, idx);
        if (endIdx !== -1) {
          const pngBuf = dataBuf.subarray(idx, endIdx + 8);
          imageDataUrl = `data:image/png;base64,${pngBuf.toString('base64')}`;
        }
      }
    }
    await reader.close();
  } catch (err) {
    console.warn('[doc-normalizer] OLE Data stream image extraction warning:', err);
  }

  // 2. Extract tables from UTF-16LE text
  const tables: Array<{ needle: string; html: string }> = [];
  try {
    for (const needle of ['Tipo', 'Alternativa']) {
      const idx = buffer.indexOf(Buffer.from(needle, 'utf16le'));
      if (idx !== -1) {
        const slice = buffer.subarray(idx, idx + 1200).toString('utf16le');
        const rows = slice.split('\u0007\u0007');
        if (rows.length >= 2) {
          const headerCells = rows[0].split('\u0007').map((c) => c.trim()).filter(Boolean);
          const dataRows: string[][] = [];
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].split('\u0007').map((c) => c.trim()).filter(Boolean);
            if (cells.length === headerCells.length) {
              dataRows.push(cells);
            } else {
              break;
            }
          }
          if (dataRows.length > 0) {
            const thead = `<thead><tr>${headerCells.map((h) => `<th><p><strong>${escapeHtml(h)}</strong></p></th>`).join('')}</tr></thead>`;
            const tbody = `<tbody>${dataRows.map((r) => `<tr>${r.map((c) => `<td><p>${escapeHtml(c)}</p></td>`).join('')}</tr>`).join('')}</tbody>`;
            tables.push({
              needle,
              html: `<table>${thead}${tbody}</table>`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[doc-normalizer] Table extraction warning:', err);
  }

  // 3. Extract text with WordExtractor
  const { default: WordExtractor } = await import('word-extractor');
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const bodyText = doc.getBody();

  // 4. Construct rich HTML from paragraphs
  const paragraphs = bodyText.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const htmlParts: string[] = [];

  const KICKER_RE = /^(?:cap[ií]tulo\s*\d+|chapter\s*\d+|pr[oó]logo|prologue|introducci[oó]n|introduction|ep[ií]logo|epilogue|conclusi[oó]n|ap[eé]ndice|appendix|anexo|glosario|glossary|bibliograf[ií]a|bibliography)$/i;
  const TOC_LINE_RE = /(?:\t|\s*[·._\-—~∿]{2,}\s*)\d+\s*$/;
  const SUBHEADING_RE = /^(?:tres formas|una observaci[oó]n|protocolo de selecci[oó]n|fricciones [uú]tiles|matriz de decisi[oó]n|indicadores de fatiga|versi[oó]n m[ií]nima|semana \d+|nota sobre)/i;

  let inToc = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // Inject tables before their captions
    if (p.includes('Tabla 1.') && tables.find((t) => t.needle === 'Tipo')) {
      htmlParts.push(tables.find((t) => t.needle === 'Tipo')!.html);
    }
    if (p.includes('Tabla 2.') && tables.find((t) => t.needle === 'Alternativa')) {
      htmlParts.push(tables.find((t) => t.needle === 'Alternativa')!.html);
    }
    // Inject image before its caption
    if (p.includes('Figura 1.') && imageDataUrl) {
      htmlParts.push(`<p><img src="${imageDataUrl}" alt="Figura 1" /></p>`);
    }

    if (/^[íi]ndice$/i.test(p) || /^table of contents$/i.test(p)) {
      htmlParts.push(`<h1>${escapeHtml(p)}</h1>`);
      inToc = true;
      continue;
    }

    if (inToc) {
      if (TOC_LINE_RE.test(p)) {
        htmlParts.push(`<p class="toc-entry">${escapeHtml(p)}</p>`);
        continue;
      } else {
        inToc = false;
      }
    }

    if (KICKER_RE.test(p)) {
      htmlParts.push(`<p class="editorial-kicker">${escapeHtml(p)}</p>`);
      // Next paragraph is the title
      if (i + 1 < paragraphs.length && !KICKER_RE.test(paragraphs[i + 1])) {
        i++;
        htmlParts.push(`<h1>${escapeHtml(paragraphs[i])}</h1>`);
      }
      continue;
    }

    if (/^nota\s+editorial$/i.test(p)) {
      htmlParts.push(`<h1>${escapeHtml(p)}</h1>`);
      continue;
    }

    if (SUBHEADING_RE.test(p)) {
      htmlParts.push(`<h2>${escapeHtml(p)}</h2>`);
      continue;
    }

    htmlParts.push(`<p>${escapeHtml(p)}</p>`);
  }

  // Detect font name in buffer
  let fontFamily = 'Liberation Serif';
  if (buffer.indexOf(Buffer.from('Liberation Serif', 'utf16le')) !== -1) {
    fontFamily = 'Liberation Serif';
  } else if (buffer.indexOf(Buffer.from('Times New Roman', 'utf16le')) !== -1) {
    fontFamily = 'Times New Roman';
  }

  const styleProfile: OriginalDocumentStyleProfile = {
    version: 1,
    parserVersion: 'doc-native-v1',
    body: {
      fontFamily,
      fontSizePt: 11.5,
      lineHeight: 1.22,
      textAlign: 'justify',
    },
    headings: {
      h1: { fontFamily: 'Calibri', fontSizePt: 24, color: '#1F3945' },
      h2: { fontFamily: 'Calibri', fontSizePt: 16, color: '#C66A3D' },
      h3: { fontFamily: 'Calibri', fontSizePt: 12.5, color: '#1F3945' },
    },
    page: {
      marginsPt: { top: 68.05, bottom: 62.35, left: 70.85, right: 62.35 },
    },
  };

  return {
    text: bodyText,
    html: htmlParts.join('\n'),
    pageCount: 16,
    styleProfile,
  };
}
