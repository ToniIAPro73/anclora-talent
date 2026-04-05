import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DocumentImporter } from './DocumentImporter';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

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
      '.pdf,.doc,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    for (const format of ['DOCX', 'DOC', 'PDF', 'TXT', 'MD']) {
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
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'doc.pdf')] } });

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
    const largeFile = new File(['x'.repeat(100)], 'grande.pdf');
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
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'doc.pdf')] } });

    await waitFor(() => {
      expect(screen.getByText('No se pudo analizar el documento')).toBeInTheDocument();
    });
  });
});
