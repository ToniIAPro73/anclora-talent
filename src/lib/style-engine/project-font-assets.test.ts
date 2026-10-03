import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractDocxProjectFontAssets, extractOdtProjectFontAssets } from './project-font-assets';

describe('project-scoped embedded font assets', () => {
  it('detects, de-obfuscates, validates and hashes a real OOXML embedded font', async () => {
    const bytes = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/anclora-talent-embedded-font.docx'));
    const assets = await extractDocxProjectFontAssets(bytes);
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      sourceFamily: 'Anclora QA Serif',
      variant: 'regular',
      origin: 'docx-embedded',
      validation: 'valid',
      permission: 'installable',
      usable: true,
    });
    expect(assets[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(assets[0].dataBase64).toBeTruthy();
  });

  it('does not invent a project asset for a reference-only DOCX font', async () => {
    const bytes = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/anclora-talent-missing-font.docx'));
    expect(await extractDocxProjectFontAssets(bytes)).toEqual([]);
  });

  it('treats an ODT font-face without a binary href as a reference only', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" xmlns:style="urn:s"><style:font-face style:name="Reference Only"/></office:document-styles>');
    expect(await extractOdtProjectFontAssets(await zip.generateAsync({ type: 'nodebuffer' }))).toEqual([]);
  });

  it('extracts an ODT font asset only when the declared binary is present', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" xmlns:style="urn:s" xmlns:svg="urn:svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style:font-face style:name="ODT QA Serif" svg:font-family="ODT QA Serif" xlink:href="Fonts/font.ttf"/></office:document-styles>');
    zip.file('Fonts/font.ttf', fs.readFileSync(path.resolve(process.cwd(), 'src/app/styles/fonts/Inter_18pt-Regular.ttf')));
    const assets = await extractOdtProjectFontAssets(await zip.generateAsync({ type: 'nodebuffer' }));
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ sourceFamily: 'ODT QA Serif', origin: 'odt-embedded', validation: 'valid', usable: true });
  });
});
