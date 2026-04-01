import { describe, expect, test } from 'vitest';
import { getPrimaryCta, getSecondaryCta } from './marketing-helpers';

describe('marketing helpers', () => {
  test('returns signup as the primary CTA for anonymous users', () => {
    expect(getPrimaryCta(null)).toEqual({ href: '/sign-up', label: 'Crear cuenta' });
  });

  test('returns dashboard as the primary CTA for authenticated users', () => {
    expect(getPrimaryCta('user_123')).toEqual({ href: '/dashboard', label: 'Ir al dashboard' });
  });

  test('returns the showcase anchor as the secondary CTA for anonymous users', () => {
    expect(getSecondaryCta(null)).toEqual({ href: '/sign-in', label: 'Iniciar sesión' });
  });
});
