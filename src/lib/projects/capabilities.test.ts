import { describe, expect, test } from 'vitest';
import { getProjectCapabilities } from './capabilities';
import type { ProjectRecord } from './types';

function baseProject(sourceMode?: 'editable' | 'fixed-pdf'): ProjectRecord {
  return {
    id: 'p1',
    userId: 'u1',
    workspaceId: null,
    slug: 'proyecto',
    title: 'Proyecto',
    status: 'draft',
    createdAt: '',
    updatedAt: '',
    document: {
      id: 'd1',
      title: 'Proyecto',
      subtitle: '',
      author: '',
      language: 'es',
      chapters: [],
      source: sourceMode ? { fileName: 'a.pdf', mimeType: 'application/pdf', importedAt: '', mode: sourceMode } : null,
    },
    cover: {} as ProjectRecord['cover'],
    backCover: {} as ProjectRecord['backCover'],
    assets: [],
  };
}

describe('getProjectCapabilities', () => {
  test('fixed-pdf: reflowable exports and editing are disabled, original PDF and editable-copy creation are enabled', () => {
    const capabilities = getProjectCapabilities(baseProject('fixed-pdf'));

    expect(capabilities.canEditContent).toBe(false);
    expect(capabilities.canEditCover).toBe(false);
    expect(capabilities.canCompose).toBe(false);
    expect(capabilities.canExportDocx).toBe(false);
    expect(capabilities.canExportEpub).toBe(false);
    expect(capabilities.canExportHtml).toBe(false);
    expect(capabilities.canExportMarkdown).toBe(false);
    expect(capabilities.canExportOriginalPdf).toBe(true);
    expect(capabilities.canGenerateCommercialAssets).toBe(true);
    expect(capabilities.canGenerateLaunchPack).toBe(true);
    expect(capabilities.canCreateEditableCopy).toBe(true);
  });

  test('editable (including undefined/legacy mode): reflowable exports and editing are enabled', () => {
    for (const project of [baseProject('editable'), baseProject(undefined)]) {
      const capabilities = getProjectCapabilities(project);

      expect(capabilities.canEditContent).toBe(true);
      expect(capabilities.canEditCover).toBe(true);
      expect(capabilities.canCompose).toBe(true);
      expect(capabilities.canExportDocx).toBe(true);
      expect(capabilities.canExportEpub).toBe(true);
      expect(capabilities.canExportHtml).toBe(true);
      expect(capabilities.canExportMarkdown).toBe(true);
      expect(capabilities.canExportOriginalPdf).toBe(true);
      expect(capabilities.canCreateEditableCopy).toBe(false);
    }
  });
});
