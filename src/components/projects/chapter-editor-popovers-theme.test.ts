import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Chapter Editor Popovers Light-Mode Theme Remediation', () => {
  const root = process.cwd();

  const editorPopoverCode = readFileSync(
    resolve(root, 'src/components/projects/EditorPopover.tsx'),
    'utf8'
  );
  const advancedEditorCode = readFileSync(
    resolve(root, 'src/components/projects/AdvancedRichTextEditor.tsx'),
    'utf8'
  );
  const marginSelectorCode = readFileSync(
    resolve(root, 'src/components/projects/MarginSelector.tsx'),
    'utf8'
  );
  const globalsCssCode = readFileSync(
    resolve(root, 'src/app/globals.css'),
    'utf8'
  );

  test('no editor popover component contains hardcoded #0E1825 dark background', () => {
    expect(editorPopoverCode).not.toContain('#0E1825');
    expect(marginSelectorCode).not.toContain('#0E1825');
    expect(advancedEditorCode).not.toContain('#0E1825');
  });

  test('no editor popover component contains hardcoded shadow-black', () => {
    expect(editorPopoverCode).not.toContain('shadow-black');
    expect(marginSelectorCode).not.toContain('shadow-black');
    expect(advancedEditorCode).not.toContain('shadow-black');
  });

  test('EditorPopover uses semantic surface-panel and text-primary tokens', () => {
    expect(editorPopoverCode).toContain('bg-[var(--surface-panel)]');
    expect(editorPopoverCode).toContain('text-[var(--text-primary)]');
    expect(editorPopoverCode).toContain('border-[var(--border-strong)]');
    expect(editorPopoverCode).toContain('shadow-[var(--shadow-lg)]');
  });

  test('ListDropdownButton popover uses semantic surface-panel and text-primary tokens', () => {
    expect(advancedEditorCode).toContain('ListDropdownButton');
    expect(advancedEditorCode).toContain('bg-[var(--surface-panel)]');
    expect(advancedEditorCode).toContain('text-[var(--text-primary)]');
    expect(advancedEditorCode).toContain('border-[var(--border-strong)]');
    expect(advancedEditorCode).toContain('shadow-[var(--shadow-lg)]');
  });

  test('AdvancedFontSelector search input and options use semantic theme tokens', () => {
    expect(advancedEditorCode).toContain('editor-toolbar-font-search-input');
    expect(advancedEditorCode).toContain('bg-[var(--surface-elevated)]');
    expect(advancedEditorCode).toContain('font-option-default');
    expect(advancedEditorCode).toContain('text-[var(--text-primary)]');
  });

  test('ColorSelector palette and swatches use semantic theme tokens without hardcoded white border', () => {
    expect(advancedEditorCode).toContain('editor-toolbar-text-color-button');
    expect(advancedEditorCode).not.toContain('border-white/20');
    expect(advancedEditorCode).toContain('border-[var(--border-strong)]');
    expect(advancedEditorCode).toContain('bg-[var(--surface-elevated)]');
  });

  test('MarginSelector uses semantic surface tokens and custom-scrollbar', () => {
    expect(marginSelectorCode).toContain('bg-[var(--surface-panel)]');
    expect(marginSelectorCode).toContain('text-[var(--text-primary)]');
    expect(marginSelectorCode).toContain('shadow-[var(--shadow-lg)]');
    expect(marginSelectorCode).toContain('custom-scrollbar');
    expect(marginSelectorCode).toContain('bg-[var(--surface-elevated)]');
  });

  test('globals.css defines .custom-scrollbar with theme-aware border variables', () => {
    expect(globalsCssCode).toContain('.custom-scrollbar');
    expect(globalsCssCode).toContain('scrollbar-color: var(--border-default) transparent');
    expect(globalsCssCode).toContain('var(--border-strong)');
  });

  test('Editor status bar uses semantic surface-panel token', () => {
    expect(advancedEditorCode).toContain('bg-[var(--surface-panel)]');
    expect(advancedEditorCode).toContain('border-[var(--border-subtle)]');
  });
});
