import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { rasterizeSourcePdfPage, resolveOriginPageNumber } from './pdf-page-rasterizer';

function buildFakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
}

function buildFakePdfDoc(numPages: number) {
  const page = buildFakePage();
  return { numPages, getPage: vi.fn(async () => page), destroy: vi.fn() };
}

const getDocumentMock = vi.fn();

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rasterizeSourcePdfPage', () => {
  test('loads the source PDF via the same-origin route and renders the requested page to a PNG data URL', async () => {
    const fakeDoc = buildFakePdfDoc(12);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc) });

    const result = await rasterizeSourcePdfPage('project-1', 1);

    expect(getDocumentMock).toHaveBeenCalledWith({ url: '/api/projects/source-pdf?projectId=project-1' });
    expect(fakeDoc.getPage).toHaveBeenCalledWith(1);
    expect(result).toBe('data:image/png;base64,FAKE');
    expect(fakeDoc.destroy).toHaveBeenCalled();
  });

  test('destroys the document even if rendering throws', async () => {
    const fakeDoc = buildFakePdfDoc(3);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(rasterizeSourcePdfPage('project-1', 1)).rejects.toThrow();
    expect(fakeDoc.destroy).toHaveBeenCalled();
  });
});

describe('resolveOriginPageNumber', () => {
  test('cover always uses page 1', () => {
    expect(resolveOriginPageNumber('cover', 240)).toBe(1);
  });

  test('back cover uses the last page', () => {
    expect(resolveOriginPageNumber('back-cover', 240)).toBe(240);
  });

  test('back cover falls back to page 1 when the page count is unknown', () => {
    expect(resolveOriginPageNumber('back-cover', null)).toBe(1);
  });
});
