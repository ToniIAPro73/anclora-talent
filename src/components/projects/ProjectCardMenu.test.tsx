import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCardMenu } from './ProjectCardMenu';

vi.mock('./ProjectDeleteButton', () => ({
  ProjectDeleteButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

describe('ProjectCardMenu', () => {
  const defaultProps = {
    projectId: 'proj-123',
    menuLabel: 'Acciones del proyecto',
    deleteLabel: 'Eliminar proyecto',
    confirmMessage: '¿Deseas eliminar este proyecto?',
    documentDataLabel: 'Información del documento',
    onDocumentData: vi.fn(),
  };

  it('renders the menu trigger with canonical secondary icon button classes and accessibility attributes', () => {
    render(<ProjectCardMenu {...defaultProps} />);

    const button = screen.getByTestId('project-card-menu');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Acciones del proyecto');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Canonical button system classes
    expect(button).toHaveClass('ac-button');
    expect(button).toHaveClass('ac-button--secondary');
    expect(button).toHaveClass('ac-button--compact');
    expect(button).toHaveClass('ac-button--icon');
    expect(button).toHaveClass('talent-button--secondary');

    // Icon child present
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('opens menu and triggers actions on click', () => {
    const onDocumentData = vi.fn();
    render(<ProjectCardMenu {...defaultProps} onDocumentData={onDocumentData} />);

    const button = screen.getByTestId('project-card-menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const documentDataBtn = screen.getByTestId('project-card-document-data-button');
    fireEvent.click(documentDataBtn);
    expect(onDocumentData).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
