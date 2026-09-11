import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CookieConsent } from './CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders non-blocking bottom notice on first visit without full-screen modal', () => {
    render(<CookieConsent />);

    expect(screen.getByRole('region', { name: /preferencias de cookies|aviso de cookies|cookie notice/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceptar todas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rechazar opcionales/i })).toBeInTheDocument();
  });

  it('opens accessible settings dialog when settings button is clicked', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: /configuración/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/gestionar cookies/i)).toBeInTheDocument();
    expect(screen.getAllByText(/cookies necesarias/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/cookies de análisis/i)).toBeInTheDocument();
    expect(screen.getByText(/cookies de marketing/i)).toBeInTheDocument();
  });

  it('persists preferences and closes notice when Accept all is clicked', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: /aceptar todas/i }));

    expect(screen.queryByRole('region', { name: /aviso de cookies/i })).not.toBeInTheDocument();
    const stored = localStorage.getItem('anclora-cookie-consent-v1');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).necessary).toBe(true);
  });
});
