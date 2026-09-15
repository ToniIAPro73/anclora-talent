import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigatingLink } from './NavigatingLink';

const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

describe('NavigatingLink', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSearchParams.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
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

  it('Fase 9: clears loading state after a query-only navigation (pathname unchanged)', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { rerender } = render(
      <NavigatingLink href="/dashboard?projects=1" pendingLabel="Cargando..." className="test-link">
        Mis proyectos
      </NavigatingLink>,
    );

    const link = screen.getByRole('link', { name: 'Mis proyectos' });
    fireEvent.click(link);
    expect(link).toHaveAttribute('data-navigation-state', 'loading');

    // Same pathname ("/dashboard"), only the query string changed — this is
    // exactly what a delete-project redirect back to /dashboard looked like
    // before this fix: pathname never changes, so a pathname-only effect
    // never clears the pending state.
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseSearchParams.mockReturnValue(new URLSearchParams('projects=1'));

    rerender(
      <NavigatingLink href="/dashboard?projects=1" pendingLabel="Cargando..." className="test-link">
        Mis proyectos
      </NavigatingLink>,
    );

    expect(screen.getByRole('link', { name: 'Mis proyectos' })).toHaveAttribute(
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
