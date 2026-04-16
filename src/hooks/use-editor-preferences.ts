'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EditorPreferences,
  defaultEditorPreferences,
  EDITOR_PREFERENCES_STORAGE_KEY,
} from '@/lib/ui-preferences/preferences';
import { getEditorPreferencesAction, saveEditorPreferencesAction } from '@/lib/ui-preferences/actions';

function readFromLocalStorage(): EditorPreferences {
  try {
    const stored = localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY);
    if (stored) return { ...defaultEditorPreferences, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return defaultEditorPreferences;
}

function writeToLocalStorage(prefs: EditorPreferences) {
  try {
    localStorage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function useEditorPreferences() {
  const [preferences, setPreferencesState] = useState<EditorPreferences>(defaultEditorPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: hydrate from localStorage immediately, then sync from DB
  useEffect(() => {
    setPreferencesState(readFromLocalStorage());

    getEditorPreferencesAction().then((dbPrefs) => {
      setPreferencesState(dbPrefs);
      writeToLocalStorage(dbPrefs);
    }).catch(() => {
      // DB unavailable — localStorage values remain
    }).finally(() => {
      setIsLoaded(true);
    });
  }, []);

  // Cross-tab sync via StorageEvent
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === EDITOR_PREFERENCES_STORAGE_KEY && e.newValue) {
        try {
          setPreferencesState({ ...defaultEditorPreferences, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setPreferences = useCallback((newPreferences: Partial<EditorPreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPreferences };
      writeToLocalStorage(updated);

      // Debounce DB write to avoid hammering on rapid slider changes
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveEditorPreferencesAction(updated).catch(() => {});
      }, 800);

      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(defaultEditorPreferences);
    try {
      localStorage.removeItem(EDITOR_PREFERENCES_STORAGE_KEY);
    } catch {
      // ignore
    }
    saveEditorPreferencesAction(defaultEditorPreferences).catch(() => {});
  }, []);

  return { preferences, isLoaded, setPreferences, resetPreferences };
}
