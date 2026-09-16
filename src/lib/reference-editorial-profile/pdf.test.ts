import { describe, expect, test } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractEditorialProfileFromPdf } from './pdf';

describe('editorial profile PDF extraction', () => {
  test('extracts layout evidence without returning source prose', async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.TimesRoman);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
      const page = document.addPage([595, 842]);
      page.drawText('Chapter label', { x: 180, y: 700, size: 24, font: bold, color: rgb(0.05, 0.1, 0.16) });
      page.drawText('Neutral body sample.', { x: 72, y: 650, size: 11, font, color: rgb(0.13, 0.13, 0.13) });
      page.drawText(String(pageNumber), { x: 292, y: 24, size: 9, font });
    }
    const result = await extractEditorialProfileFromPdf(Buffer.from(await document.save()), {
      filename: 'fixture.pdf',
      format: 'pdf',
    });
    expect(result.profile.page.width).toBeGreaterThan(500);
    expect(result.profile.body.fontSize).toBeGreaterThan(0);
    expect(result.profile.chapterOpening.detected).toBe(true);
    expect(result.profile.pageNumber.enabled).toBe(true);
    expect(JSON.stringify(result.profile)).not.toContain('Neutral body sample');
    expect(result.analysis.pagesAnalysed).toBe(3);
  });
});
