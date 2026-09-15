import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FixedPdfPreview } from './FixedPdfPreview';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

vi.mock('server-only', () => ({}));

const copy = resolveLocaleMessages('es').project;

function buildFakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
}

function buildFakePdfDoc(numPages: number) {
  const page = buildFakePage();
  return {
    numPages,
    getPage: vi.fn(async () => page),
    destroy: vi.fn(),
    _page: page,
  };
}

const getDocumentMock = vi.fn();

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FixedPdfPreview', () => {
  test('shows a loading state, then the page indicator once the PDF resolves', async () => {
    const fakeDoc = buildFakePdfDoc(122);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc) });

    render(<FixedPdfPreview projectId="project-1" copy={copy} />);

    expect(screen.getByTestId('fixed-pdf-preview-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('fixed-pdf-page-indicator')).toHaveTextContent('1 / 122');
    });

    expect(getDocumentMock).toHaveBeenCalledWith({
      url: '/api/projects/source-pdf?projectId=project-1',
    });
  });

  test('shows an error state when the source PDF cannot be loaded', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error('boom')) });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<FixedPdfPreview projectId="project-1" copy={copy} />);

    await waitFor(() => {
      expect(screen.getByTestId('fixed-pdf-preview-error')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  test('navigates to the next/previous page and disables buttons at the edges', async () => {
    const fakeDoc = buildFakePdfDoc(3);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc) });

    render(<FixedPdfPreview projectId="project-1" copy={copy} />);

    await waitFor(() => {
      expect(screen.getByTestId('fixed-pdf-page-indicator')).toHaveTextContent('1 / 3');
    });

    expect(screen.getByTestId('fixed-pdf-prev-page')).toBeDisabled();
    expect(screen.getByTestId('fixed-pdf-next-page')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('fixed-pdf-next-page'));

    await waitFor(() => {
      expect(screen.getByTestId('fixed-pdf-page-indicator')).toHaveTextContent('2 / 3');
    });
    expect(fakeDoc.getPage).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByTestId('fixed-pdf-next-page'));
    await waitFor(() => {
      expect(screen.getByTestId('fixed-pdf-page-indicator')).toHaveTextContent('3 / 3');
    });
    expect(screen.getByTestId('fixed-pdf-next-page')).toBeDisabled();
  });
});
