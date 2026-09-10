import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ priority, alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} alt={alt} data-priority={priority ? 'true' : undefined} />
  ),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { ForgotPasswordPageContent } from './ForgotPasswordPageContent';
import { ResetPasswordPageContent } from './ResetPasswordPageContent';

const copy = resolveLocaleMessages('es').auth;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ForgotPasswordPageContent', () => {
  test('shows enumeration-safe accepted state after request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 202, ok: true, json: async () => ({ ok: true }) }));
    render(<ForgotPasswordPageContent />);

    fireEvent.change(screen.getByLabelText(copy.email), { target: { value: 'author@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: copy.sendRecoveryEmail }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy.recoveryRequestAccepted));
  });

  test('states capability failure without exposing account existence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 503, ok: false, json: async () => ({ error: 'RECOVERY_UNAVAILABLE' }) }),
    );
    render(<ForgotPasswordPageContent />);

    fireEvent.change(screen.getByLabelText(copy.email), { target: { value: 'author@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: copy.sendRecoveryEmail }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(copy.recoveryUnavailable));
  });
});

describe('ResetPasswordPageContent', () => {
  test('rejects mismatched confirmation before calling reset route', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPasswordPageContent initialToken={'a'.repeat(43)} />);

    fireEvent.change(screen.getByLabelText(copy.newPassword), { target: { value: 'valid-pass-1' } });
    fireEvent.change(screen.getByLabelText(copy.confirmPassword), { target: { value: 'different-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: copy.resetPassword }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.passwordMismatch);
  });

  test('shows success after server atomically accepts reset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    render(<ResetPasswordPageContent initialToken={'a'.repeat(43)} />);

    fireEvent.change(screen.getByLabelText(copy.newPassword), { target: { value: 'valid-pass-1' } });
    fireEvent.change(screen.getByLabelText(copy.confirmPassword), { target: { value: 'valid-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: copy.resetPassword }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy.passwordResetSuccess));
  });
});
