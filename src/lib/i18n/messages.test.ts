import { describe, expect, test } from 'vitest';
import { resolveLocaleMessages } from './messages';

describe('messages', () => {
  test('returns spanish content by default contract', () => {
    const messages = resolveLocaleMessages('es');

    expect(messages.shell.navDashboard).toBe('Dashboard');
    expect(messages.auth.signIn).toBe('Iniciar sesión');
  });

  test('returns english content for english locale', () => {
    const messages = resolveLocaleMessages('en');

    expect(messages.shell.navNewProject).toBe('New project');
    expect(messages.auth.signIn).toBe('Sign in');
    expect(messages.project.createProjectAction).toBe('Create project and open editor');
  });
});
