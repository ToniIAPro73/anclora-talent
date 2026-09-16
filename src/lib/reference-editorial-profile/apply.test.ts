import { describe, expect, test } from 'vitest';
import { createProjectRecord } from '@/lib/projects/factories';
import { applyReferenceEditorialProfileToProject } from './apply';
import type { ReferenceEditorialProfile } from './model';

const profile = {
  version: 1,
  profileType: 'editorial',
  source: { sourceAssetId: null, format: 'pdf', filename: 'reference.pdf', hash: null, analysedAt: '2026-01-01', parserVersion: 'test' },
  page: { width: 595, height: 842, unit: 'pt', orientation: 'portrait', margins: { top: 72, right: 72, bottom: 72, left: 72 }, contentWidth: 451, contentHeight: 698, columns: 1, gutter: 0 },
  body: { fontFamily: 'Garamond Pro', resolvedFontFamily: 'EB Garamond', fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', color: '#222', lineHeight: 1.45, textAlign: 'justify', firstLineIndent: 18, paragraphSpacingBefore: 0, paragraphSpacingAfter: 8 },
  headings: { h1: null, h2: null, h3: null, h4: null }, chapterOpening: { detected: false, labelStyle: null, titleStyle: null, subtitleStyle: null, alignment: 'unknown', spacingBefore: null, spacingAfter: null, pageBreakBefore: null, startOnOddPage: null }, quote: null, lists: { unordered: null, ordered: null }, captions: null, header: { enabled: false, position: 'top', style: null, alignment: 'unknown' }, footer: { enabled: false, position: 'bottom', style: null, alignment: 'unknown' }, pageNumber: { enabled: false, position: 'footer', style: null, alignment: 'unknown' }, toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: null }, separators: null, palette: [], confidence: { overall: 'high', pageGeometry: 'high', bodyTypography: 'high', headings: 'unknown', chapterOpening: 'unknown', headers: 'unknown', footers: 'unknown', toc: 'unknown' }, observedStructure: { optional: true, frontMatter: false, chapterCount: 10, headingDepth: 1, backMatter: false },
} satisfies ReferenceEditorialProfile;

describe('reference profile application', () => {
  test('changes composition but preserves manuscript chapter structure', () => {
    const project = createProjectRecord('user', { title: 'Target' });
    const target = { ...project, document: { ...project.document, chapters: Array.from({ length: 5 }, (_, index) => ({ ...project.document.chapters[0], id: `chapter-${index}`, order: index + 1 })) } };
    const applied = applyReferenceEditorialProfileToProject(target, profile);
    expect(applied.document.chapters).toHaveLength(5);
    expect(applied.document.metadata?.composition?.fontSizePt).toBe(11);
    expect(JSON.stringify(applied)).not.toContain('Neutral body sample');
  });

  test('explicit current composition values win over reference values', () => {
    const project = createProjectRecord('user', { title: 'Target' });
    const target = { ...project, document: { ...project.document, metadata: { title: 'Target', composition: { fontSizePt: 12 } } } };
    const applied = applyReferenceEditorialProfileToProject(target, profile);
    expect(applied.document.metadata?.composition?.fontSizePt).toBe(12);
  });
});
