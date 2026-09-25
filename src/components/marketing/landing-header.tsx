'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe, Menu, Moon, Sun, X } from 'lucide-react';
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

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleLocale = () => setLocale(locale === 'es' ? 'en' : 'es');

  const navLinks = [
    { href: '#producto', label: nav.features },
    { href: '#audiencias', label: nav.useCases },
    { href: '#acceso', label: nav.pricing },
    { href: '#faq', label: nav.faq },
  ];

  return (
    <header className="talent-landing-header sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--background)]/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:px-4 lg:px-8">
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
          className="hidden items-center gap-3 md:flex lg:gap-6"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:tracking-[0.14em]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="hidden items-center gap-1.5 md:flex lg:gap-3">
          <button
            type="button"
            data-testid="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label={nav.toggleTheme}
            className="ac-button ac-button--ghost ac-button--compact ac-button--icon talent-shell-theme-flip"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            data-testid="landing-locale-toggle"
            onClick={toggleLocale}
            aria-label={nav.toggleLocale}
            className="ac-button ac-button--ghost ac-button--compact talent-shell-locale-pill"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* Auth CTAs */}
          {isAuthenticated ? (
            <Link href={primaryCta.href} className="ac-button ac-button--compact ac-button--primary">
              {primaryCta.label}
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 lg:gap-2">
              {secondaryCta ? (
                <Link href={secondaryCta.href} className="ac-button ac-button--compact ac-button--secondary">
                  {secondaryCta.label}
                </Link>
              ) : null}
              <Link href={primaryCta.href} className="ac-button ac-button--compact ac-button--primary">
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
            className="ac-button ac-button--ghost ac-button--compact ac-button--icon talent-shell-theme-flip"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={nav.toggleLocale}
            className="ac-button ac-button--ghost ac-button--compact talent-shell-locale-pill"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>{locale.toUpperCase()}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? nav.closeMenu : nav.openMenu}
            className="ac-button ac-button--ghost ac-button--compact ac-button--icon talent-shell-mobile-menu-button"
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
                className="ac-button ac-button--compact ac-button--primary w-full"
              >
                {primaryCta.label}
              </Link>
            ) : (
              <>
                <Link
                  href={primaryCta.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="ac-button ac-button--compact ac-button--primary w-full"
                >
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="ac-button ac-button--compact ac-button--secondary w-full"
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
