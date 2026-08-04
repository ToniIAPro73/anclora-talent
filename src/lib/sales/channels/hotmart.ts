/**
 * Hotmart sales channel (F4) — manual export package.
 *
 * DECISION (API reality wins): Hotmart has NO public product-creation API
 * comparable to Gumroad's `POST /v2/products`. Its public API
 * (developers.hotmart.com) covers sales history, subscriptions, coupons and
 * webhooks behind OAuth — product registration happens only in the Hotmart
 * dashboard. So this channel produces a ready-to-upload export package
 * (product sheet + landing copy + structured JSON + assets references +
 * AI disclosure) instead of a push; the seller completes the manual upload
 * following the included checklist. If Hotmart ships a product CRUD API,
 * this module is the seam to replace with a push client.
 *
 * Pure module: builds the package from the launch kit, no I/O. The UI zips
 * the files client-side (jszip) or downloads them individually.
 */

import type { KitLocale, LaunchKit } from '../launch-kit';

export interface HotmartExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

export interface HotmartExportPackage {
  channel: 'hotmart';
  /** Human-readable upload checklist (localized). */
  instructions: string[];
  files: HotmartExportFile[];
}

const INSTRUCTIONS: Record<KitLocale, string[]> = {
  es: [
    'Entra en Hotmart → Productos → Registrar producto y elige el formato «ebook».',
    'Copia el nombre, la descripción y las palabras clave desde ficha-producto.md.',
    'Sube los archivos EPUB/PDF referenciados en producto.hotmart.json (assets).',
    'Pega el copy de copy-landing.md en la página de ventas (o tu landing propia).',
    'Si el libro incluye contenido con asistencia de IA, conserva disclosure-ia.txt como constancia interna.',
  ],
  en: [
    'Go to Hotmart → Products → Register product and choose the "ebook" format.',
    'Copy the name, description and keywords from ficha-producto.md.',
    'Upload the EPUB/PDF files referenced in producto.hotmart.json (assets).',
    'Paste the copy from copy-landing.md into the sales page (or your own landing).',
    'If the book includes AI-assisted content, keep disclosure-ia.txt as internal record.',
  ],
};

function productSheetMarkdown(kit: LaunchKit, locale: KitLocale): string {
  const { sheet } = kit;
  const labels =
    locale === 'en'
      ? { title: 'Title', subtitle: 'Subtitle', author: 'Author', isbn: 'ISBN', keywords: 'Keywords', language: 'Language', description: 'Description', bullets: 'What you will find', draftNote: '> Draft derived from the first chapter — review before publishing.' }
      : { title: 'Título', subtitle: 'Subtítulo', author: 'Autor/a', isbn: 'ISBN', keywords: 'Palabras clave', language: 'Idioma', description: 'Descripción', bullets: 'Qué encontrarás', draftNote: '> Borrador derivado del primer capítulo — revísalo antes de publicar.' };

  const lines: string[] = [`# ${labels.title}: ${sheet.title}`, ''];
  if (sheet.subtitle) lines.push(`**${labels.subtitle}:** ${sheet.subtitle}`);
  if (sheet.author) lines.push(`**${labels.author}:** ${sheet.author}`);
  if (sheet.isbn) lines.push(`**${labels.isbn}:** ${sheet.isbn}`);
  if (sheet.keywords.length > 0) lines.push(`**${labels.keywords}:** ${sheet.keywords.join(', ')}`);
  if (sheet.language) lines.push(`**${labels.language}:** ${sheet.language}`);
  lines.push('', `## ${labels.description}`, '');
  if (sheet.descriptionIsDraft) lines.push(labels.draftNote, '');
  lines.push(sheet.longDescription, '');
  if (sheet.bullets.length > 0) {
    lines.push(`## ${labels.bullets}`, '');
    for (const bullet of sheet.bullets) lines.push(`- ${bullet}`);
    lines.push('');
  }
  return lines.join('\n');
}

function landingCopyMarkdown(kit: LaunchKit, locale: KitLocale): string {
  const { landing } = kit;
  const labels =
    locale === 'en'
      ? { headline: 'Headline', subheadline: 'Subheadline', benefits: 'Benefits', cta: 'CTA' }
      : { headline: 'Titular', subheadline: 'Subtítulo', benefits: 'Beneficios', cta: 'CTA' };

  const lines: string[] = [`# ${labels.headline}`, '', landing.headline, ''];
  if (landing.subheadline) lines.push(`**${labels.subheadline}:** ${landing.subheadline}`, '');
  if (landing.benefitBullets.length > 0) {
    lines.push(`## ${labels.benefits}`, '');
    for (const bullet of landing.benefitBullets) lines.push(`- ${bullet}`);
    lines.push('');
  }
  lines.push(`**${labels.cta}:** ${landing.cta}`, '');
  return lines.join('\n');
}

/**
 * Builds the Hotmart manual-upload package from the launch kit.
 * `locale` follows the document language (CTA/copy stay in the book's own
 * language; the checklist follows the UI locale when provided).
 */
export function buildHotmartExportPackage(
  kit: LaunchKit,
  options: { locale?: KitLocale } = {},
): HotmartExportPackage {
  const locale: KitLocale =
    options.locale ?? (kit.sheet.language?.toLowerCase().startsWith('en') ? 'en' : 'es');

  const structured = {
    channel: 'hotmart',
    format: 'ebook',
    title: kit.sheet.title,
    subtitle: kit.sheet.subtitle,
    author: kit.sheet.author,
    isbn: kit.sheet.isbn,
    keywords: kit.sheet.keywords,
    language: kit.sheet.language,
    description: kit.sheet.longDescription,
    descriptionIsDraft: kit.sheet.descriptionIsDraft,
    bullets: kit.sheet.bullets,
    assets: kit.assets,
    aiDisclosure: kit.aiDisclosure,
  };

  const files: HotmartExportFile[] = [
    {
      filename: 'ficha-producto.md',
      mimeType: 'text/markdown',
      content: productSheetMarkdown(kit, locale),
    },
    {
      filename: 'copy-landing.md',
      mimeType: 'text/markdown',
      content: landingCopyMarkdown(kit, locale),
    },
    {
      filename: 'producto.hotmart.json',
      mimeType: 'application/json',
      content: JSON.stringify(structured, null, 2),
    },
  ];

  if (kit.aiDisclosure) {
    files.push({
      filename: 'disclosure-ia.txt',
      mimeType: 'text/plain',
      content: kit.aiDisclosure,
    });
  }

  return { channel: 'hotmart', instructions: INSTRUCTIONS[locale], files };
}
