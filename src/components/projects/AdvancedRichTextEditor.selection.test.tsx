import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

type MockSelection = {
  empty: boolean;
  from: number;
  to: number;
  $from: {
    parent: { textContent: string };
    parentOffset: number;
    start: () => number;
  };
};

const useEditorMock = vi.fn();
const textSelectionCreateMock = vi.fn((_: unknown, from: number, to?: number) => ({
  from,
  to: to ?? from,
}));

vi.mock('@tiptap/react', () => ({
  useEditor: (options: unknown) => useEditorMock(options),
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div data-testid="advanced-tiptap-content" /> : null,
}));

vi.mock('@tiptap/pm/state', () => ({
  TextSelection: {
    create: (...args: [unknown, number, number]) => textSelectionCreateMock(...args),
  },
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-character-count', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-text-style', () => ({
  TextStyle: {},
}));

vi.mock('@tiptap/extension-font-family', () => ({
  default: {},
}));

vi.mock('@tiptap/extension-text-align', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-color', () => ({
  Color: {},
}));

vi.mock('./resizable-image-extension', () => ({
  ResizableImage: { configure: vi.fn(() => ({})) },
}));

vi.mock('./page-break-extension', () => ({
  PageBreak: {},
}));

vi.mock('./font-size-extension', () => ({
  FontSize: {},
}));

vi.mock('./MarginSelector', () => ({
  MarginSelector: () => <div data-testid="margin-selector" />,
}));

vi.mock('@/hooks/use-google-fonts', () => ({
  useGoogleFonts: () => ({
    fonts: [{ family: 'Inter' }],
    loadFont: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-editor-preferences', () => ({
  useEditorPreferences: () => ({
    preferences: {
      device: 'desktop',
      margins: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      fontSize: '16px',
    },
    isLoaded: true,
    setPreferences: vi.fn(),
    resetPreferences: vi.fn(),
  }),
}));

vi.mock('@/lib/projects/page-calculator', () => ({
  calculateWordsPerPage: vi.fn(() => 250),
  MARGIN_PRESETS: {
    normal: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
  },
}));

import { AdvancedRichTextEditor } from './AdvancedRichTextEditor';

function createSelection(text: string, parentOffset: number, start = 1): MockSelection {
  const position = start + parentOffset;
  return {
    empty: true,
    from: position,
    to: position,
    $from: {
      parent: { textContent: text },
      parentOffset,
      start: () => start,
    },
  };
}

function createMockEditor(selection: MockSelection) {
  const dispatchCalls: Array<{ from: number; to: number }> = [];
  const commandSelections: Array<{ from: number; to: number; empty: boolean }> = [];
  let currentSelection = selection;

  const state = {
    doc: { type: 'doc' },
    selection: currentSelection,
    tr: {
      setSelection(nextSelection: { from: number; to: number }) {
        return { selection: nextSelection };
      },
    },
  };

  const view = {
    dispatch(transaction: { selection: { from: number; to: number } }) {
      dispatchCalls.push(transaction.selection);
      currentSelection = {
        empty: transaction.selection.from === transaction.selection.to,
        from: transaction.selection.from,
        to: transaction.selection.to,
        $from: selection.$from,
      };
      state.selection = currentSelection;
    },
  };

  const chain = {
    focus: () => chain,
    toggleBold: () => ({
      run: () => {
        commandSelections.push({
          from: state.selection.from,
          to: state.selection.to,
          empty: state.selection.empty,
        });
        return true;
      },
    }),
    toggleItalic: () => ({ run: () => true }),
    toggleStrike: () => ({ run: () => true }),
    setFontFamily: () => ({ run: () => true }),
    unsetFontFamily: () => ({ run: () => true }),
    setFontSize: () => ({ run: () => true }),
    unsetColor: () => ({ run: () => true }),
    setColor: () => ({ run: () => true }),
    setTextAlign: () => ({ run: () => true }),
    toggleHeading: () => ({ run: () => true }),
    toggleBulletList: () => ({ run: () => true }),
    setImage: () => ({ run: () => true }),
    insertContent: () => ({ run: () => true }),
    undo: () => ({ run: () => true }),
    redo: () => ({ run: () => true }),
  };

  return {
    chain: () => chain,
    state,
    view,
    isActive: vi.fn(() => false),
    can: () => ({ undo: () => true, redo: () => true }),
    getHTML: vi.fn(() => '<p>Hello world</p>'),
    getAttributes: vi.fn(() => ({})),
    commands: { setContent: vi.fn() },
    storage: {
      characterCount: {
        words: () => 2,
        characters: () => 11,
      },
    },
    __dispatchCalls: dispatchCalls,
    __commandSelections: commandSelections,
  };
}

describe('AdvancedRichTextEditor selection behavior', () => {
  beforeEach(() => {
    useEditorMock.mockReset();
    textSelectionCreateMock.mockClear();
  });

  test('expands a collapsed caret at a word boundary, applies inline formatting, and restores the caret', () => {
    const editor = createMockEditor(createSelection('Hello world', 5));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p>Hello world</p>" onUpdate={vi.fn()} />);

    const boldButton = screen.getByTitle('Negrita');
    expect(boldButton).toBeEnabled();

    fireEvent.click(boldButton);

    expect(editor.__commandSelections).toEqual([{ from: 1, to: 6, empty: false }]);
    expect(editor.__dispatchCalls).toEqual([{ from: 1, to: 6 }, { from: 6, to: 6 }]);
    expect(textSelectionCreateMock).toHaveBeenNthCalledWith(1, editor.state.doc, 1, 6);
    expect(textSelectionCreateMock).toHaveBeenNthCalledWith(2, editor.state.doc, 6);
  });

  test('disables inline and block controls when the caret has no usable text context', () => {
    const editor = createMockEditor(createSelection('   ', 0));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p></p>" onUpdate={vi.fn()} />);

    expect(screen.getAllByTitle('Coloca el cursor dentro de una palabra o selecciona texto').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Coloca el cursor dentro de una palabra o selecciona texto')[0]).toBeDisabled();
    expect(screen.getAllByTitle('Coloca el cursor en un párrafo con texto o selecciona texto').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Coloca el cursor en un párrafo con texto o selecciona texto')[0]).toBeDisabled();
  });
});
