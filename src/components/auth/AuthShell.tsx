'use client';

import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

type AuthShellProps = {
  mode: 'sign-in' | 'sign-up';
  children: React.ReactNode;
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).auth;
  const copy = mode === 'sign-in' ? messages.signIn : messages.signUp;

  return (
    <main className="min-h-screen bg-[var(--app-gradient)] px-4 py-6 text-[var(--text-primary)] sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="ac-surface-panel relative overflow-hidden bg-[var(--shell-surface)] p-8 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-[var(--accent-glow)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-52 w-52 rounded-full bg-[var(--accent-glow-soft)] blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="ac-button ac-button--ghost ac-button--sm inline-flex w-fit pointer-events-none">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-black tracking-[var(--track-hero)] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                {copy.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">01</p>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{messages.pillars[0]}</p>
              </div>
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">02</p>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{messages.pillars[1]}</p>
              </div>
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">03</p>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{messages.pillars[2]}</p>
              </div>
            </div>

            <div className="ac-surface-panel ac-surface-panel--subtle rounded-[30px] p-6">
              <p className="ac-surface-panel__eyebrow text-[var(--accent-mint)]">{messages.contractEyebrow}</p>
              <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[var(--text-primary)]">
                {copy.accent}
              </p>
            </div>
          </div>
        </section>

        <section className="ac-surface-panel flex items-center justify-center bg-[var(--auth-surface)] p-4 backdrop-blur sm:p-6">
          <div className="w-full max-w-[460px] rounded-[32px] border border-[var(--border-subtle)] bg-[var(--auth-card-surface)] p-3 shadow-[var(--shadow-soft)]">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
