import { describe, expect, test } from 'vitest';
import { resolveLocaleMessages } from './messages';

describe('messages', () => {
  test('returns spanish content by default contract', () => {
    const messages = resolveLocaleMessages('es');

    expect(messages.shell.navDashboard).toBe('Dashboard');
    expect(messages.auth.signIn.eyebrow).toBe('Acceso premium');
  });

  test('returns english content for english locale', () => {
    const messages = resolveLocaleMessages('en');

    expect(messages.shell.navNewProject).toBe('New project');
    expect(messages.project.createProjectAction).toBe('Create project and open editor');
  });
});
