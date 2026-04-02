import { render, screen } from '@testing-library/react';
import { CreateProjectForm } from './CreateProjectForm';
import { vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

vi.mock('@/lib/projects/actions', () => ({
  createProjectAction: vi.fn(),
}));

describe('CreateProjectForm', () => {
  test('renders optional document import for supported formats', () => {
    render(<CreateProjectForm copy={resolveLocaleMessages('es').project} />);

    const fileInput = screen.getByTestId('source-document-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.pdf,.doc,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});
