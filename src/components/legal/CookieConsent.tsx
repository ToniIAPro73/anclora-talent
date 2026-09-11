'use client';

import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

type CookiePreferences = { necessary: true; session: true; analytics: boolean; marketing: boolean; updatedAt: string; version: 'v1' };
const STORAGE_KEY = 'anclora-cookie-consent-v1';
const defaults: CookiePreferences = { necessary: true, session: true, analytics: false, marketing: false, updatedAt: '', version: 'v1' };

export function CookieConsent() {
  const { locale } = useUiPreferences();
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaults);

  useEffect(() => {
    // Reads localStorage after mount to avoid SSR/CSR hydration mismatch;
    // the resulting setState calls are intentionally client-only, not a
    // synchronization loop.
    /* eslint-disable react-hooks/set-state-in-effect */
    let stored = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
        setPreferences({ necessary: true, session: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing), updatedAt: parsed.updatedAt ?? '', version: 'v1' });
        stored = true;
      }
    } catch {
      stored = false;
    }
    setOpen(!stored);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const listener = () => { setOpen(true); setSettings(true); };
    window.addEventListener('anclora:open-cookie-preferences', listener);
    return () => window.removeEventListener('anclora:open-cookie-preferences', listener);
  }, []);

  function persist(next: CookiePreferences) {
    const value = { ...next, necessary: true as const, session: true as const, updatedAt: new Date().toISOString(), version: 'v1' as const };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setPreferences(value);
    setOpen(false);
    setSettings(false);
  }

  return (
    <>
      {/* Floating trigger button: hidden on mobile to avoid overlap (accessible via footer) */}
      <button
        type="button"
        aria-label={en ? 'Cookie preferences' : 'Preferencias de cookies'}
        onClick={() => { setOpen(true); setSettings(true); }}
        className="fixed bottom-5 left-5 z-40 hidden md:inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--surface-overlay)] text-[var(--accent-text)] shadow-2xl backdrop-blur transition hover:scale-105"
      >
        <Cookie className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        settings ? (
          /* Full settings modal when explicitly requested */
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="talent-cookie-title">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-[var(--text-primary)] shadow-2xl">
              <h2 id="talent-cookie-title" className="text-2xl font-semibold">{en ? 'Manage cookies' : 'Gestionar cookies'}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{en ? 'Necessary cookies support session, security and preferences. Optional analytics or marketing remain disabled unless accepted.' : 'Las cookies necesarias soportan sesión, seguridad y preferencias. Las opcionales de análisis o marketing permanecen desactivadas salvo consentimiento.'}</p>
              <div className="mt-5 space-y-3">
                <CookieRow title={en ? 'Necessary cookies' : 'Cookies necesarias'} description={en ? 'Session, security and app operation. They cannot be disabled.' : 'Sesión, seguridad y operación. No se pueden desactivar.'} checked disabled onChange={() => {}} />
                <CookieRow title={en ? 'Analytics cookies' : 'Cookies de análisis'} description={en ? 'Help improve product stability and usage.' : 'Ayudan a mejorar estabilidad y uso del producto.'} checked={preferences.analytics} onChange={(analytics) => setPreferences((current) => ({ ...current, analytics }))} />
                <CookieRow title={en ? 'Marketing cookies' : 'Cookies de marketing'} description={en ? 'Reserved for relevant communications. They do not enable scripts that are not present.' : 'Reservadas para comunicaciones relevantes. No activan scripts inexistentes.'} checked={preferences.marketing} onChange={(marketing) => setPreferences((current) => ({ ...current, marketing }))} />
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => persist(defaults)} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{en ? 'Reject optional' : 'Rechazar opcionales'}</button>
                <button type="button" onClick={() => persist(preferences)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]">{en ? 'Save preferences' : 'Guardar preferencias'}</button>
                <button type="button" onClick={() => persist({ ...defaults, analytics: true, marketing: true })} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">{en ? 'Accept all' : 'Aceptar todas'}</button>
              </div>
            </div>
          </div>
        ) : (
          /* Non-blocking, elegant bottom banner on first arrival */
          <div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-4xl" role="region" aria-label={en ? 'Cookie notice' : 'Aviso de cookies'}>
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-strong)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 hidden rounded-full bg-[var(--accent-soft)] p-2 text-[var(--accent-text)] sm:block">
                  <Cookie className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {en ? 'Cookie preferences' : 'Preferencias de cookies'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] max-w-xl">
                    {en
                      ? 'Necessary cookies support session and security. Optional analytics remain disabled unless you choose to accept them.'
                      : 'Utilizamos cookies necesarias para la seguridad y preferencias de sesión. Las cookies opcionales de análisis permanecen desactivadas salvo tu consentimiento.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => persist(defaults)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  {en ? 'Reject optional' : 'Rechazar opcionales'}
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(true)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                >
                  {en ? 'Settings' : 'Configuración'}
                </button>
                <button
                  type="button"
                  onClick={() => persist({ ...defaults, analytics: true, marketing: true })}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-black shadow-sm transition hover:opacity-90"
                >
                  {en ? 'Accept all' : 'Aceptar todas'}
                </button>
              </div>
            </div>
          </div>
        )
      ) : null}
    </>
  );
}

function CookieRow({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
      <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{description}</span></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
}
