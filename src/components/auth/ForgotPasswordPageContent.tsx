'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { TALENT_BRAND } from '@/lib/talent-brand';

export function ForgotPasswordPageContent() {
  const { locale } = useUiPreferences();
  const t = resolveLocaleMessages(locale).auth;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('idle');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/password-recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (response.ok || response.status === 202) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(
          payload?.error === 'RECOVERY_UNAVAILABLE' ? t.recoveryUnavailable : t.recoveryRequestFailed,
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage(t.recoveryRequestFailed);
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
            <h1 className="text-sm font-bold">{t.forgotPasswordTitle}</h1>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {t.forgotPasswordDescription}
            </p>
          </header>

          {status === 'success' ? (
            <div
              className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3 text-xs text-[var(--text-primary)]"
              role="status"
              aria-live="polite"
            >
              {t.recoveryRequestAccepted}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3" aria-label="Password recovery form">
              <div className="space-y-1">
                <label htmlFor="recovery-email" className="block text-xs font-medium text-[var(--text-secondary)]">
                  {t.email}
                </label>
                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                disabled={isLoading}
                aria-busy={isLoading}
                className="talent-auth-submit h-10 w-full rounded-2xl text-sm font-semibold"
              >
                {isLoading ? t.sendingRecoveryEmail : t.sendRecoveryEmail}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-xs">
            <Link href="/sign-in" className="talent-auth-link font-medium">
              {t.backToSignIn}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
