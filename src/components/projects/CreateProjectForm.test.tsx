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

  test('structure toggle renders no structureSchema field until the wizard is confirmed (G2)', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    const form = screen.getByTestId('create-project-form');
    // Toggle off: no hidden structureSchema field at all.
    expect(form.querySelector('input[name="structureSchema"]')).toBeNull();

    fireEvent.click(screen.getByTestId('structure-toggle'));
    expect(screen.getByTestId('structure-configure-button')).toBeInTheDocument();
    // Toggle on but unconfirmed: still nothing to submit (jamás aplicación silenciosa).
    expect(form.querySelector('input[name="structureSchema"]')).toBeNull();
  });

  test('unchecking the structure toggle clears any confirmed schema', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    const toggle = screen.getByTestId('structure-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(screen.queryByTestId('structure-configure-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('structure-schema-input')).not.toBeInTheDocument();
  });
});
