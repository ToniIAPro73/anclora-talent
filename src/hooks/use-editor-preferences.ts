'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EditorPreferences,
  defaultEditorPreferences,
  EDITOR_PREFERENCES_STORAGE_KEY,
} from '@/lib/ui-preferences/preferences';

/**
 * Initialize preferences from localStorage
 */
function initializePreferences(): EditorPreferences {
  try {
    const stored = localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultEditorPreferences, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load editor preferences:', error);
  }
  return defaultEditorPreferences;
}

/**
 * Hook to manage editor preferences (font, size, device, margins)
 * Persists to localStorage and syncs between tabs
 */
export function useEditorPreferences() {
  const [preferences, setPreferencesState] = useState<EditorPreferences>(() =>
    initializePreferences()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Mark as loaded after mount
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Listen for storage changes (other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === EDITOR_PREFERENCES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setPreferencesState({ ...defaultEditorPreferences, ...parsed });
        } catch (error) {
          console.error('Failed to parse storage changes:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setPreferences = useCallback((newPreferences: Partial<EditorPreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save editor preferences:', error);
      }
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(defaultEditorPreferences);
    try {
      localStorage.removeItem(EDITOR_PREFERENCES_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset editor preferences:', error);
    }
  }, []);

  return {
    preferences,
    isLoaded,
    setPreferences,
    resetPreferences,
  };
}
