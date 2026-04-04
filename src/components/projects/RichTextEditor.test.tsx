import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

// Tiptap uses ProseMirror which requires a real browser context unavailable in jsdom.
// We stub the module to test only the shell and toolbar.
vi.mock('@tiptap/react', () => {
  const mockEditor = {
    chain: () => ({ focus: () => ({ toggleBold: () => ({ run: vi.fn() }), toggleItalic: () => ({ run: vi.fn() }), toggleHeading: () => ({ run: vi.fn() }), toggleBlockquote: () => ({ run: vi.fn() }), toggleBulletList: () => ({ run: vi.fn() }), toggleOrderedList: () => ({ run: vi.fn() }), undo: () => ({ run: vi.fn() }), redo: () => ({ run: vi.fn() }) }) }),
    isActive: () => false,
    can: () => ({ undo: () => true, redo: () => false }),
    getHTML: () => '<p></p>',
  };
  return {
    useEditor: () => mockEditor,
    EditorContent: ({ editor }: { editor: unknown }) =>
      editor ? <div data-testid="tiptap-content" /> : null,
  };
});

import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  test('renders the editor container and toolbar', () => {
    render(<RichTextEditor defaultContent="<p>Hello</p>" onUpdate={vi.fn()} />);
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('tiptap-content')).toBeInTheDocument();
  });

  test('renders all toolbar buttons', () => {
    render(<RichTextEditor defaultContent="" onUpdate={vi.fn()} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Heading')).toBeInTheDocument();
    expect(screen.getByTitle('Quote')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet list')).toBeInTheDocument();
    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });
});
