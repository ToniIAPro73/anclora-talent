import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigatingLink } from './NavigatingLink';

const mockUsePathname = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('NavigatingLink', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it('uses a native anchor and clears loading state after pathname changes', () => {
    mockUsePathname.mockReturnValue('/dashboard');

    const { rerender } = render(
      <NavigatingLink href="/projects" pendingLabel="Cargando..." className="test-link">
        Proyectos
      </NavigatingLink>,
    );

    const link = screen.getByRole('link', { name: 'Proyectos' });
    fireEvent.click(link);

    expect(link).toHaveAttribute('href', '/projects');
    expect(link).not.toBeDisabled();
    expect(link).toHaveAttribute('data-navigation-state', 'loading');

    mockUsePathname.mockReturnValue('/projects');

    rerender(
      <NavigatingLink href="/projects" pendingLabel="Cargando..." className="test-link">
        Proyectos
      </NavigatingLink>,
    );

    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute(
      'data-navigation-state',
      'idle',
    );
  });

  it('does not intercept modified clicks', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<NavigatingLink href="/projects">Proyectos</NavigatingLink>);
    const link = screen.getByRole('link', { name: 'Proyectos' });

    fireEvent.click(link, { metaKey: true });

    expect(link).toHaveAttribute('data-navigation-state', 'idle');
  });
});
