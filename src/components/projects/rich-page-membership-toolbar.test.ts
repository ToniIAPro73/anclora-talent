import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
const editor = readFileSync(resolve(root, 'src/components/projects/AdvancedRichTextEditor.tsx'), 'utf8');

describe('rich page membership and compact toolbar contracts', () => {
  it('keeps canonical toolbar groups semantic without rendering group labels', () => {
    expect(editor).toContain('data-toolbar-group="view"');
    expect(css).toContain('content: none;');
    expect(css).not.toContain('content: attr(data-toolbar-group);');
  });

  it('keeps the full editing command surface and uses a compact font selector', () => {
    for (const testId of [
      'editor-toolbar-device-mobile-button',
      'editor-toolbar-device-tablet-button',
      'editor-toolbar-device-desktop-button',
      'editor-toolbar-single-page-button',
      'editor-toolbar-double-page-button',
      'editor-toolbar-font-family-button',
      'editor-toolbar-font-size-button',
      'editor-toolbar-text-color-button',
      'editor-toolbar-bold-button',
      'editor-toolbar-italic-button',
      'editor-toolbar-strikethrough-button',
      'editor-toolbar-align-left-button',
      'editor-toolbar-heading-6-button',
      'editor-toolbar-insert-image-button',
      'editor-toolbar-insert-page-break-button',
      'editor-toolbar-undo-button',
      'editor-toolbar-redo-button',
    ]) {
      expect(editor).toContain(testId);
    }
    expect(css).toContain('width: clamp(132px, 14vw, 170px);');
    expect(css).toContain('max-width: 170px;');
    expect(css).toContain('text-overflow: ellipsis;');
    expect(css).toContain('overflow-x: hidden;');
  });
});
