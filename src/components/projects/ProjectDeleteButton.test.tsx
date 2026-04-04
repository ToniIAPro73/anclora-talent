import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectDeleteButton } from './ProjectDeleteButton';

vi.mock('@/lib/projects/actions', () => ({
  deleteProjectAction: vi.fn(),
}));

describe('ProjectDeleteButton', () => {
  test('renders a destructive submit button for dashboard cards', () => {
    render(<ProjectDeleteButton label="Eliminar proyecto" projectId="project-123" confirmMessage="Seguro?" />);

    const button = screen.getByRole('button', { name: 'Eliminar proyecto' });
    expect(button).toBeInTheDocument();
    expect(screen.getByDisplayValue('project-123')).toHaveAttribute('type', 'hidden');
  });

  test('cancels submission when confirmation is rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectDeleteButton label="Eliminar proyecto" projectId="project-123" confirmMessage="Seguro?" />);

    const form = screen.getByRole('button', { name: 'Eliminar proyecto' }).closest('form');
    expect(form).not.toBeNull();

    const submitEvent = createEvent.submit(form!);
    fireEvent(form!, submitEvent);

    expect(confirmSpy).toHaveBeenCalledWith('Seguro?');
    expect(submitEvent.defaultPrevented).toBe(true);
    confirmSpy.mockRestore();
  });
});
