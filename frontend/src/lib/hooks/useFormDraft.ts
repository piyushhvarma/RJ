'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DraftMeta {
  savedAt: string;
  key: string;
}

/**
 * Crash-protection & power-cut recovery hook.
 * Saves form keystrokes and values in real-time to localStorage.
 * Restores automatically or prompts the user if unsaved data exists.
 */
export function useFormDraft<T extends Record<string, any>>(
  formKey: string,
  currentValues: T,
  onRestore?: (draftData: T) => void,
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const storageKey = `gl_draft_${formKey}`;
  const isFirstRender = useRef(true);

  // Check on mount if an unsaved draft exists from a previous session or sudden powercut
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.__draftMeta) {
          setHasDraft(true);
          setDraftTimestamp(parsed.__draftMeta.savedAt);
        }
      }
    } catch {}
  }, [storageKey]);

  // Realtime debounce auto-saver (every keystroke / field update)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        const payload = {
          ...currentValues,
          __draftMeta: {
            savedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            key: formKey,
          },
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [currentValues, formKey, storageKey]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.__draftMeta;
        if (onRestore) {
          onRestore(parsed);
        }
        setHasDraft(false);
      }
    } catch {}
  }, [storageKey, onRestore]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch {}
  }, [storageKey]);

  return {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
  };
}
