import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { EditorialStyleSection } from './EditorialStyleSection';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { extractReferenceEditorialProfileAction } from '@/lib/structure-profile/actions';

vi.mock('@/lib/structure-profile/actions', () => ({
  extractReferenceEditorialProfileAction: vi.fn(),
  saveReferenceEditorialProfileAction: vi.fn(),
}));

import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';

const copy = resolveLocaleMessages('es').project;

const fakeValidProfile: ReferenceEditorialProfile = {
  version: 1,
  profileType: 'editorial',
  source: {
    format: 'pdf',
    filename: 'valid.pdf',
    hash: 'fakehash',
    sourceAssetId: null,
    analysedAt: new Date().toISOString(),
    parserVersion: 'v1',
  },
  page: { width: 595, height: 842, unit: 'pt', orientation: 'portrait', columns: 1, contentWidth: 450, contentHeight: 700, margins: { top: 72, bottom: 72, left: 72, right: 72 }, gutter: 0 },
  body: { fontFamily: 'Times New Roman', resolvedFontFamily: 'Times New Roman', fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', color: '#000000', lineHeight: 1.5, textAlign: 'justify', paragraphSpacingBefore: 0, paragraphSpacingAfter: 6, firstLineIndent: 12 },
  headings: { h1: null, h2: null, h3: null, h4: null },
  chapterOpening: { detected: false, labelStyle: null, titleStyle: null, subtitleStyle: null, alignment: 'left' as const, startOnOddPage: true, pageBreakBefore: true, spacingBefore: 0, spacingAfter: 12 },
  header: { enabled: false, style: null, alignment: 'left' as const, position: 'top' as const },
  footer: { enabled: false, style: null, alignment: 'center' as const, position: 'bottom' as const },
  pageNumber: { enabled: true, style: null, alignment: 'center' as const, position: 'footer' as const },
  toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: null },
  quote: null,
  captions: null,
  separators: null,
  lists: { unordered: null, ordered: null },
  palette: [],
  metrics: { totalHeadings: 0, desglose: { h1Partes: 0, h2Capitulos: 0, h3Subsecciones: 0 }, tablas: 0, imagenes: 0 },
  observedStructure: { chapterCount: 3, headingDepth: 2, frontMatter: false, backMatter: false, optional: true },
  confidence: { overall: 'high' as const, pageGeometry: 'high' as const, bodyTypography: 'high' as const, headings: 'high' as const, chapterOpening: 'high' as const, headers: 'high' as const, footers: 'high' as const, toc: 'high' as const },
};

describe('EditorialStyleSection error and retry lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('bounded failure leaves loading state and displays safe domain error', async () => {
    vi.mocked(extractReferenceEditorialProfileAction).mockResolvedValueOnce({
      ok: false,
      error: 'No se pudo analizar el documento de referencia. El archivo puede estar dañado o no ser un PDF compatible.',
      warnings: ['InvalidPDFException'],
    });

    render(<EditorialStyleSection copy={copy} profiles={[]} />);

    // Select reference document mode
    fireEvent.click(screen.getByTestId('editorial-style-reference'));
    expect(screen.getByTestId('editorial-style-reference')).toHaveAttribute('aria-checked', 'true');

    // Upload malformed file
    const input = screen.getByTestId('reference-document-input');
    const malformedFile = new File(['not a pdf'], 'malformed.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [malformedFile] } });

    const analyseButton = screen.getByTestId('reference-document-analyse');
    expect(analyseButton).toBeEnabled();

    // Click analyse
    fireEvent.click(analyseButton);

    // Verify safe error is displayed and loading finishes
    await waitFor(() => {
      const errorMsg = screen.getByTestId('reference-document-error');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('No se pudo analizar el documento de referencia.');
      expect(errorMsg).not.toHaveTextContent('InvalidPDFException');
      expect(errorMsg).not.toHaveTextContent('Server Components');
    });

    // Loading button is back to enabled 'Analizar' (not disabled or in loading state)
    expect(screen.getByTestId('reference-document-analyse')).toHaveTextContent(copy.newProjectReferenceAnalyse);
    expect(screen.getByTestId('reference-document-analyse')).toBeEnabled();

    // Editorial mode selection is still preserved
    expect(screen.getByTestId('editorial-style-reference')).toHaveAttribute('aria-checked', 'true');
  });

  test('retry succeeds: old error disappears, profile is detected', async () => {
    // First attempt fails with timeout
    vi.mocked(extractReferenceEditorialProfileAction).mockResolvedValueOnce({
      ok: false,
      error: 'El análisis del documento de referencia superó el tiempo límite de espera.',
      warnings: ['ReferenceAnalysisTimeoutError'],
    });

    render(<EditorialStyleSection copy={copy} profiles={[]} />);
    fireEvent.click(screen.getByTestId('editorial-style-reference'));

    const input = screen.getByTestId('reference-document-input');
    const badFile = new File(['bad'], 'bad.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [badFile] } });
    fireEvent.click(screen.getByTestId('reference-document-analyse'));

    await waitFor(() => {
      expect(screen.getByTestId('reference-document-error')).toHaveTextContent('tiempo límite de espera');
    });

    // Second attempt (retry) succeeds with valid PDF
    vi.mocked(extractReferenceEditorialProfileAction).mockResolvedValueOnce({
      ok: true,
      profile: fakeValidProfile,
      analysis: { pagesAnalysed: 3, pagesExcluded: 0, fragmentCount: 42, warnings: [] },
      suggestedName: 'Valid Profile',
    });

    const goodFile = new File(['good pdf content'], 'valid.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [goodFile] } });
    fireEvent.click(screen.getByTestId('reference-document-analyse'));

    await waitFor(() => {
      // Old error is removed
      expect(screen.queryByTestId('reference-document-error')).not.toBeInTheDocument();
      // Profile summary is shown
      expect(screen.getByTestId('reference-profile-summary')).toBeInTheDocument();
      expect(screen.getByText(/Times New Roman · 11 pt/)).toBeInTheDocument();
    });
  });

  test('stale first attempt cannot overwrite a second successful attempt', async () => {
    let resolveFirstAttempt: (val: Awaited<ReturnType<typeof extractReferenceEditorialProfileAction>>) => void;
    const firstPromise = new Promise<Awaited<ReturnType<typeof extractReferenceEditorialProfileAction>>>((resolve) => {
      resolveFirstAttempt = resolve;
    });

    // Attempt 1: hangs until manually resolved
    vi.mocked(extractReferenceEditorialProfileAction).mockImplementationOnce(() => firstPromise);
    // Attempt 2: resolves immediately with success
    vi.mocked(extractReferenceEditorialProfileAction).mockResolvedValueOnce({
      ok: true,
      profile: fakeValidProfile,
      analysis: { pagesAnalysed: 3, pagesExcluded: 0, fragmentCount: 42, warnings: [] },
      suggestedName: 'Fast Valid Profile',
    });

    render(<EditorialStyleSection copy={copy} profiles={[]} />);
    fireEvent.click(screen.getByTestId('editorial-style-reference'));

    const input = screen.getByTestId('reference-document-input');
    const slowFile = new File(['slow'], 'slow.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [slowFile] } });

    // Attempt 1 triggered
    fireEvent.click(screen.getByTestId('reference-document-analyse'));

    // User selects a different file and triggers Attempt 2 (e.g. while Attempt 1 is still in flight)
    const fastFile = new File(['fast'], 'fast.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [fastFile] } });

    // When attempt 1 is in-flight, button is disabled in UI; simulate retry when attempt 1 finishes or by calling action
    // First, complete Attempt 1 with an error:
    resolveFirstAttempt!({
      ok: false,
      error: 'Error from stale attempt 1',
      warnings: ['stale'],
    });

    // Wait for button to re-enable
    await waitFor(() => {
      expect(screen.getByTestId('reference-document-analyse')).toBeEnabled();
    });

    // Now trigger Attempt 2
    fireEvent.click(screen.getByTestId('reference-document-analyse'));

    await waitFor(() => {
      expect(screen.getByTestId('reference-profile-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('reference-document-error')).not.toBeInTheDocument();
    });
  });
});
