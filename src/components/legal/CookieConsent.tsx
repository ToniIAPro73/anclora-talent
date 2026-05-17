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
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(STORAGE_KEY);
  });
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
        return { necessary: true, session: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing), updatedAt: parsed.updatedAt ?? '', version: 'v1' };
      }
    } catch {}
    return defaults;
  });

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
      <button type="button" aria-label={en ? 'Cookie preferences' : 'Preferencias de cookies'} onClick={() => { setOpen(true); setSettings(true); }} className="fixed bottom-5 left-5 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-mint)]/40 bg-[var(--surface-overlay)] text-[var(--accent-mint)] shadow-2xl backdrop-blur">
        <Cookie className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="talent-cookie-title">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 text-[var(--text-primary)] shadow-2xl">
            <h2 id="talent-cookie-title" className="text-2xl font-semibold">{settings ? (en ? 'Manage cookies' : 'Gestionar cookies') : (en ? 'Cookie preferences' : 'Preferencias de cookies')}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{en ? 'Necessary cookies support session, security and preferences. Optional analytics or marketing remain disabled unless accepted.' : 'Las cookies necesarias soportan sesión, seguridad y preferencias. Las opcionales de análisis o marketing permanecen desactivadas salvo consentimiento.'}</p>
            {settings ? (
              <div className="mt-5 space-y-3">
                <CookieRow title={en ? 'Necessary cookies' : 'Cookies necesarias'} description={en ? 'Session, security and app operation. They cannot be disabled.' : 'Sesión, seguridad y operación. No se pueden desactivar.'} checked disabled onChange={() => {}} />
                <CookieRow title={en ? 'Analytics cookies' : 'Cookies de análisis'} description={en ? 'Help improve product stability and usage.' : 'Ayudan a mejorar estabilidad y uso del producto.'} checked={preferences.analytics} onChange={(analytics) => setPreferences((current) => ({ ...current, analytics }))} />
                <CookieRow title={en ? 'Marketing cookies' : 'Cookies de marketing'} description={en ? 'Reserved for relevant communications. They do not enable scripts that are not present.' : 'Reservadas para comunicaciones relevantes. No activan scripts inexistentes.'} checked={preferences.marketing} onChange={(marketing) => setPreferences((current) => ({ ...current, marketing }))} />
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {!settings ? <button type="button" onClick={() => persist({ ...defaults, analytics: true, marketing: true })} className="rounded-full bg-[var(--accent-mint)] px-5 py-3 text-sm font-semibold text-black">{en ? 'Accept all' : 'Aceptar todas'}</button> : null}
              <button type="button" onClick={() => settings ? persist(preferences) : setSettings(true)} className="rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold">{settings ? (en ? 'Save preferences' : 'Guardar preferencias') : (en ? 'Settings' : 'Configuración')}</button>
              <button type="button" onClick={() => persist(defaults)} className="rounded-full px-5 py-3 text-sm font-semibold text-[var(--text-secondary)]">{en ? 'Reject optional' : 'Rechazar opcionales'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CookieRow({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
      <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{description}</span></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[var(--accent-mint)]" />
    </label>
  );
}
