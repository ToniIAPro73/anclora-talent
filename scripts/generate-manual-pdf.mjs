/**
 * Genera el PDF del manual de usuario de Anclora Talent (español).
 *
 * Uso: node scripts/generate-manual-pdf.mjs
 * Salida: public/manuals/anclora-talent-manual-usuario-es.pdf
 *
 * Requiere: Chromium de Playwright + poppler (pdfinfo, pdftotext) para
 * calcular la numeración de páginas del índice.
 *
 * Renderiza en dos pasadas: la primera para averiguar en qué página
 * empieza cada sección (vía pdftotext), la segunda ya con el índice
 * completo y la numeración de página estampada en cada página (footer
 * de Playwright).
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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

const browser = await chromium.launch({ headless: true });

await renderPdf({});
const sectionPages = extractSectionPages();
await renderPdf(sectionPages);
validateFinalPdf(sectionPages);

await browser.close();
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
  if (!/595\.27 x 841\.89|595\.276 x 841\.89|A4/i.test(pageSize)) {
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
  margin-top: 14mm; padding-top: 5mm; border-top: 1px solid #4a9fd8;
  color: #51646f; text-align: center;
}
`;
}
