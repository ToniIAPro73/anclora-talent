import { describe, expect, test } from 'vitest';
import { resolveLocaleMessages } from './messages';

describe('messages', () => {
  test('returns spanish content by default contract', () => {
    const messages = resolveLocaleMessages('es');

    expect(messages.shell.navDashboard).toBe('Dashboard');
    expect(messages.shell.navNewProject).toBe('Nuevo proyecto');
    expect(messages.auth.signIn).toBe('Iniciar sesión');
  });

  test('returns english content for english locale', () => {
    const messages = resolveLocaleMessages('en');

    expect(messages.shell.navProjects).toBe('My projects');
    expect(messages.auth.signIn).toBe('Sign in');
    expect(messages.project.createProjectAction).toBe('Create project and open editor');
  });

  test('keeps dashboard v3 nav and table labels in ES/EN parity', () => {
    const es = resolveLocaleMessages('es');
    const en = resolveLocaleMessages('en');

    expect(Object.keys(es.shell).sort()).toEqual(Object.keys(en.shell).sort());
    expect(Object.keys(es.dashboard).sort()).toEqual(Object.keys(en.dashboard).sort());
    expect(en.dashboard.projectsTableTitle).toBe('Title');
    expect(en.dashboard.projectsTableUpdated).toBe('Updated');
    expect(es.dashboard.projectsTableUpdated).toBe('Actualizado');
  });
});
