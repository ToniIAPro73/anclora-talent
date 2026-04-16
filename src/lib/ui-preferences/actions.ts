'use server';

import { auth } from '@clerk/nextjs/server';
import { userPreferencesRepository } from '@/lib/db/repositories';
import { defaultEditorPreferences, type EditorPreferences } from './preferences';

export async function getEditorPreferencesAction(): Promise<EditorPreferences> {
  const { userId } = await auth();
  if (!userId) return defaultEditorPreferences;

  const stored = await userPreferencesRepository.getEditorPreferences(userId);
  return stored ? { ...defaultEditorPreferences, ...stored } : defaultEditorPreferences;
}

export async function saveEditorPreferencesAction(prefs: EditorPreferences): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await userPreferencesRepository.saveEditorPreferences(userId, prefs);
}
