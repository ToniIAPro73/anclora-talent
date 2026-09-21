import { describe, expect, test } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { getPrimaryCta, getSecondaryCta } from './marketing-helpers';

const esNav = resolveLocaleMessages('es').landing.nav;
const enNav = resolveLocaleMessages('en').landing.nav;

describe('marketing helpers', () => {
  test('returns signup as the primary CTA for anonymous users (ES)', () => {
    expect(getPrimaryCta(null, esNav)).toEqual({ href: '/sign-up', label: 'Crear cuenta' });
  });

  test('returns dashboard as the primary CTA for authenticated users (ES)', () => {
    expect(getPrimaryCta('user_123', esNav)).toEqual({ href: '/dashboard', label: 'Ir al dashboard' });
  });

  test('returns the sign-in link as the secondary CTA for anonymous users (ES)', () => {
    expect(getSecondaryCta(null, esNav)).toEqual({ href: '/sign-in', label: 'Iniciar sesión' });
  });

  test('returns no secondary CTA for authenticated users', () => {
    expect(getSecondaryCta('user_123', esNav)).toBeNull();
  });

  test('returns the locale-translated labels in EN', () => {
    expect(getPrimaryCta(null, enNav)).toEqual({ href: '/sign-up', label: 'Create account' });
    expect(getPrimaryCta('user_123', enNav)).toEqual({ href: '/dashboard', label: 'Go to dashboard' });
    expect(getSecondaryCta(null, enNav)).toEqual({ href: '/sign-in', label: 'Sign in' });
  });
});
