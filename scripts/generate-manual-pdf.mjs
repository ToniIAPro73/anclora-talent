/**
 * Genera el PDF del manual de usuario de Anclora Talent (español).
 *
 * Uso: node scripts/generate-manual-pdf.mjs
 * Salida: public/manuals/anclora-talent-manual-usuario-es.pdf
 *
 * Renderiza en dos pasadas: la primera para averiguar en qué página
 * empieza cada sección (vía pdftotext), la segunda ya con el índice
 * completo y la numeración de página estampada en cada página.
 * Usa Chromium de Playwright cuando el binario local está disponible y
 * recurre automáticamente a @react-pdf/pdfkit en entornos sin navegador
 * headless instalado.
 */
import { chromium } from '@playwright/test';
import PDFDocument from '@react-pdf/pdfkit';
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manualDir = path.join(root, 'docs', 'manual');
const manualsOutDir = path.join(root, 'public', 'manuals');
const inputPath = path.join(manualDir, 'manual-usuario.md');
const outputPath = path.join(manualsOutDir, 'anclora-talent-manual-usuario-es.pdf');
const tmpDir = path.join(root, 'tmp', 'manual-pdf');
const passPdfPath = path.join(tmpDir, 'manual-es-pass.pdf');

// Playwright's page.setContent() loads the page with an opaque/about:blank
// origin, which cannot reliably fetch local file:// assets even with a
// <base> tag pointing at the manual directory — embedding every image as a
// base64 data URI sidesteps that entirely (and makes the intermediate HTML
// self-contained).
const IMAGE_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function dataUriForImage(relPath) {
  const absPath = path.join(manualDir, relPath);
  const ext = path.extname(absPath).toLowerCase();
  const mime = IMAGE_MIME[ext] ?? 'image/png';
  const bytes = readFileSync(absPath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

if (!existsSync(inputPath)) throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
const logoPath = path.join(manualDir, 'screenshots', 'logo.png');
if (!existsSync(logoPath)) throw new Error(`Logo no encontrado: ${logoPath}`);

mkdirSync(tmpDir, { recursive: true });
mkdirSync(manualsOutDir, { recursive: true });

const source = readFileSync(inputPath, 'utf8');
const manual = extractSections(source);
const referencedImages = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
for (const relPath of referencedImages) {
  const imagePath = path.join(manualDir, relPath);
  if (!existsSync(imagePath)) throw new Error(`Imagen referenciada no encontrada: ${relPath}`);
}

let browser = null;
try {
  browser = await chromium.launch({ headless: true });
} catch {
  browser = null;
}

if (browser) {
  await renderPdf({});
  const sectionPages = extractSectionPages();
  await renderPdf(sectionPages);
  validateFinalPdf(sectionPages);
  await browser.close();
} else {
  await renderPdfWithPdfKit({});
  const sectionPages = extractSectionPages();
  await renderPdfWithPdfKit(sectionPages);
  validateFinalPdf(sectionPages);
}

console.log(`Manual generado: ${path.relative(root, outputPath)}`);
console.log(`Secciones: ${manual.sections.length}; imágenes: ${referencedImages.length}`);

// ─── Extracción de secciones ────────────────────────────────────────────────
function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const coverEnd = lines.findIndex((line) => line.trim() === '<div class="page-break"></div>');
  if (coverEnd === -1) throw new Error('No se encontró el salto de página tras la portada.');

  const cover = lines.slice(0, coverEnd).join('\n')
    .replace('src="screenshots/logo.png"', `src="${dataUriForImage('screenshots/logo.png')}"`);
  const afterCover = lines.slice(coverEnd + 1);
  const tocIndex = afterCover.findIndex((line) => line.trim() === '## Índice');
  if (tocIndex === -1) throw new Error('No se encontró el encabezado "## Índice".');

  const afterToc = afterCover.slice(tocIndex + 1);
  const contentStart = afterToc.findIndex((line) => line.trim() === '<div class="page-break"></div>');
  if (contentStart === -1) throw new Error('No se encontró el salto de página tras el índice.');

  const contentLines = afterToc.slice(contentStart + 1);
  const sections = [];
  let current = null;

  for (const line of contentLines) {
    const match = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { number: match[1], title: match[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);

  return { cover, sections };
}

// ─── Renderizado del PDF ────────────────────────────────────────────────────
async function renderPdf(sectionPages) {
  const page = await browser.newPage();
  await page.setContent(buildHtml(sectionPages), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.locator('img').evaluateAll((images) => images
    .filter((img) => !img.complete || !img.naturalWidth || !img.naturalHeight)
    .map((img) => img.alt || 'sin alt'));
  if (broken.length) throw new Error(`Imágenes no cargadas: ${broken.join(', ')}`);
  const imageSizes = await page.locator('img').evaluateAll((images) => images.map((img) => ({
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
  })));
  if (imageSizes.some((image) => image.width < 20 || image.height < 20)) {
    throw new Error('Hay una imagen referenciada con dimensiones no razonables.');
  }

  const isFinalPass = Object.keys(sectionPages).length > 0;
  const outFile = isFinalPass ? outputPath : passPdfPath;

  await page.pdf({
    path: outFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
    displayHeaderFooter: isFinalPass,
    headerTemplate: '<span></span>',
    footerTemplate: isFinalPass ? footerTemplate() : '<span></span>',
  });
  await page.close();
}

function footerTemplate() {
  // Chromium injects the real page number as text into .pageNumber once the
  // template is laid out; a footer template can carry its own inline script,
  // which runs once per page — used here only to hide the footer on the
  // cover page (page 1), since Playwright's footerTemplate has no built-in
  // "skip first page" option.
  return `
<div id="manualFooter" style="width:100%; font-size:7.5pt; font-family: Inter, sans-serif; color:#182a4a; display:flex; justify-content:space-between; padding:0 18mm; opacity: 0.82;">
  <span style="font-weight:700;">Anclora Talent</span>
  <span class="pageNumber"></span>
</div>
<script>
  (function () {
    var el = document.querySelector('.pageNumber');
    if (el && el.textContent.trim() === '1') {
      document.getElementById('manualFooter').style.visibility = 'hidden';
    }
  })();
</script>`;
}

// ─── Renderizado alternativo A4 en dos pasadas con PDFKit ───────────────────
function stripInlineMarkdown(value) {
  return String(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .trim();
}

function readPngSize(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return { width: 1440, height: 900 };
}

async function renderPdfWithPdfKit(sectionPages) {
  const isFinalPass = Object.keys(sectionPages).length > 0;
  const outFile = isFinalPass ? outputPath : passPdfPath;
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 51;
  const MARGIN_TOP = 56;
  const MARGIN_BOTTOM = 52;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_X, right: MARGIN_X },
    bufferPages: true,
    info: {
      Title: 'Anclora Talent - Manual de Usuario v2.0',
      Author: 'Anclora Group',
      Subject: 'Manual de usuario oficial en español (Versión 2.0)',
    },
  });

  const stream = createWriteStream(outFile);
  const done = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  doc.pipe(stream);

  const fontBodyPath = '/System/Library/Fonts/Supplemental/Arial.ttf';
  const fontBoldPath = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
  const fontItalicPath = '/System/Library/Fonts/Supplemental/Arial Italic.ttf';
  const BodyFont = existsSync(fontBodyPath) ? 'Body' : 'Helvetica';
  const BoldFont = existsSync(fontBoldPath) ? 'Bold' : 'Helvetica-Bold';
  const ItalicFont = existsSync(fontItalicPath) ? 'Italic' : 'Helvetica-Oblique';
  if (existsSync(fontBodyPath)) doc.registerFont('Body', fontBodyPath);
  if (existsSync(fontBoldPath)) doc.registerFont('Bold', fontBoldPath);
  if (existsSync(fontItalicPath)) doc.registerFont('Italic', fontItalicPath);

  const ensureSpace = (neededHeight) => {
    if (doc.y + neededHeight > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage();
    }
  };

  // 1. Portada (Página 1)
  doc.save();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill('#0c141e');
  doc.roundedRect(22, 22, PAGE_W - 44, PAGE_H - 44, 4).lineWidth(1).strokeColor('#4a9fd8').stroke();
  doc.restore();

  doc.image(logoPath, (PAGE_W - 96) / 2, 86, { width: 96 });
  doc.y = 204;
  doc.font(BoldFont).fontSize(11).fillColor('#8fc8ee').text('ANCLORA TALENT', MARGIN_X, doc.y, {
    width: CONTENT_W,
    align: 'center',
    characterSpacing: 1.6,
  });
  doc.moveTo(PAGE_W / 2 - 56, doc.y + 8).lineTo(PAGE_W / 2 + 56, doc.y + 8).lineWidth(1).strokeColor('#4a9fd8').stroke();

  doc.y += 24;
  doc.font(BoldFont).fontSize(36).fillColor('#f4f8fb').text('Manual de Usuario', MARGIN_X, doc.y, {
    width: CONTENT_W,
    align: 'center',
  });

  doc.y += 14;
  doc.font(BodyFont).fontSize(13.5).fillColor('#c6d9e8').text(
    'Guía práctica del sistema de workspaces v2 para crear, estructurar, editar, diseñar portada y contraportada, colaborar, usar el Asistente IA gobernado y exportar tu publicación en Anclora Talent.',
    MARGIN_X + 28,
    doc.y,
    { width: CONTENT_W - 56, align: 'center', lineGap: 3 },
  );

  const pillY = doc.y + 34;
  const pills = ['Versión 2.0', 'Actualizado 19 octubre 2026', 'Idioma Español'];
  const pillWidths = [115, 175, 120];
  const pillGap = 12;
  const totalPillW = pillWidths.reduce((a, b) => a + b, 0) + pillGap * (pills.length - 1);
  let pillX = (PAGE_W - totalPillW) / 2;
  pills.forEach((label, idx) => {
    const w = pillWidths[idx];
    doc.save();
    doc.roundedRect(pillX, pillY, w, 24, 12).fill('#4a9fd8');
    doc.restore();
    doc.font(BoldFont).fontSize(9).fillColor('#092033').text(label, pillX, pillY + 7, {
      width: w,
      align: 'center',
    });
    pillX += w + pillGap;
  });

  doc.page.margins.bottom = 0;
  doc.font(BodyFont).fontSize(8).fillColor('#9db9cb').text(
    'Documento de ayuda al usuario final. Todas las capturas utilizan datos sintéticos de demostración sobre la versión actual v2 de Anclora Talent.',
    MARGIN_X + 16,
    PAGE_H - 76,
    { width: CONTENT_W - 32, align: 'center' },
  );

  // 2. Índice (Página 2)
  doc.addPage();
  doc.page.margins.bottom = MARGIN_BOTTOM;
  doc.font(BoldFont).fontSize(8.5).fillColor('#2c729f').text('MANUAL DE USUARIO', MARGIN_X, MARGIN_TOP, {
    characterSpacing: 1.1,
  });
  doc.moveDown(0.2);
  doc.font(BoldFont).fontSize(22).fillColor('#12344b').text('Índice', MARGIN_X, doc.y);
  doc.moveDown(0.2);
  doc.font(BodyFont).fontSize(9.5).fillColor('#536b7b').text(
    'Una guía ordenada para crear, editar, revisar y exportar un proyecto editorial en el sistema de workspaces v2.',
    MARGIN_X,
    doc.y,
    { width: CONTENT_W },
  );
  doc.y += 10;
  doc.moveTo(MARGIN_X, doc.y).lineTo(PAGE_W - MARGIN_X, doc.y).lineWidth(1).strokeColor('#4a9fd8').stroke();
  doc.y += 6;

  for (const section of manual.sections) {
    const rowY = doc.y;
    const pageNo = sectionPages[section.number] ? String(sectionPages[section.number]) : '';
    doc.font(BoldFont).fontSize(8.5).fillColor('#2c729f').text(section.number.padStart(2, '0'), MARGIN_X, rowY + 3, {
      width: 24,
    });
    doc.font(BodyFont).fontSize(10).fillColor('#12344b').text(section.title, MARGIN_X + 28, rowY + 2, {
      width: CONTENT_W - 70,
    });
    if (pageNo) {
      doc.font(BoldFont).fontSize(9.5).fillColor('#12344b').text(pageNo, PAGE_W - MARGIN_X - 36, rowY + 2, {
        width: 36,
        align: 'right',
      });
    }
    doc.y = rowY + 20;
    doc.moveTo(MARGIN_X, doc.y).lineTo(PAGE_W - MARGIN_X, doc.y).lineWidth(0.5).strokeColor('#e4ddd1').stroke();
    doc.y += 4;
  }

  // 3. Secciones (1..16)
  for (const section of manual.sections) {
    if (section.number === '1' || doc.y > 240) {
      doc.addPage();
    } else {
      doc.y += 18;
    }

    const headingText = `${section.number}. ${section.title}`;
    doc.font(BoldFont).fontSize(18).fillColor('#12344b').text(headingText, MARGIN_X, doc.y, {
      width: CONTENT_W,
    });
    doc.y += 4;
    doc.moveTo(MARGIN_X, doc.y).lineTo(PAGE_W - MARGIN_X, doc.y).lineWidth(1).strokeColor('#4a9fd8').stroke();
    doc.y += 10;

    const lines = section.lines;
    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed === '---' || trimmed === '<div class="page-break"></div>') {
        i += 1;
        continue;
      }
      if (trimmed.startsWith('<div class="footer-brand">')) {
        while (i < lines.length && lines[i].trim() !== '</div>') i += 1;
        i += 1;
        continue;
      }

      const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        const alt = stripInlineMarkdown(imageMatch[1]);
        const relPath = imageMatch[2];
        const absImg = path.join(manualDir, relPath);
        const dims = readPngSize(absImg);
        if (dims.width < 20 || dims.height < 20) {
          throw new Error(`Imagen con dimensiones no razonables: ${relPath}`);
        }
        const maxW = CONTENT_W;
        const maxH = 285;
        const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
        const drawW = Math.round(dims.width * scale);
        const drawH = Math.round(dims.height * scale);
        const captionH = doc.font(ItalicFont).fontSize(8).heightOfString(alt, { width: CONTENT_W });
        ensureSpace(drawH + captionH + 22);

        const imgX = MARGIN_X + (CONTENT_W - drawW) / 2;
        const imgY = doc.y + 4;
        doc.image(absImg, imgX, imgY, { width: drawW, height: drawH });
        doc.save();
        doc.roundedRect(imgX, imgY, drawW, drawH, 3).lineWidth(1).strokeColor('#9ab7c8').stroke();
        doc.restore();
        doc.y = imgY + drawH + 5;
        doc.font(ItalicFont).fontSize(8).fillColor('#5a6a7c').text(alt, MARGIN_X, doc.y, {
          width: CONTENT_W,
          align: 'center',
        });
        doc.y += 8;
        i += 1;
        continue;
      }

      if (/^###\s+/.test(trimmed)) {
        const subTitle = stripInlineMarkdown(trimmed.replace(/^###\s+/, ''));
        ensureSpace(44);
        doc.y += 6;
        doc.font(BoldFont).fontSize(12.5).fillColor('#1a4c6c').text(subTitle, MARGIN_X, doc.y, {
          width: CONTENT_W,
        });
        doc.y += 4;
        i += 1;
        continue;
      }

      if (/^>\s+/.test(trimmed)) {
        const quoteLines = [];
        while (i < lines.length && /^>\s+/.test(lines[i].trim())) {
          quoteLines.push(stripInlineMarkdown(lines[i].trim().replace(/^>\s+/, '')));
          i += 1;
        }
        const quoteText = quoteLines.join('\n');
        doc.font(BodyFont).fontSize(9.5);
        const textH = doc.heightOfString(quoteText, { width: CONTENT_W - 24, lineGap: 2 });
        const boxH = textH + 16;
        ensureSpace(boxH + 10);
        const boxY = doc.y + 2;
        doc.save();
        doc.rect(MARGIN_X, boxY, CONTENT_W, boxH).fill('#edf5fa');
        doc.rect(MARGIN_X, boxY, 4, boxH).fill('#4a9fd8');
        doc.restore();
        doc.font(BodyFont).fontSize(9.5).fillColor('#21324a').text(quoteText, MARGIN_X + 12, boxY + 8, {
          width: CONTENT_W - 24,
          lineGap: 2,
        });
        doc.y = boxY + boxH + 8;
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          const itemText = stripInlineMarkdown(lines[i].trim().replace(/^[-*]\s+/, ''));
          doc.font(BodyFont).fontSize(9.8);
          const itemH = doc.heightOfString(itemText, { width: CONTENT_W - 16, lineGap: 1.5 });
          ensureSpace(itemH + 6);
          const itemY = doc.y;
          doc.font(BoldFont).fontSize(9.8).fillColor('#2c729f').text('•', MARGIN_X + 2, itemY);
          doc.font(BodyFont).fontSize(9.8).fillColor('#142534').text(itemText, MARGIN_X + 14, itemY, {
            width: CONTENT_W - 14,
            lineGap: 1.5,
          });
          doc.y += 3;
          i += 1;
        }
        doc.y += 4;
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        let num = 1;
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          const itemText = stripInlineMarkdown(lines[i].trim().replace(/^\d+\.\s+/, ''));
          doc.font(BodyFont).fontSize(9.8);
          const itemH = doc.heightOfString(itemText, { width: CONTENT_W - 20, lineGap: 1.5 });
          ensureSpace(itemH + 6);
          const itemY = doc.y;
          doc.font(BoldFont).fontSize(9.5).fillColor('#2c729f').text(`${num}.`, MARGIN_X, itemY, { width: 16 });
          doc.font(BodyFont).fontSize(9.8).fillColor('#142534').text(itemText, MARGIN_X + 18, itemY, {
            width: CONTENT_W - 18,
            lineGap: 1.5,
          });
          doc.y += 3;
          num += 1;
          i += 1;
        }
        doc.y += 4;
        continue;
      }

      if (trimmed.startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i += 1;
        }
        const rows = tableLines
          .filter((l) => !/^\|\s*-+/.test(l))
          .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => stripInlineMarkdown(c)));
        if (rows.length > 0) {
          const colCount = rows[0].length;
          const colW = CONTENT_W / colCount;
          const padX = 6;
          const padY = 5;

          const drawRow = (row, isHeader) => {
            doc.font(isHeader ? BoldFont : BodyFont).fontSize(8.6);
            const cellHeights = row.map((cell) =>
              doc.heightOfString(cell, { width: colW - padX * 2, lineGap: 1.2 }),
            );
            const rowH = Math.max(...cellHeights, 12) + padY * 2;
            ensureSpace(rowH + 6);
            const startY = doc.y;
            if (isHeader) {
              doc.save();
              doc.rect(MARGIN_X, startY, CONTENT_W, rowH).fill('#1b5577');
              doc.restore();
            }
            row.forEach((cell, cIdx) => {
              const cellX = MARGIN_X + cIdx * colW;
              doc
                .font(isHeader ? BoldFont : cIdx === 0 ? BoldFont : BodyFont)
                .fontSize(8.6)
                .fillColor(isHeader ? '#ffffff' : '#142534')
                .text(cell, cellX + padX, startY + padY, {
                  width: colW - padX * 2,
                  lineGap: 1.2,
                });
            });
            doc.save();
            doc
              .moveTo(MARGIN_X, startY + rowH)
              .lineTo(MARGIN_X + CONTENT_W, startY + rowH)
              .lineWidth(isHeader ? 1 : 0.5)
              .strokeColor(isHeader ? '#4a9fd8' : '#dfe5e8')
              .stroke();
            doc.restore();
            doc.y = startY + rowH;
          };

          const [head, ...body] = rows;
          drawRow(head, true);
          body.forEach((r) => drawRow(r, false));
          doc.y += 8;
        }
        continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i].trim())) {
        paragraph.push(stripInlineMarkdown(lines[i].trim()));
        i += 1;
      }
      const pText = paragraph.join(' ');
      if (pText) {
        doc.font(BodyFont).fontSize(9.8);
        const pH = doc.heightOfString(pText, { width: CONTENT_W, lineGap: 2 });
        ensureSpace(pH + 6);
        doc.font(BodyFont).fontSize(9.8).fillColor('#142534').text(pText, MARGIN_X, doc.y, {
          width: CONTENT_W,
          lineGap: 2,
        });
        doc.y += 6;
      }
    }
  }

  // Pie de cierre en la última página y numeración en todas las páginas >= 2
  ensureSpace(48);
  doc.y += 12;
  doc.moveTo(MARGIN_X, doc.y).lineTo(PAGE_W - MARGIN_X, doc.y).lineWidth(1).strokeColor('#4a9fd8').stroke();
  doc.y += 8;
  doc.font(BoldFont).fontSize(9.5).fillColor('#12344b').text('Anclora Talent', MARGIN_X, doc.y, {
    width: CONTENT_W,
    align: 'center',
  });
  doc.font(BodyFont).fontSize(8.5).fillColor('#51646f').text(
    'Manual de usuario · Versión 2.0 · Español',
    MARGIN_X,
    doc.y + 2,
    { width: CONTENT_W, align: 'center' },
  );

  if (isFinalPass) {
    const range = doc.bufferedPageRange();
    for (let p = 1; p < range.count; p += 1) {
      doc.switchToPage(p);
      const prevBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const footerY = PAGE_H - 34;
      doc.font(BoldFont).fontSize(7.5).fillColor('#182a4a').text('Anclora Talent', MARGIN_X, footerY, {
        width: CONTENT_W / 2,
        align: 'left',
        lineBreak: false,
      });
      doc.font(BodyFont).fontSize(7.5).fillColor('#182a4a').text(String(p + 1), MARGIN_X + CONTENT_W / 2, footerY, {
        width: CONTENT_W / 2,
        align: 'right',
        lineBreak: false,
      });
      doc.page.margins.bottom = prevBottom;
    }
  }

  doc.end();
  await done;
}

// ─── Numeración de páginas del índice (dos pasadas) ─────────────────────────
function extractSectionPages() {
  const info = execFileSync('pdfinfo', [passPdfPath], { encoding: 'utf8' });
  const pages = Number(info.match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  const map = {};

  for (let p = 1; p <= pages; p += 1) {
    const pageText = execFileSync('pdftotext', ['-f', String(p), '-l', String(p), passPdfPath, '-'], { encoding: 'utf8' })
      .replace(/\s+/g, ' ');
    for (const section of manual.sections) {
      const marker = `${section.number}. ${section.title}`;
      if (!map[section.number] && pageText.includes(marker)) {
        map[section.number] = p;
      }
    }
  }
  return map;
}

function validateFinalPdf(sectionPages) {
  if (!existsSync(outputPath)) throw new Error(`PDF final no generado: ${outputPath}`);
  const info = execFileSync('pdfinfo', [outputPath], { encoding: 'utf8' });
  const pageCount = Number(info.match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  const pageSize = info.match(/Page size:\s+([^\n]+)/)?.[1]?.trim() ?? '';
  const encrypted = info.match(/Encrypted:\s+(.+)/)?.[1]?.trim() ?? '';
  if (!pageCount || pageCount < manual.sections.length + 2) {
    throw new Error(`Número de páginas inesperado: ${pageCount}`);
  }
  if (!/595\.27 x 841\.89|595\.276 x 841\.89|595\.28 x 841\.89|A4/i.test(pageSize)) {
    throw new Error(`El PDF no declara tamaño A4: ${pageSize}`);
  }
  if (!/^no$/i.test(encrypted)) throw new Error(`El PDF aparece cifrado: ${encrypted}`);
  const text = execFileSync('pdftotext', [outputPath, '-'], { encoding: 'utf8' });
  if (text.trim().length < 1000) throw new Error('El PDF no contiene texto extraíble suficiente.');
  for (const section of manual.sections) {
    if (!sectionPages[section.number] || !text.includes(`${section.number}. ${section.title}`)) {
      throw new Error(`El índice o el texto no contiene la sección ${section.number}.`);
    }
  }
  console.log(`PDF A4 validado: ${pageCount} páginas; ${text.length} caracteres extraíbles.`);
}

// ─── Construcción del HTML ──────────────────────────────────────────────────
function buildHtml(sectionPages) {
  const toc = manual.sections.map((section) => {
    const page = sectionPages[section.number] ?? '';
    return `<a class="toc-row" href="#section-${section.number}">
      <span class="toc-num">${section.number.padStart(2, '0')}</span>
      <span class="toc-title">${escapeHtml(section.title)}</span>
      <span class="toc-rule"></span>
      <span class="toc-pageno">${page}</span>
    </a>`;
  }).join('\n');

  const body = manual.sections.map((section) => `
    <section id="section-${section.number}" class="manual-section ${section.number === '1' ? 'major-section' : ''}">
      <h2>${section.number}. ${escapeHtml(section.title)}</h2>
      ${markdownToHtml(section.lines.join('\n'))}
    </section>
  `).join('\n');

  const cover = injectCoverVisual(manual.cover);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<base href="file://${manualDir}/" />
  <title>Anclora Talent - Manual de usuario</title>
<style>${styles()}</style>
</head>
<body>
${cover}
<section class="toc-page">
  <p class="kicker">Manual de Usuario</p>
  <h1>Índice</h1>
  <p class="toc-intro">Una guía ordenada para crear, editar, revisar y exportar un proyecto editorial.</p>
  <nav class="toc-list">${toc}</nav>
</section>
${body}
</body>
</html>`;
}

// ─── Motivo editorial de portada (documento y páginas, no funcional) ──────
function injectCoverVisual(coverHtml) {
  const lines = Array.from({ length: 8 }, (_, row) =>
    `<div class="cover-line-row">${Array.from({ length: 5 }, (_, col) =>
      `<span class="cover-line cover-line-${(row + col) % 3}"></span>`).join('')}</div>`).join('');
  const visual = `<div class="cover-editorial-visual" aria-hidden="true">
  <div class="cover-sheet cover-sheet-back"></div>
  <div class="cover-sheet cover-sheet-front"><div class="cover-sheet-heading">TALENT</div>${lines}</div>
</div>`;
  return coverHtml.replace('<div class="cover-disclaimer">', `${visual}\n<div class="cover-disclaimer">`);
}

// ─── Conversor Markdown → HTML (mínimo, propio del manual) ─────────────────
function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed === '---' || trimmed === '<div class="page-break"></div>') {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('<div class="footer-brand">')) {
      while (i < lines.length) {
        if (lines[i].trim() === '</div>') break;
        i += 1;
      }
      i += 1;
      continue;
    }

    const image = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (image) {
      const src = dataUriForImage(image[2]);
      const alt = image[1];
      html += `<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
      i += 1;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      html += `<h3>${inline(trimmed.replace(/^###\s+/, ''))}</h3>`;
      i += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quote = [];
      while (i < lines.length && /^>\s+/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s+/, ''));
        i += 1;
      }
      html += `<blockquote>${quote.map(inline).join('<br>')}</blockquote>`;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      html += `<ul>${items.join('')}</ul>`;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      html += `<ol>${items.join('')}</ol>`;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      html += tableToHtml(tableLines);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html += `<p>${inline(paragraph.join(' '))}</p>`;
  }

  return html;
}

function isBlockStart(line) {
  return /^###\s+/.test(line)
    || /^!\[/.test(line)
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || /^>\s+/.test(line)
    || line.startsWith('|')
    || line === '---'
    || line === '<div class="page-break"></div>'
    || line.startsWith('<div class="footer-brand">');
}

function tableToHtml(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-+/.test(line))
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  if (rows.length === 0) return '';
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

// ─── Estilos (paleta real de Anclora Talent) ────────────────────────────────
function styles() {
  return `
@font-face { font-family: "DM Sans"; src: url(data:font/woff2;base64,${readFileSync(path.join(root, 'src/app/fonts/dm-sans-latin.woff2')).toString('base64')}) format('woff2'); font-weight: 100 1000; }
/* El margen de página real lo controla la opción "margin" de
   page.pdf() (20mm/18mm/18mm/18mm), no una regla @page — evita el
   conflicto entre ambos mecanismos en Chromium. */
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #142534;
  background: #fff;
  font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 10.3pt;
  line-height: 1.48;
}
a { color: inherit; text-decoration: none; }

/* ─── PORTADA ─────────────────────────────────────────────────────────────── */
.cover-page {
  width: 100%;
  min-height: 253mm;
  margin: 0;
  padding: 22mm 22mm 20mm;
  color: #edf2f8;
  background:
    radial-gradient(ellipse 92% 58% at 70% 24%, rgba(74, 159, 216, 0.28) 0%, transparent 70%),
    linear-gradient(145deg, #0c141e 0%, #102638 58%, #0b313f 100%);
  page-break-after: always;
  position: relative;
  overflow: hidden;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cover-page::before {
  content: "";
  position: absolute;
  inset: 8mm 8mm;
  border: 1px solid rgba(74, 159, 216, 0.55);
  border-radius: 1.5mm;
  pointer-events: none;
  z-index: 2;
}
.cover-page::after {
  content: "";
  position: absolute;
  right: -20mm;
  bottom: -26mm;
  width: 110mm;
  height: 110mm;
  border: 1px solid rgba(192, 120, 96, 0.22);
  border-radius: 50%;
  z-index: 0;
}
.cover-logo, .cover-brand, .cover-title, .cover-subtitle, .cover-meta, .cover-disclaimer {
  position: relative;
  z-index: 3;
}
.cover-logo { display: flex; justify-content: center; }
.cover-logo img {
  width: 34mm;
  height: auto;
  margin-bottom: 10mm;
  filter: drop-shadow(0 4mm 12mm rgba(74, 159, 216, 0.25)) drop-shadow(0 6mm 14mm rgba(0, 0, 0, 0.5));
}
.cover-brand {
  color: #8fc8ee;
  font-size: 12pt;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.cover-brand::after {
  content: "";
  display: block;
  width: 40mm;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(74, 159, 216, 0.85), transparent);
  margin: 4.5mm auto 0;
}
.cover-title {
  margin: 4mm auto 0;
  max-width: 150mm;
  font-family: "DM Sans", Georgia, "Times New Roman", serif;
  font-size: 42pt;
  line-height: 1.0;
  font-weight: 600;
  color: #f4f8fb;
  text-shadow: none;
}
.cover-subtitle {
  margin: 7mm auto 0;
  max-width: 128mm;
  color: #c6d9e8;
  font-size: 14.5pt;
  line-height: 1.32;
}
.cover-meta { display: flex; justify-content: center; gap: 7mm; margin-top: 13mm; color: #092033; font-size: 9.5pt; font-weight: 700; background: transparent; }
.cover-meta div {
  min-width: 40mm;
  padding: 3mm 6mm;
  background: #4a9fd8;
  border-radius: 999px;
  box-shadow: none;
  filter: none;
  opacity: 1;
  letter-spacing: 0.03em;
}
.cover-disclaimer {
  position: absolute;
  left: 16mm; right: 16mm; bottom: 16mm;
  color: #9db9cb;
  font-size: 8pt;
  text-align: center;
  line-height: 1.4;
  z-index: 3;
}

/* Motivo editorial abstracto: hojas y líneas de composición. */
.cover-editorial-visual {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.28;
  pointer-events: none;
}
.cover-sheet {
  position: absolute;
  width: 100mm;
  height: 137mm;
  top: 89mm;
  left: 50%;
  border: 1px solid rgba(143, 200, 238, 0.45);
  border-radius: 2mm;
  transform: rotate(-11deg) translateX(-58%);
  background: rgba(7, 19, 31, 0.4);
}
.cover-sheet-back {
  transform: rotate(10deg) translateX(-42%);
  background: rgba(74, 159, 216, 0.09);
}
.cover-sheet-front {
  padding: 15mm 10mm;
}
.cover-sheet-heading {
  color: #b7ddf5;
  font-size: 8pt;
  letter-spacing: 0.28em;
  margin-bottom: 12mm;
}
.cover-line-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2mm;
  margin: 4mm 0;
}
.cover-line {
  display: block;
  height: 2mm;
  border-radius: 999px;
  background: #4a9fd8;
}
.cover-line-1 { background: #c07860; }
.cover-line-2 { width: 65%; background: #9acff0; }

/* ─── ÍNDICE ──────────────────────────────────────────────────────────────── */
.toc-page { page-break-after: always; }
.kicker { color: #2c729f; font-size: 8pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.toc-page h1 { margin: 0 0 2mm; color: #12344b; font-family: "DM Sans", Georgia, serif; font-size: 24pt; font-weight: 800; }
.toc-intro { width: 130mm; margin-bottom: 3.5mm; color: #536b7b; font-size: 9.5pt; line-height: 1.35; }
.toc-list { border-top: 1px solid #4a9fd8; }
.toc-row {
  display: grid;
  grid-template-columns: 11mm auto 1fr 10mm;
  align-items: baseline;
  gap: 2.5mm;
  min-height: 3.8mm;
  padding: 0.65mm 0;
  border-bottom: 1px solid #e4ddd1;
  color: #12344b;
}
.toc-num { color: #2c729f; font-size: 7.5pt; font-weight: 800; letter-spacing: 0.08em; }
.toc-title { font-family: "DM Sans", Georgia, serif; font-size: 9.8pt; }
.toc-rule { border-bottom: 1px dotted #b8c0c5; transform: translateY(-1.2mm); }
.toc-pageno { color: #12344b; font-size: 9.5pt; font-weight: 800; text-align: right; }

/* ─── SECCIONES ───────────────────────────────────────────────────────────── */
.manual-section { margin-top: 9mm; }
.major-section { break-before: page; margin-top: 0; }
.manual-section h2 {
  margin: 0 0 4mm;
  padding: 0 0 4mm;
  color: #12344b;
  border-bottom: 1px solid #4a9fd8;
  font-family: "DM Sans", Georgia, serif;
  font-size: 21pt;
  line-height: 1.1;
  font-weight: 600;
}
h2, h3 { break-after: avoid-page; }
p { orphans: 3; widows: 3; }
h3 { margin: 5mm 0 2.5mm; color: #1a4c6c; font-size: 13pt; line-height: 1.2; }
p { margin: 0 0 3.6mm; }
strong { color: #0b314f; font-weight: 800; }
ul, ol { margin: 1mm 0 4mm 6mm; padding-left: 4mm; }
li { margin: 1.4mm 0; }
table { width: 100%; margin: 4mm 0 6mm; border-collapse: collapse; font-size: 9pt; }
th { color: #fff; background: #1b5577; border-top: 1px solid #4a9fd8; border-bottom: 1px solid #4a9fd8; font-weight: 800; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { word-break: normal; overflow-wrap: normal; }
td, th { overflow-wrap: break-word; padding: 2mm 3mm; border-bottom: 1px solid #dfe5e8; vertical-align: top; }
td:first-child, th:first-child { border-left: 1px solid #e7ecef; }
td:last-child, th:last-child { border-right: 1px solid #e7ecef; }
blockquote {
  margin: 5mm 0; padding: 4mm 5mm; color: #21324a;
  background: #edf5fa; border-left: 2mm solid #4a9fd8; page-break-inside: avoid;
}

/* ─── IMÁGENES ────────────────────────────────────────────────────────────── */
figure { margin: 4mm 0 5mm; page-break-inside: avoid; }
figure img {
  display: block; width: auto; max-width: 100%; max-height: 105mm; height: auto; margin: 0 auto; border-radius: 2mm;
  border: 1.5px solid #9ab7c8;
  box-shadow: none;
}
figcaption { margin-top: 1.8mm; padding: 0 1mm; color: #5a6a7c; font-size: 8pt; line-height: 1.35; }

/* ─── PIE (footer estampado por Playwright) ─────────────────────────────── */
.footer-brand {
  margin-top: 14mm; padding-top: 5mm;
  border-top: 1px solid #4a9fd8;
  color: #51646f; text-align: center;
}
`;
}
