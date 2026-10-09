'use client';

import type { CollaboratorRole } from '@/lib/collaboration/model';
import type { AppMessages } from '@/lib/i18n/messages';
import { initials } from '@/lib/collaboration/workspace-model';

export type Copy = AppMessages['collaboration'];
export type ErrorKey = keyof Copy['errors'];

export function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function RoleChip({ role, copy }: { role: CollaboratorRole; copy: Copy }) {
  return (
    <span className="cw-role" data-role={role} data-testid={`role-badge-${role}`}>
      {copy.roleBadges[role]}
    </span>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`cw-avatar cw-avatar--${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function formatDate(iso: string, locale: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale);
}

/** Singular/plural pick for the counters (one template per form, no ICU dependency). */
export function plural(count: number, one: string, many: string) {
  return interpolate(count === 1 ? one : many, { count });
}
