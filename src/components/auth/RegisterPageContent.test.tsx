import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { RegisterPageContent } from './RegisterPageContent';

const copy = resolveLocaleMessages('es').auth;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('RegisterPageContent', () => {
  test('maps server validation to field guidance, focus and preserved values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'INVALID_PASSWORD' }),
      }),
    );

    render(<RegisterPageContent />);
    fireEvent.change(screen.getByLabelText(new RegExp(copy.fullName)), { target: { value: 'Autora Uno' } });
    fireEvent.change(screen.getByLabelText(new RegExp(copy.email)), { target: { value: 'autora@example.com' } });
    fireEvent.change(screen.getByLabelText(new RegExp(copy.password)), { target: { value: 'débil' } });
    fireEvent.click(screen.getByRole('button', { name: copy.createAccount }));

    await waitFor(() => expect(screen.getByText(copy.invalidPassword)).toBeInTheDocument());
    expect(screen.getByLabelText(new RegExp(copy.fullName))).toHaveValue('Autora Uno');
    expect(screen.getByLabelText(new RegExp(copy.email))).toHaveValue('autora@example.com');
    expect(screen.getByLabelText(new RegExp(copy.password))).toHaveFocus();
    expect(screen.getByLabelText(new RegExp(copy.password))).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(new RegExp(copy.password))).toHaveAttribute(
      'aria-describedby',
      'register-password-error password-hint',
    );
  });

  test('exposes the same OAuth providers as sign-in when availability enables them', () => {
    render(<RegisterPageContent oauthAvailability={{ google: true, github: false }} />);

    expect(screen.getByRole('button', { name: new RegExp(copy.google) })).toBeEnabled();
    expect(screen.getByRole('button', { name: new RegExp(copy.github) })).toBeDisabled();
  });
});
