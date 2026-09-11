'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon, Globe, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import type { MarketingNav } from './marketing-data';
import type { MarketingCta } from './marketing-helpers';

type LandingHeaderProps = {
  nav: MarketingNav;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta | null;
  isAuthenticated: boolean;
};

export function LandingHeader({
  nav,
  primaryCta,
  secondaryCta,
  isAuthenticated,
}: LandingHeaderProps) {
  const { theme, locale, setTheme, setLocale } = useUiPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLocale = () => {
    setLocale(locale === 'es' ? 'en' : 'es');
  };

  const navLinks = [
    { href: '#caracteristicas', label: nav.features },
    { href: '#estudio', label: nav.studio },
    { href: '#vitrina', label: nav.showcase },
    { href: '#audiencias', label: nav.useCases },
    { href: '#acceso', label: nav.pricing },
    { href: '#faq', label: nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--background)]/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-[var(--text-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <BrandLogo size={24} priority />
          <span className="text-base font-semibold tracking-tight">Anclora Talent</span>
        </Link>

        {/* Desktop Nav */}
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-6 md:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={nav.toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Locale Toggle */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={nav.toggleLocale}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* Auth CTAs */}
          {isAuthenticated ? (
            <Link
              href={primaryCta.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-xs font-semibold text-[var(--accent-fg)] shadow-sm transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {primaryCta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
              <Link
                href={primaryCta.href}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-xs font-semibold text-[var(--accent-fg)] shadow-sm transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {primaryCta.label}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={nav.toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={nav.toggleLocale}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 text-xs font-bold uppercase text-[var(--text-secondary)]"
          >
            {locale.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? nav.closeMenu : nav.openMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--background)] px-4 py-6 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Menú móvil">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-2.5 border-t border-[var(--border-subtle)] pt-5">
            {isAuthenticated ? (
              <Link
                href={primaryCta.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]"
              >
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href={primaryCta.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]"
                >
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)]"
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
