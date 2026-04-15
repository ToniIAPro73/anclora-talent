import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigatingLink } from './NavigatingLink';

const mockPush = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockUsePathname(),
}));

describe('NavigatingLink', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUsePathname.mockReset();
  });

  it('clears the loading state after the pathname changes', () => {
    mockUsePathname.mockReturnValue('/dashboard');

    const { rerender } = render(
      <NavigatingLink href="/projects" pendingLabel="Cargando..." className="test-link">
        Proyectos
      </NavigatingLink>,
    );

    const button = screen.getByRole('button', { name: 'Proyectos' });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/projects');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-navigation-state', 'loading');

    mockUsePathname.mockReturnValue('/projects');

    rerender(
      <NavigatingLink href="/projects" pendingLabel="Cargando..." className="test-link">
        Proyectos
      </NavigatingLink>,
    );

    expect(screen.getByRole('button', { name: 'Proyectos' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Proyectos' })).toHaveAttribute(
      'data-navigation-state',
      'idle',
    );
  });
});
