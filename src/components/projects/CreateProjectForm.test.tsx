import { fireEvent, render, screen } from '@testing-library/react';
import { CreateProjectForm } from './CreateProjectForm';
import { vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

vi.mock('@/lib/projects/actions', () => ({
  createProjectAction: vi.fn(),
  saveProjectCompositionAction: vi.fn(),
  saveUserCompositionDefaultsAction: vi.fn(),
  setBrandForAllProjectsAction: vi.fn(),
}));

vi.mock('@/lib/brand/actions', () => ({
  setProjectBrandProfileAction: vi.fn(),
}));

vi.mock('@/lib/structure-profile/actions', () => ({
  extractStructureProfileAction: vi.fn(),
  saveStructureProfileAction: vi.fn(),
  extractReferenceEditorialProfileAction: vi.fn(),
  saveReferenceEditorialProfileAction: vi.fn(),
}));

describe('CreateProjectForm', () => {
  test('renders optional document import for supported formats', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    const fileInput = screen.getByTestId('source-document-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(screen.getByText('Arrastra tu documento aquí')).toBeInTheDocument();
    expect(fileInput).toHaveAttribute(
      'accept',
      '.pdf,.doc,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  test('includes the product template selector inside the creation form', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    const form = screen.getByTestId('create-project-form');
    const selector = screen.getByTestId('product-template-selector');
    expect(form).toContainElement(selector);
    expect(screen.getByTestId('product-template-input')).toHaveValue('standard-book');
  });

  test('presents explicit editorial style choices without the legacy toggle', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    expect(screen.getByTestId('new-project-editorial-style-section')).toBeInTheDocument();
    expect(screen.getByTestId('editorial-style-none')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByTestId('structure-toggle')).not.toBeInTheDocument();
  });

  test('reference style selection reveals an inline upload, not a modal trigger', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    fireEvent.click(screen.getByTestId('editorial-style-reference'));

    expect(screen.getByTestId('reference-document-inline-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reference-document-input')).toHaveAttribute('name', 'referenceDocument');
    expect(screen.getByTestId('reference-document-analyse')).toBeDisabled();
    expect(screen.queryByTestId('reference-editorial-dialog')).not.toBeInTheDocument();
  });

  test('fixed-pdf fail-closed: shows the storage-error banner and keeps the form usable', () => {
    const copy = resolveLocaleMessages('es').project;
    render(<CreateProjectForm copy={copy} fixedPdfError />);

    const banner = screen.getByTestId('fixed-pdf-storage-error');
    expect(banner).toHaveTextContent(copy.fixedPdfStorageErrorTitle);
    expect(banner).toHaveTextContent(copy.fixedPdfStorageErrorBody);
    // The form itself is still there — the user stays in the creation flow.
    expect(screen.getByTestId('create-project-form')).toBeInTheDocument();
    expect(screen.getByTestId('create-project-title-input')).toBeInTheDocument();
  });

  test('no banner when fixedPdfError is not set', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);
    expect(screen.queryByTestId('fixed-pdf-storage-error')).not.toBeInTheDocument();
  });
});
