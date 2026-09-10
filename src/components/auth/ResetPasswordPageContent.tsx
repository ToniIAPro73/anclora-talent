'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { TALENT_BRAND } from '@/lib/talent-brand';

export function ResetPasswordPageContent({ initialToken }: { initialToken: string }) {
  const { locale } = useUiPreferences();
  const t = resolveLocaleMessages(locale).auth;
  const [token] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatus('idle');

    if (password !== confirmation) {
      setStatus('error');
      setErrorMessage(t.passwordMismatch);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/password-recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(
          payload?.error === 'INVALID_OR_EXPIRED_TOKEN' ? t.invalidResetToken : t.passwordResetError,
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage(t.passwordResetError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="talent-auth-page relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[12%] top-[10%] h-28 w-28 rounded-full bg-[var(--accent-glow)] blur-3xl" />
        <div className="absolute bottom-[12%] right-[10%] h-36 w-36 rounded-full bg-[var(--accent-glow)] blur-3xl" />
      </div>
      <div className="relative w-full max-w-[460px]">
        <div className="talent-auth-card rounded-3xl p-6">
          <header className="pb-5 pt-2 text-center">
            <Image
              src={TALENT_BRAND.logoPath}
              alt={TALENT_BRAND.name}
              width={50}
              height={50}
              priority
              className="mx-auto mb-2 h-[50px] w-[50px] object-contain"
            />
            <h1 className="text-sm font-bold">{t.resetPasswordTitle}</h1>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {t.resetPasswordDescription}
            </p>
          </header>

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3 text-xs" role="status">
                {t.passwordResetSuccess}
              </div>
              <Link href="/sign-in" className="talent-auth-submit flex h-10 items-center justify-center rounded-2xl text-sm font-semibold">
                {t.backToSignIn}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3" aria-label="Reset password form">
              <div className="space-y-1">
                <label htmlFor="new-password" className="block text-xs font-medium text-[var(--text-secondary)]">
                  {t.newPassword}
                </label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  aria-required="true"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="talent-auth-input h-10 w-full rounded-2xl px-3 text-sm"
                />
                <p className="text-[11px] text-[var(--text-tertiary)]">{t.passwordRequirements}</p>
              </div>
              <div className="space-y-1">
                <label htmlFor="confirm-password" className="block text-xs font-medium text-[var(--text-secondary)]">
                  {t.confirmPassword}
                </label>
                <input
                  id="confirm-password"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  aria-required="true"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="talent-auth-input h-10 w-full rounded-2xl px-3 text-sm"
                />
              </div>
              {errorMessage && (
                <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-3 text-xs text-[var(--danger)]" role="alert">
                  {errorMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || !token}
                aria-busy={isLoading}
                className="talent-auth-submit h-10 w-full rounded-2xl text-sm font-semibold"
              >
                {isLoading ? t.resettingPassword : t.resetPassword}
              </button>
              {!token && <p className="text-xs text-[var(--danger)]" role="alert">{t.invalidResetToken}</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
