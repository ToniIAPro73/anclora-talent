import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/projects/actions', () => ({ createEditableCopyAction: vi.fn() }));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { getProjectCapabilities } from '@/lib/projects/capabilities';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { KdpDisclosure } from '@/lib/ai/kdp-disclosure';
import { ExportWorkspace, type ExportWorkspaceProps } from './ExportWorkspace';

const copy = resolveLocaleMessages('es').project;
const copyEn = resolveLocaleMessages('en').project;

function makeProject(): ProjectRecord {
  return {
    id: 'proj-preview-modal',
    userId: 'user-1',
    workspaceId: null,
    slug: 'preview-modal',
    title: 'Nunca más en la sombra',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    document: {
      id: 'doc-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Índice',
          blocks: [
            {
              id: 'b-1',
              type: 'paragraph',
              order: 0,
              content: '<h2>Índice</h2><p>Introducción</p>',
            },
          ],
        },
        {
          id: 'ch-2',
          order: 1,
          title: 'Introducción',
          blocks: [
            {
              id: 'b-2',
              type: 'paragraph',
              order: 0,
              content:
                '<h2>Introducción</h2><p>Texto suficientemente largo para ocupar varias líneas sin scroll interno.</p>',
            },
          ],
        },
      ],
      source: null,
    },
    cover: {
      id: 'cover-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      renderedImageUrl: 'https://example.com/cover-render.png',
    },
    backCover: {
      id: 'back-1',
      title: 'Nunca más en la sombra',
      body: 'Texto de contraportada',
      authorBio: 'Bio del autor',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: 'https://example.com/back-cover-render.png',
    },
    assets: [],
  };
}



const QUERY = 'device=laptop&fontSize=16&marginTop=72&marginBottom=72&marginLeft=48&marginRight=48';
const enc = (text: string) => new TextEncoder().encode(text);
const PDF = enc('%PDF-1.7\n3 0 obj\n<< /Type /Page >>\nendobj\n%%EOF');

function fixedPdfProject(): ProjectRecord {
  const project = makeProject();
  return { ...project, document: { ...project.document, source: { mode: 'fixed-pdf', sourceFormat: 'pdf' } } } as unknown as ProjectRecord;
}

function props(overrides: Partial<ExportWorkspaceProps> = {}): ExportWorkspaceProps {
  const project = overrides.project ?? makeProject();
  return {
    project,
    copy,
    locale: 'es',
    capabilities: getProjectCapabilities(project),
    exportQuery: QUERY,
    exportGate: 'off',
    violations: [],
    checks: [],
    onNavigateStep: vi.fn(),
    onOpenDocumentData: vi.fn(),
    ...overrides,
  };
}

const violation = { page: 1, blockId: 'b', rule: 'widowsOrphans', message: 'Línea viuda' };
const kdpError = (rule: string): PreflightCheck => ({ channel: 'kdp', severity: 'error', rule, params: {} });

function mockFetch(handler: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:mock-1') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('ExportWorkspace — formats and configuration', () => {
  test('formats are an accessible radio group; PDF is selected by default with its page configuration', () => {
    render(<ExportWorkspace {...props()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByTestId('export-format-pdf')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('export-page-size')).toBeInTheDocument();
    expect(screen.getByTestId('export-margins')).toHaveTextContent('19');
    expect(screen.getByTestId('export-cta')).toHaveTextContent('Exportar PDF');
    expect(screen.getByTestId('export-file-name')).toHaveTextContent(/\.pdf$/);
  });

  test('EPUB drops the print controls and explains it is reflowable; its cover note is honest', () => {
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-format-epub'));
    expect(screen.getByTestId('export-format-epub')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByTestId('export-page-size')).toBeNull();
    expect(screen.getByTestId('export-epub-note')).toHaveTextContent('reflowable');
    expect(screen.getByTestId('export-epub-config')).toHaveTextContent('no el diseño de la Portada');
    expect(screen.getByTestId('export-cta')).toHaveTextContent('Exportar EPUB');
  });

  test('DOCX states the editable-format limitation; HTML and Markdown are described without print controls', () => {
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-format-docx'));
    expect(screen.getByTestId('export-docx-note')).toHaveTextContent('la maquetación puede variar');
    expect(screen.getByTestId('export-page-size')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('export-format-html'));
    expect(screen.getByTestId('export-html-note')).toHaveTextContent('no es una vista de impresión');
    expect(screen.queryByTestId('export-page-size')).toBeNull();
    fireEvent.click(screen.getByTestId('export-format-markdown'));
    expect(screen.getByTestId('export-markdown-note')).toBeInTheDocument();
    expect(screen.getByTestId('export-file-name')).toHaveTextContent(/\.md$/);
  });

  test('the page size is an export-only override (nothing persisted) and travels in the request', async () => {
    const fetchMock = mockFetch(() => new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.change(screen.getByTestId('export-page-size'), { target: { value: 'tablet' } });
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String((fetchMock.mock.calls as unknown[][])[0][0])).toMatch(/^\/api\/projects\/export\/pdf\?projectId=proj-preview-modal&.*device=tablet/);
  });

  test('metadata is the canonical one, with a link to Datos del documento (no duplicated editor)', () => {
    const onOpenDocumentData = vi.fn();
    render(<ExportWorkspace {...props({ onOpenDocumentData })} />);
    expect(screen.getByTestId('export-meta-title')).toHaveTextContent('Nunca más en la sombra');
    expect(screen.getByTestId('export-meta-author')).toHaveTextContent('Antonio Ballesteros Alonso');
    expect(screen.getByTestId('export-meta-language')).toHaveTextContent('es');
    expect(screen.getByTestId('export-meta-isbn')).toHaveTextContent('Sin definir');
    fireEvent.click(screen.getByTestId('export-edit-metadata'));
    expect(onOpenDocumentData).toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('ExportWorkspace — keyboard', () => {
  test('arrow keys move the format selection (radio pattern) over available formats only', () => {
    render(<ExportWorkspace {...props()} />);
    const group = screen.getByTestId('export-format-list');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByTestId('export-format-epub')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('export-format-epub')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('export-format-pdf')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(screen.getByTestId('export-format-markdown')).toHaveAttribute('aria-checked', 'true');
  });

  test('on a fixed-PDF project the arrows never land on a disabled format', () => {
    render(<ExportWorkspace {...props({ project: fixedPdfProject() })} />);
    fireEvent.keyDown(screen.getByTestId('export-format-list'), { key: 'ArrowDown' });
    expect(screen.getByTestId('export-format-pdf')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('ExportWorkspace — fixed PDF', () => {
  test('the original PDF is the only export; the others are off with a textual reason; editable copy is offered', () => {
    render(<ExportWorkspace {...props({ project: fixedPdfProject() })} />);
    expect(screen.getByTestId('export-workspace')).toHaveAttribute('data-fixed-pdf', 'true');
    expect(screen.getByTestId('export-cta')).toHaveTextContent('Descargar PDF original');
    expect(screen.getByTestId('export-original-note')).toBeInTheDocument();
    for (const id of ['docx', 'epub', 'html', 'markdown']) {
      expect(screen.getByTestId(`export-format-${id}`)).toBeDisabled();
      expect(screen.getByTestId(`export-format-${id}`)).toHaveTextContent('maquetación fija');
    }
    expect(screen.getByTestId('create-editable-copy-button')).toBeInTheDocument();
    expect(screen.queryByTestId('export-page-size')).toBeNull();
  });

  test('the original PDF request carries no composition parameters and is never gated', async () => {
    const fetchMock = mockFetch(() => new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } }));
    render(<ExportWorkspace {...props({ project: fixedPdfProject(), exportGate: 'block', violations: [violation], checks: [kdpError('kdp.metadata.title')] })} />);
    expect(screen.getByTestId('export-cta')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String((fetchMock.mock.calls as unknown[][])[0][0])).toBe('/api/projects/export/pdf?projectId=proj-preview-modal');
  });
});

describe('ExportWorkspace — readiness and per-format gating', () => {
  test('a blocking policy blocks only the formats the problem affects', () => {
    render(<ExportWorkspace {...props({ exportGate: 'block', violations: [violation] })} />);
    expect(screen.getByTestId('export-bar')).toHaveAttribute('data-state', 'blocked');
    expect(screen.getByTestId('export-status')).toHaveTextContent('Requiere atención');
    expect(screen.getByTestId('export-cta')).toBeDisabled();
    fireEvent.click(screen.getByTestId('export-format-epub'));
    expect(screen.getByTestId('export-cta')).toBeDisabled();
    expect(screen.getByTestId('export-format-issues')).toBeInTheDocument();
    for (const id of ['docx', 'html', 'markdown']) {
      fireEvent.click(screen.getByTestId(`export-format-${id}`));
      expect(screen.getByTestId('export-cta')).not.toBeDisabled();
      expect(screen.getByTestId('export-bar')).toHaveAttribute('data-state', 'ready');
    }
  });

  test('a preflight error follows its channel: KDP metadata blocks PDF and DOCX, not HTML', () => {
    render(<ExportWorkspace {...props({ exportGate: 'block', checks: [kdpError('kdp.metadata.title')] })} />);
    expect(screen.getByTestId('export-cta')).toBeDisabled();
    expect(screen.getByTestId('export-format-issues')).toHaveTextContent('título');
    fireEvent.click(screen.getByTestId('export-format-docx'));
    expect(screen.getByTestId('export-cta')).toBeDisabled();
    fireEvent.click(screen.getByTestId('export-format-html'));
    expect(screen.getByTestId('export-cta')).not.toBeDisabled();
  });

  test('warnings never block: the export stays possible and the counts are shown', () => {
    render(<ExportWorkspace {...props({ exportGate: 'warn', violations: [violation, violation] })} />);
    expect(screen.getByTestId('export-bar')).toHaveAttribute('data-state', 'warn');
    expect(screen.getByTestId('export-cta')).not.toBeDisabled();
    expect(screen.getByTestId('export-counts')).toHaveTextContent('2 advertencias');
    expect(screen.getByTestId('export-status')).toHaveTextContent('Listo para exportar');
  });

  test('final check rows only show real checks; clicking one goes to the step that fixes it', () => {
    const onNavigateStep = vi.fn();
    render(<ExportWorkspace {...props({ onNavigateStep })} />);
    expect(screen.getByTestId('export-check-content')).toHaveTextContent('2 capítulos');
    expect(screen.getByTestId('export-check-images')).toHaveTextContent('Comprobación parcial');
    fireEvent.click(screen.getByTestId('export-check-cover'));
    fireEvent.click(screen.getByTestId('export-check-back-cover'));
    fireEvent.click(screen.getByTestId('export-check-content'));
    expect(onNavigateStep.mock.calls.map((call) => call[0])).toEqual([3, 4, 2]);
  });

  test('AI use comes from the KDP disclosure logic', () => {
    const disclosure = (status: KdpDisclosure['status']): KdpDisclosure => ({ status, required: status === 'required', aiBlockCount: status === 'required' ? 2 : 0, humanBlockCount: 5, text: 'Declaración' });
    const { rerender } = render(<ExportWorkspace {...props({ kdpDisclosure: disclosure('required') })} />);
    expect(screen.getByTestId('export-check-ai')).toHaveTextContent('Requiere declaración');
    expect(screen.getByTestId('kdp-disclosure-badge')).toHaveAttribute('data-required', 'true');
    rerender(<ExportWorkspace {...props({ kdpDisclosure: disclosure('exempt-human') })} />);
    expect(screen.getByTestId('export-check-ai')).toHaveTextContent('No requiere declaración');
  });
});

describe('ExportWorkspace — generating and verifying the artifact', () => {
  test('success: the file is verified before it is offered; the result carries name, size and validation', async () => {
    mockFetch(() => new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="mi-libro.pdf"' } }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(screen.getByTestId('export-result')).toBeInTheDocument());
    expect(screen.getByTestId('export-result')).toHaveTextContent('Archivo generado');
    expect(screen.getByTestId('export-result-name')).toHaveTextContent('mi-libro.pdf');
    expect(screen.getByTestId('export-result-size')).toHaveTextContent('B');
    expect(screen.getByTestId('export-result-validation')).toHaveTextContent('Cabecera PDF');
    expect(screen.getByTestId('export-result-download')).toHaveAttribute('download', 'mi-libro.pdf');
    expect(screen.getAllByTestId('export-recent-item')).toHaveLength(1);
    expect(screen.getByTestId('export-live')).toHaveTextContent('Archivo generado y verificado.');
  });

  test('HTTP 200 with an empty or malformed body is NOT a successful export', async () => {
    mockFetch(() => new Response(new Uint8Array(), { status: 200, headers: { 'content-type': 'application/pdf' } }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(screen.getByTestId('export-error')).toBeInTheDocument());
    expect(screen.getByTestId('export-error')).toHaveTextContent('no ha superado la verificación');
    expect(screen.queryByTestId('export-result')).toBeNull();
    expect(screen.getByTestId('export-live')).toHaveTextContent('La exportación ha fallado.');
  });

  test('a server error surfaces its message and never downloads anything', async () => {
    mockFetch(() => Response.json({ error: 'PDF export failed' }, { status: 500 }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(screen.getByTestId('export-error')).toHaveTextContent('PDF export failed'));
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  test('busy: the CTA is disabled and announced, and a second click does not start a second export', async () => {
    let resolve: (response: Response) => void = () => undefined;
    const fetchMock = mockFetch(() => new Promise<Response>((done) => { resolve = done; }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(screen.getByTestId('export-cta')).toBeDisabled());
    expect(screen.getByTestId('export-cta')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('export-cta')).toHaveTextContent('Generando PDF…');
    expect(screen.getByTestId('export-live')).toHaveTextContent('Generando el archivo.');
    fireEvent.click(screen.getByTestId('export-cta'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } })); });
  });

  test('DOCX and EPUB artifacts are verified structurally', async () => {
    const docx = new JSZip();
    docx.file('[Content_Types].xml', '<Types/>');
    docx.file('word/document.xml', '<w:document><w:t>Texto</w:t></w:document>');
    const docxBytes = await docx.generateAsync({ type: 'uint8array' });
    mockFetch(() => new Response(docxBytes as BodyInit, { status: 200, headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } }));
    render(<ExportWorkspace {...props()} />);
    fireEvent.click(screen.getByTestId('export-format-docx'));
    fireEvent.click(screen.getByTestId('export-cta'));
    await waitFor(() => expect(screen.getByTestId('export-result')).toHaveTextContent('Texto presente'));
  });

  test('the whole workspace is localized (EN)', () => {
    render(<ExportWorkspace {...props({ copy: copyEn })} />);
    expect(screen.getByTestId('export-cta')).toHaveTextContent('Export PDF');
    expect(screen.getByTestId('export-final-check')).toHaveTextContent('Final check');
    expect(screen.getByTestId('export-status')).toHaveTextContent('Ready to export');
  });
});
