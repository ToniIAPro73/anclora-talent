import type { UiTheme } from '@/lib/ui-preferences/preferences';

export function getClerkPremiumAppearance(theme: UiTheme) {
  const isDark = theme === 'dark';

  return {
    elements: {
      card: 'shadow-none bg-transparent border-0',
      cardBox: 'shadow-none',
      headerTitle: 'font-black tracking-tight text-[var(--text-primary)]',
      headerSubtitle: 'text-[var(--text-secondary)]',
      socialButtonsBlockButton: isDark
        ? 'border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] shadow-none hover:border-[var(--border-strong)] hover:bg-[var(--page-surface-muted)]'
        : 'border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] shadow-none hover:border-[var(--border-strong)] hover:bg-white',
      socialButtonsBlockButtonText: 'font-semibold text-[var(--text-primary)]',
      dividerLine: 'bg-[var(--border-subtle)]',
      dividerText: 'font-semibold uppercase tracking-[0.22em] text-[11px] text-[var(--text-tertiary)]',
      formFieldLabel: 'font-semibold text-[var(--text-secondary)]',
      formFieldInput: `h-12 rounded-2xl border border-[var(--border-subtle)] ${isDark ? 'bg-[var(--surface-soft)] text-[var(--text-primary)]' : 'bg-[var(--surface-soft)] text-[var(--text-primary)]'} shadow-none focus:border-[var(--accent-mint)] focus:ring-0`,
      formButtonPrimary:
        'h-12 rounded-full border-0 bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)] shadow-[var(--shadow-soft)] hover:bg-[var(--button-highlight-hover)]',
      footerActionText: 'text-[var(--text-tertiary)]',
      footerActionLink: 'font-semibold text-[var(--text-primary)] hover:text-[var(--accent-mint)]',
      formResendCodeLink: 'text-[var(--accent-mint)] hover:text-[var(--button-highlight-hover)]',
      otpCodeFieldInput: `h-12 rounded-2xl border border-[var(--border-subtle)] ${isDark ? 'bg-[var(--surface-soft)] text-[var(--text-primary)]' : 'bg-[var(--surface-soft)] text-[var(--text-primary)]'} shadow-none focus:border-[var(--accent-mint)]`,
      alertText: 'text-sm',
      identityPreviewText: 'text-[var(--text-secondary)]',
      formFieldSuccessText: 'text-[var(--accent-mint)]',
    },
  } as const;
}
