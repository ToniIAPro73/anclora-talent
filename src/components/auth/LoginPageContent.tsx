'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Github, Mail } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { TALENT_BRAND } from '@/lib/talent-brand';

export type OAuthAvailability = {
  google: boolean;
  github: boolean;
};

type LoginPageContentProps = {
  oauthAvailability?: OAuthAvailability;
};

const DEFAULT_OAUTH_AVAILABILITY: OAuthAvailability = { google: false, github: false };

const OAUTH_FEEDBACK_PATTERN = /^(google|github)_(cancelled|invalid_state|error)$/;

export function LoginPageContent({
  oauthAvailability = DEFAULT_OAUTH_AVAILABILITY,
}: LoginPageContentProps) {
  const router = useRouter();
  const { locale } = useUiPreferences();
  const t = resolveLocaleMessages(locale).auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Surface the outcome of a social OAuth round-trip (?oauth={provider}_{reason}).
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('oauth');
    if (!value) return;

    const match = OAUTH_FEEDBACK_PATTERN.exec(value);
    if (!match) return;

    const providerName = match[1] === 'google' ? t.google : t.github;
    const template =
      match[2] === 'cancelled'
        ? t.oauthCancelled
        : match[2] === 'invalid_state'
          ? t.oauthInvalidState
          : t.oauthError;

    setError(template.replace('{provider}', providerName));
  }, [t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(t.error);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="talent-auth-page relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[12%] top-[10%] h-28 w-28 rounded-full bg-[var(--accent-glow)] blur-3xl" />
        <div className="absolute bottom-[12%] right-[10%] h-36 w-36 rounded-full bg-[var(--accent-glow)] blur-3xl" />
        <div className="absolute left-[50%] top-[55%] h-24 w-24 rounded-full bg-[var(--accent-soft)] blur-2xl" />
      </div>

      <div className="relative w-full max-w-[460px]">
        <div className="talent-auth-card min-h-[560px] rounded-3xl p-6">
          <header className="pb-3 pt-2 text-center">
            <Image
              src={TALENT_BRAND.logoPath}
              alt={TALENT_BRAND.name}
              width={50}
              height={50}
              priority
              className="mx-auto mb-2 h-[50px] w-[50px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
            />
            <div className="talent-auth-divider mx-auto mb-1.5 h-px w-[50px]" />
            <h1 className="text-sm font-bold">{TALENT_BRAND.name}</h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-2.5" aria-label="Login form">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)]">
                {t.email}
                <span className="text-[var(--accent)]" aria-hidden="true">
                  {' '}
                  *
                </span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                required
                aria-required="true"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="talent-auth-input h-10 w-full rounded-2xl px-3 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--text-secondary)]"
              >
                {t.password}
                <span className="text-[var(--accent)]" aria-hidden="true">
                  {' '}
                  *
                </span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="talent-auth-input h-10 w-full rounded-2xl px-3 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                id="login-error"
                className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-3 text-xs text-[var(--danger)]"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="talent-auth-submit h-10 w-full rounded-2xl text-sm font-semibold"
            >
              {isLoading ? t.signingIn : t.signIn}
            </button>
          </form>

          <div className="mt-1.5 text-center">
            <span
              className="talent-auth-link cursor-not-allowed text-xs opacity-60"
              title={t.socialComingSoon}
            >
              {t.forgotPassword}
            </span>
          </div>

          <div className="talent-auth-box mt-1.5 rounded-2xl px-4 py-2 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              {t.noAccount}{' '}
              <Link href="/sign-up" className="talent-auth-link font-medium">
                {t.signUp}
              </Link>
            </p>
          </div>

          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center gap-3">
              <div className="talent-auth-separator-line h-px flex-1" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                {t.socialAccess}
              </span>
              <div className="talent-auth-separator-line h-px flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!oauthAvailability.google}
                onClick={
                  oauthAvailability.google
                    ? () => window.location.assign('/api/auth/oauth/google/start')
                    : undefined
                }
                title={oauthAvailability.google ? undefined : t.socialComingSoon}
                className={
                  oauthAvailability.google
                    ? 'talent-auth-social-button flex h-9 items-center justify-center gap-2 rounded-2xl text-xs font-medium'
                    : 'talent-auth-social-button flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-2xl text-xs font-medium opacity-50'
                }
              >
                <Mail size={14} aria-hidden="true" /> {t.google}
              </button>
              <button
                type="button"
                disabled={!oauthAvailability.github}
                onClick={
                  oauthAvailability.github
                    ? () => window.location.assign('/api/auth/oauth/github/start')
                    : undefined
                }
                title={oauthAvailability.github ? undefined : t.socialComingSoon}
                className={
                  oauthAvailability.github
                    ? 'talent-auth-social-button flex h-9 items-center justify-center gap-2 rounded-2xl text-xs font-medium'
                    : 'talent-auth-social-button flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-2xl text-xs font-medium opacity-50'
                }
              >
                <Github size={14} aria-hidden="true" /> {t.github}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {t.legalPrefix}{' '}
            <Link href="/terms" className="talent-auth-link underline">
              {t.terms}
            </Link>{' '}
            {t.legalMiddle}{' '}
            <Link href="/privacy" className="talent-auth-link underline">
              {t.privacy}
            </Link>{' '}
            {t.legalSuffix}
          </p>
        </div>
      </div>
    </div>
  );
}
