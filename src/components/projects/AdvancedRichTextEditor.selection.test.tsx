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
    posAtCoords: vi.fn(() => ({ pos: 7 })),
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
    deleteRange: (range: { from: number; to: number }) => ({
      run: () => {
        deletedRanges.push(range);
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
    __posAtCoords: view.posAtCoords,
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

  test('keeps a shared editor surface when a manual page break creates another page in double view', () => {
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

    expect(screen.getAllByTestId('editable-page-surface')).toHaveLength(2);
    expect(screen.getAllByTestId('advanced-tiptap-content')).toHaveLength(1);
  });

  test('renders multiple visible pages as part of the editable flow', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    expect(screen.getAllByTestId('editable-page-surface')).toHaveLength(2);
  });

  test('does not render later visible pages as preview-only placeholders', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    expect(screen.queryByText('Página 2')).not.toBeInTheDocument();
  });

  test('places the caret into the first visible page on mount', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    expect(editor.__posAtCoords).toHaveBeenCalled();
    expect(editor.__dispatchCalls[0]).toEqual({ from: 7, to: 7 });
  });

  test('moves the caret into the clicked adjacent page in double view', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    editor.__posAtCoords.mockReturnValueOnce({ pos: 3 }).mockReturnValueOnce({ pos: 42 });
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    const surfaces = screen.getAllByTestId('editable-page-surface');
    fireEvent.mouseDown(surfaces[1]);

    expect(editor.__dispatchCalls.at(-1)).toEqual({ from: 42, to: 42 });
  });

  test('keeps the first spread visible when focusing the adjacent right page in double view', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={
          '<p>Uno</p><hr data-page-break="manual" /><p>Dos</p><hr data-page-break="manual" /><p>Tres</p>'
        }
        onUpdate={vi.fn()}
        currentPage={1}
        totalPages={3}
      />,
    );

    const surfaces = screen.getAllByTestId('editable-page-surface');
    expect(surfaces).toHaveLength(2);
    expect(surfaces[0]).toHaveAttribute('data-page-index', '0');
    expect(surfaces[1]).toHaveAttribute('data-page-index', '1');
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

  test('inserts manual page breaks by default', () => {
    const editor = createMockEditor(createSelection('Hello', 0));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<p>Hello</p>" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Insertar Salto de Página (Ctrl+Shift+Enter)'));

    expect(editor.__insertedContent).toContain('<hr data-page-break="manual" />');
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

  test('defines explicit default selectors for bullet and ordered lists', () => {
    const editor = createMockEditor(createSelection('Hola', 0));
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent="<ul><li>Uno</li></ul><ol><li>Uno</li></ol>" onUpdate={vi.fn()} />);

    const styles = Array.from(document.querySelectorAll('style')).map((node) => node.textContent ?? '').join('\n');

    expect(styles).toContain('.ProseMirror ul:not([data-bullet-style])');
    expect(styles).toContain('.ProseMirror ol:not([data-list-style])');
    expect(styles).toContain('.ProseMirror hr[data-page-break="auto"]');
    expect(styles).toContain('opacity: 0');
  });

  test('re-emits html containing auto breaks after overflow reconciliation', () => {
    const overflowHtml = '<p>' + 'Texto '.repeat(500) + '</p>';
    const editor = createMockEditor(createSelection('Texto', 0));
    const onUpdate = vi.fn();

    editor.getHTML = vi.fn(() => overflowHtml);
    useEditorMock.mockReturnValue(editor);

    render(<AdvancedRichTextEditor defaultContent={overflowHtml} onUpdate={onUpdate} />);

    const options = useEditorMock.mock.calls[0]?.[0] as {
      onUpdate?: ({ editor }: { editor: typeof editor }) => void;
    };

    options.onUpdate?.({ editor });

    expect(editor.commands.setContent).toHaveBeenCalledWith(
      expect.stringContaining('data-page-break="auto"'),
      false,
    );
    expect(onUpdate).toHaveBeenCalledWith(expect.stringContaining('data-page-break="auto"'));
  });

  test('keeps one shared editing flow across visible pages', () => {
    const editor = createMockEditor(createSelection('Segunda pagina', 3));
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={'<p>Primera</p><hr data-page-break="manual" /><p>Segunda pagina</p>'}
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={2}
      />,
    );

    fireEvent.click(screen.getByTitle('Negrita'));

    expect(screen.getAllByTestId('advanced-tiptap-content')).toHaveLength(1);
    expect(editor.__commandSelections).toEqual([{ from: 1, to: 8, empty: false }]);
  });

  test('does not replicate page-break separators across the chapter when pressing Enter', () => {
    const editor = createMockEditor(createSelection('Esto', 2));
    const onUpdate = vi.fn();
    const baseChapterHtml = [
      '<h2>Introducción</h2>',
      '<p>Esto es lo que se siente</p>',
      '<p>Estás en la reunión. Llevas tres meses preparando esta idea. Has ensayado las palabras. Has visualizado las caras de asombro. Hoy es el día.</p>',
      '<p>La directora pregunta si alguien tiene algo que aportar. Es tu momento. Abres la boca. Y entonces pasa.</p>',
      '<p>Un compañero empieza a hablar al mismo tiempo. Tú te callas. Él no. Diez minutos después, dice exactamente lo que ibas a decir tú. Todos asienten. La directora sonríe. «Brillante», dice. Tú estás ahí. Pero no estás. Eres un mueble con pulso.</p>',
      '<p>"La invisibilidad no es no ser visto. Es ser visto y descartado antes de que llegues a hablar."</p>',
      '<p>Esto es lo que no entiende nadie que no lo haya vivido: la invisibilidad no es timidez. No es introversión. No es humildad. Es una jaula de cristal.</p>',
      '<h2>El Sistema PPP</h2>',
      '<p>Este libro sigue una metodología que he llamado el Sistema PPP: Percepción, Presencia y Permanencia.</p>',
      '<h2>PERCEPCIÓN (Días 1-10)</h2>',
      '<p>Antes de cambiar cómo te ven los demás, necesitas cambiar cómo te ves tú.</p>',
      '<h2>PRESENCIA (Días 11-20)</h2>',
      '<p>Una vez que sabes quién eres, aprendes a mostrarlo.</p>',
      '<h2>PERMANENCIA (Días 21-30)</h2>',
      '<p>La tercera fase te enseña a mantener lo construido.</p>',
      '<h2>Cómo usar este libro</h2>',
      '<p>Lee un capítulo cada mañana. Reflexiona sobre las preguntas a lo largo del día. Ejecuta el reto antes de dormir. No saltes días.</p>',
    ].join('');

    editor.getHTML = vi.fn(
      () =>
        [
          '<h2>Introducción</h2>',
          '<p>Esto es lo que se siente</p>',
          '<p></p>',
          '<p>Estás en la reunión. Llevas tres meses preparando esta idea. Has ensayado las palabras. Has visualizado las caras de asombro. Hoy es el día.</p>',
          '<p>La directora pregunta si alguien tiene algo que aportar. Es tu momento. Abres la boca. Y entonces pasa.</p>',
          '<p>Un compañero empieza a hablar al mismo tiempo. Tú te callas. Él no. Diez minutos después, dice exactamente lo que ibas a decir tú. Todos asienten. La directora sonríe. «Brillante», dice. Tú estás ahí. Pero no estás. Eres un mueble con pulso.</p>',
          '<p>"La invisibilidad no es no ser visto. Es ser visto y descartado antes de que llegues a hablar."</p>',
          '<p>Esto es lo que no entiende nadie que no lo haya vivido: la invisibilidad no es timidez. No es introversión. No es humildad. Es una jaula de cristal.</p>',
          '<h2>El Sistema PPP</h2>',
          '<p>Este libro sigue una metodología que he llamado el Sistema PPP: Percepción, Presencia y Permanencia.</p>',
          '<h2>PERCEPCIÓN (Días 1-10)</h2>',
          '<p>Antes de cambiar cómo te ven los demás, necesitas cambiar cómo te ves tú.</p>',
          '<h2>PRESENCIA (Días 11-20)</h2>',
          '<p>Una vez que sabes quién eres, aprendes a mostrarlo.</p>',
          '<h2>PERMANENCIA (Días 21-30)</h2>',
          '<p>La tercera fase te enseña a mantener lo construido.</p>',
          '<h2>Cómo usar este libro</h2>',
          '<p>Lee un capítulo cada mañana. Reflexiona sobre las preguntas a lo largo del día. Ejecuta el reto antes de dormir. No saltes días.</p>',
        ].join(''),
    );
    useEditorMock.mockReturnValue(editor);

    render(
      <AdvancedRichTextEditor
        defaultContent={baseChapterHtml}
        onUpdate={onUpdate}
        currentPage={0}
        totalPages={2}
      />,
    );

    const options = useEditorMock.mock.calls[0]?.[0] as {
      onUpdate?: ({ editor }: { editor: typeof editor }) => void;
    };

    options.onUpdate?.({ editor });
    options.onUpdate?.({ editor });

    const latestHtml = onUpdate.mock.calls.at(-1)?.[0] as string;
    expect((latestHtml.match(/data-page-break=/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});
