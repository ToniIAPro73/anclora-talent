import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DocumentImporter } from './DocumentImporter';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

describe('DocumentImporter', () => {
  test('renders a richer dropzone while preserving the source document file input', () => {
    render(<DocumentImporter copy={resolveLocaleMessages('es').project} />);

    expect(screen.getByText('Documento base opcional')).toBeInTheDocument();
    expect(screen.getByText('Arrastra tu documento aquí')).toBeInTheDocument();

    const fileInput = screen.getByTestId('source-document-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute(
      'accept',
      '.pdf,.doc,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  test('shows the selected file name after picking a document', () => {
    render(<DocumentImporter copy={resolveLocaleMessages('es').project} />);

    const fileInput = screen.getByTestId('source-document-input');
    const file = new File(['contenido'], 'capitulos.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Archivo listo: capitulos.docx')).toBeInTheDocument();
  });
});
