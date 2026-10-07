import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DocumentImporter } from './DocumentImporter';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// U6: DocumentImporter renders DocumentDataModal, which imports server
// actions — stub them so the db/neon chain never loads in jsdom.
vi.mock('@/lib/projects/actions', () => ({
  saveProjectCompositionAction: vi.fn(),
  saveUserCompositionDefaultsAction: vi.fn(),
  setBrandForAllProjectsAction: vi.fn(),
}));

vi.mock('@/lib/brand/actions', () => ({
  setProjectBrandProfileAction: vi.fn(),
}));

// Direct-to-Blob upload that never completes: it reports one initial progress event and then stalls (what a
// CORS-blocked or unreachable store looks like while the Blob client keeps retrying internally).
const stalledUpload = vi.hoisted(() => vi.fn());
vi.mock('@vercel/blob/client', () => ({ upload: stalledUpload }));

vi.mock('mammoth', () => ({
  convertToHtml: vi.fn(async () => ({
    value: '<h1>Éxito sin compañía</h1><h2>Introducción</h2><h2>Concepto 1</h2>',
    messages: [],
  })),
}));

vi.mock('@/lib/projects/docx-styles', () => ({
  extractDocxNormalStyle: vi.fn(async () => ({ fontFamily: 'Aptos', fontSizePt: 11 })),
}));

const copy = resolveLocaleMessages('es').project;

function mockFetchSuccess(chapterCount = 3, title = 'El título detectado') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        title,
        subtitle: 'Subtítulo curado',
        author: 'Antonio Ballesteros Alonso',
        chapterCount,
        chapterTitles: ['Introducción', 'Fase 1: Percepción', 'Fase 2: Presencia'],
        warnings: ['La portada contenía varias líneas y se han condensado en un único subtítulo editable.'],
        sourceFileName: 'capitulos.docx',
        sourceFormat: 'docx',
      }),
    }),
  );
}

function mockFetchPending() {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
}

function mockFetchError(errorCode: string, status = 422) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ error: errorCode }),
    }),
  );
}

function mockFetchNetworkError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DocumentImporter', () => {
  test('renders the dropzone with the file input and format badges', () => {
    render(<DocumentImporter copy={copy} />);

    expect(screen.getByText('Documento base opcional')).toBeInTheDocument();
    expect(screen.getByText('Arrastra tu documento aquí')).toBeInTheDocument();

    const fileInput = screen.getByTestId('source-document-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute(
      'accept',
      '.doc,.docx,.odt,.md,.markdown,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/markdown,text/plain',
    );

    for (const format of ['DOCX', 'DOC']) {
      expect(screen.getByText(format)).toBeInTheDocument();
    }

    for (const format of ['PDF']) {
      expect(screen.queryByText(format)).not.toBeInTheDocument();
    }
    for (const format of ['ODT', 'MD', 'TXT']) {
      expect(screen.getByText(format)).toBeInTheDocument();
    }
  });

  test('shows analyzing state immediately after picking a file', async () => {
    mockFetchPending();
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    const file = new File(['contenido'], 'capitulos.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Analizando documento...')).toBeInTheDocument();
    expect(screen.getByText('capitulos.docx')).toBeInTheDocument();
  });

  test('shows ready state with chapter count after successful analysis', async () => {
    mockFetchSuccess(5);
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    const file = new File(['contenido'], 'libro.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Listo para importar')).toBeInTheDocument();
    });

    expect(screen.getByText('5 capítulos detectados')).toBeInTheDocument();
    expect(screen.getByText('libro.docx')).toBeInTheDocument();
    expect(screen.getByTestId('import-analysis-author')).toHaveTextContent('Antonio Ballesteros Alonso');
    expect(screen.getByTestId('import-analysis-chapter-list')).toHaveTextContent('Fase 1: Percepción');
    expect(screen.getByTestId('import-analysis-warnings')).toBeInTheDocument();
  });

  test('shows generic error when the API returns IMPORT_FAILED', async () => {
    mockFetchError('IMPORT_FAILED');
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'doc.odt')] } });

    await waitFor(() => {
      expect(screen.getByText('No se pudo analizar el documento')).toBeInTheDocument();
    });
  });

  test('shows unsupported format error when the API returns FORMAT_UNSUPPORTED', async () => {
    mockFetchError('FORMAT_UNSUPPORTED');
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'doc.xyz')] } });

    await waitFor(() => {
      expect(screen.getByText('Formato no compatible')).toBeInTheDocument();
    });
  });

  test('shows file too large error before calling the API when file exceeds 50 MB', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    const largeFile = new File(['x'.repeat(100)], 'grande.docx');
    Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText('El archivo es demasiado grande (máx. 50 MB)')).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('shows generic error on network failure', async () => {
    mockFetchNetworkError();
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'doc.odt')] } });

    await waitFor(() => {
      expect(screen.getByText('No se pudo analizar el documento')).toBeInTheDocument();
    });
  });

  test('falls back to local DOCX analysis when the server upload cannot be parsed', async () => {
    mockFetchNetworkError();
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['docx bytes'], 'exito_sin_compania.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Listo para importar')).toBeInTheDocument();
    });

    expect(screen.getByTestId('import-analysis-title')).toHaveTextContent('Éxito sin compañía');
    expect(screen.getByTestId('import-analysis-warnings')).toHaveTextContent(copy.importLocalFallbackWarning);
    expect(screen.getByText(copy.documentDataSourceBadgeVerified)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Aptos')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11')).toBeInTheDocument();
    expect(screen.queryByText(copy.importErrorGeneric)).not.toBeInTheDocument();
  });

  test('shows a non-blocking warning when the server reports a parse failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          title: 'roto',
          chapterCount: 1,
          chapterTitles: [],
          warnings: [],
          sourceFileName: 'roto.docx',
          parseWarning: true,
        }),
      }),
    );
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'roto.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })] },
    });

    // U4: the flow must reach the ready state — never the error state.
    await waitFor(() => {
      expect(screen.getByText('Listo para importar')).toBeInTheDocument();
    });

    expect(screen.getByTestId('import-analysis-warnings')).toHaveTextContent(copy.importParseWarning);
    expect(screen.queryByText(copy.importErrorGeneric)).not.toBeInTheDocument();
  });

  test('rejects PDF files because PDF import is temporarily disabled', async () => {
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'El_Plan_de_Escape_EBOOK.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() => {
      expect(screen.getByText('Formato no compatible')).toBeInTheDocument();
    });
  });

  test('does not show the fixed-pdf mode selector for a DOCX file', async () => {
    mockFetchSuccess(5);
    render(<DocumentImporter copy={copy} />);

    const fileInput = screen.getByTestId('source-document-input');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['contenido'], 'libro.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Listo para importar')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('document-mode-selector')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-mode-hidden-input')).not.toBeInTheDocument();
  });

  test('keeps the confirmed font family when reopening the document data modal', async () => {
    mockFetchSuccess(8);
    render(<DocumentImporter copy={copy} />);

    fireEvent.change(screen.getByTestId('source-document-input'), {
      target: { files: [new File(['contenido'], 'libro.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('document-data-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('font-selector-toggle'));
    fireEvent.click(screen.getByTestId('font-option-roboto'));
    fireEvent.click(screen.getByTestId('document-data-save-button'));

    fireEvent.click(screen.getByTestId('document-data-reopen-button'));

    expect(screen.getByTestId('font-selector-toggle')).toHaveTextContent('Roboto');
  });

  test('offers Markdown import modes and keeps the source-semantic mode as default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        title: 'Markdown',
        chapterCount: 2,
        chapterTitles: ['Introducción'],
        warnings: [],
        sourceFileName: 'manuscrito.md',
        sourceFormat: 'markdown',
        sourceFamily: 'semantic',
        sourceCapabilities: { richTypography: false, pageGeometry: false, runFormatting: 'semanticMarksOnly', semanticHeadings: true },
        sourceStats: { h1: 1, h2: 2, h3: 1, h4: 0, paragraphs: 4, orderedLists: 1, unorderedLists: 1, blockquotes: 1, tables: 1, links: 2, images: 0, codeBlocks: 1, footnotes: 1 },
      }),
    }));
    render(<DocumentImporter copy={copy} />);
    fireEvent.change(screen.getByTestId('source-document-input'), {
      target: { files: [new File(['# H1'], 'manuscrito.md', { type: 'text/markdown' })] },
    });

    await waitFor(() => expect(screen.getByTestId('markdown-import-mode-selector')).toBeInTheDocument());
    expect(screen.getByTestId('markdown-import-mode-source-semantic')).toBeChecked();
    expect(screen.getByText(copy.markdownSourcePresentationNone)).toBeInTheDocument();
    expect(screen.getByText(copy.markdownDefaultOrigin)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('markdown-import-mode-materialized'));
    expect(screen.getByTestId('markdown-import-mode-materialized')).toBeChecked();
    expect(screen.getByTestId('markdown-materialized-presentation')).toBeInTheDocument();
    expect(screen.getByTestId('import-presentation-mode-input')).toHaveValue('materialized');
  });

  test('a big file whose direct Blob upload stalls falls back to the normal upload after a few seconds, not minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stalledUpload.mockImplementation((_name: string, _file: File, options: { onUploadProgress?: (event: { loaded: number }) => void }) => {
        options.onUploadProgress?.({ loaded: 1 });
        return new Promise(() => undefined);
      });
      mockFetchSuccess(3);
      render(<DocumentImporter copy={copy} />);
      const big = new File(['x'], 'grande.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 });

      fireEvent.change(screen.getByTestId('source-document-input'), { target: { files: [big] } });
      const fetchMock = vi.mocked(globalThis.fetch);
      expect(fetchMock).not.toHaveBeenCalled(); // still inside the direct-upload window

      await vi.advanceTimersByTimeAsync(10_000);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects/import');
      expect(init.body).toBeInstanceOf(FormData); // multipart, not the blob-url JSON path

      // the next big file does not wait again
      stalledUpload.mockClear();
      fireEvent.change(screen.getByTestId('source-document-input'), { target: { files: [big] } });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(stalledUpload).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
