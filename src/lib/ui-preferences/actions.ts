'use server';

import { getCurrentUser } from '@/lib/auth/guards';
import { userPreferencesRepository } from '@/lib/db/repositories';
import { defaultEditorPreferences, type EditorPreferences } from './preferences';

export async function getEditorPreferencesAction(): Promise<EditorPreferences> {
  const user = await getCurrentUser();
  if (!user) return defaultEditorPreferences;

  const stored = await userPreferencesRepository.getEditorPreferences(user.id);
  return stored ? { ...defaultEditorPreferences, ...stored } : defaultEditorPreferences;
}

export async function saveEditorPreferencesAction(prefs: EditorPreferences): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await userPreferencesRepository.saveEditorPreferences(user.id, prefs);
}
