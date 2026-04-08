import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

type MockSelection = {
  empty: boolean;
  from: number;
  to: number;
  $from: {
    parent: { textContent: string; type: { name: string }; attrs: { indent?: number } };
    parentOffset: number;
    start: () => number;
    end: () => number;
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

vi.mock('@tiptap/core', () => ({
  Extension: {
    create: vi.fn(() => ({})),
  },
}));

vi.mock('@tiptap/extension-bullet-list', () => ({
  default: {
    extend: vi.fn(() => ({})),
  },
}));

vi.mock('@tiptap/extension-ordered-list', () => ({
  default: {
    extend: vi.fn(() => ({})),
  },
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

function createSelection(
  text: string,
  parentOffset: number,
  start = 1,
  nodeType = 'paragraph',
  indent = 0,
): MockSelection {
  const position = start + parentOffset;
  return {
    empty: true,
    from: position,
    to: position,
    $from: {
      parent: { textContent: text, type: { name: nodeType }, attrs: { indent } },
      parentOffset,
      start: () => start,
      end: () => start + text.length,
    },
  };
}

function createMockEditor(selection: MockSelection) {
  const dispatchCalls: Array<{ from: number; to: number }> = [];
  const commandSelections: Array<{ from: number; to: number; empty: boolean }> = [];
  const headingSelections: Array<{ from: number; to: number; empty: boolean; level: number }> = [];
  const bulletListSelections: Array<{ from: number; to: number; empty: boolean }> = [];
  const orderedListSelections: Array<{ from: number; to: number; empty: boolean }> = [];
  const updatedAttributes: Array<{ type: string; attributes: Record<string, unknown> }> = [];
  const insertedContent: Array<unknown> = [];
  const deletedRanges: Array<{ from: number; to: number }> = [];
  let currentSelection = selection;

  const state = {
    doc: {
      type: 'doc',
      descendants: vi.fn((callback: (node: { type: { name: string }; nodeSize: number }, pos: number) => boolean) => {
        callback({ type: { name: 'paragraph' }, nodeSize: 5 }, 1);
        callback({ type: { name: 'pageBreak' }, nodeSize: 1 }, 12);
      }),
    },
    selection: currentSelection,
    tr: {
      setSelection(nextSelection: { from: number; to: number }) {
        return { selection: nextSelection };
      },
      delete(from: number, to: number) {
        deletedRanges.push({ from, to });
        return { selection: state.selection };
      },
    },
  };

  const view = {
    dispatch(transaction: { selection?: { from: number; to: number } }) {
      if (!transaction.selection) {
        return;
      }
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
    command: (callback: ({ tr, state }: { tr: typeof state.tr; state: typeof state }) => boolean) => ({
      run: () => callback({ tr: state.tr, state }),
    }),
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
    toggleHeading: ({ level }: { level: number }) => ({
      run: () => {
        headingSelections.push({
          from: state.selection.from,
          to: state.selection.to,
          empty: state.selection.empty,
          level,
        });
        return true;
      },
    }),
    toggleBulletList: () => ({
      run: () => {
        bulletListSelections.push({
          from: state.selection.from,
          to: state.selection.to,
          empty: state.selection.empty,
        });
        return true;
      },
    }),
    toggleOrderedList: () => ({
      run: () => {
        orderedListSelections.push({
          from: state.selection.from,
          to: state.selection.to,
          empty: state.selection.empty,
        });
        return true;
      },
    }),
    updateAttributes: (type: string, attributes: Record<string, unknown>) => ({
      run: () => {
        updatedAttributes.push({ type, attributes });
        if (type === 'paragraph' || type === 'heading') {
          state.selection.$from.parent.attrs = {
            ...state.selection.$from.parent.attrs,
            ...attributes,
          };
        }
        return true;
      },
    }),
    sinkListItem: () => ({ run: () => true }),
    liftListItem: () => ({ run: () => true }),
    setImage: () => ({ run: () => true }),
    insertContent: (content: unknown) => ({
      run: () => {
        insertedContent.push(content);
        return true;
      },
    }),
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
    __headingSelections: headingSelections,
    __bulletListSelections: bulletListSelections,
    __orderedListSelections: orderedListSelections,
    __updatedAttributes: updatedAttributes,
    __insertedContent: insertedContent,
    __deletedRanges: deletedRanges,
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
    expect(screen.getByTitle('Lista con viñetas')).toBeEnabled();
    expect(screen.getByTitle('Lista numerada')).toBeEnabled();
  });

  test('expands a collapsed caret to the current paragraph before applying heading formatting and restores the caret', () => {
    const editor = createMockEditor(createSelection('Hello world', 4));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p>Hello world</p>" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Encabezado 1'));

    expect(editor.__headingSelections).toEqual([{ from: 1, to: 12, empty: false, level: 1 }]);
    expect(editor.__dispatchCalls).toEqual([{ from: 1, to: 12 }, { from: 5, to: 5 }]);
  });

  test('does not render a synthetic second page when double view has only one page of content', () => {
    const editor = createMockEditor(createSelection('Hello world', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent="<p>Hello world</p>"
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={1}
      />,
    );

    expect(screen.queryByText('Página 3')).not.toBeInTheDocument();
  });

  test('renders second-page content when a manual page break creates another page in double view', () => {
    const editor = createMockEditor(createSelection('Hello world', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Primera página</p><hr data-page-break="true" /><p>Segunda página</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    expect(screen.getByText('Segunda página')).toBeInTheDocument();
  });

  test('removes the first page break found below the cursor', () => {
    const editor = createMockEditor(createSelection('Hello world', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Primera página</p><hr data-page-break="true" /><p>Segunda página</p>'}
        onUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Eliminar el primer salto de página por debajo del cursor'));

    expect(editor.state.doc.descendants).toHaveBeenCalledTimes(1);
    expect(editor.__deletedRanges).toEqual([{ from: 12, to: 13 }]);
  });

  test('shows heading controls up to level 6', () => {
    const editor = createMockEditor(createSelection('Hello world', 0));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p>Hello world</p>" onUpdate={vi.fn()} />);

    expect(screen.getByTitle('Encabezado 4')).toBeInTheDocument();
    expect(screen.getByTitle('Encabezado 5')).toBeInTheDocument();
    expect(screen.getByTitle('Encabezado 6')).toBeInTheDocument();
  });

  test('indents a regular paragraph when tabbing right outside a list', () => {
    const editor = createMockEditor(createSelection('Hola', 0));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p>Hola</p>" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Tabular a la derecha'));

    expect(editor.__updatedAttributes).toContainEqual({
      type: 'paragraph',
      attributes: { indent: 1 },
    });
  });
});
