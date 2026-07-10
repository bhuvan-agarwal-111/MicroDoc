/**
 * MicroDoc — useSymptoms Hook
 *
 * Central state management hook wrapping @capacitor/preferences.
 * Provides reactive state and CRUD operations for SymptomEntry data.
 * Data is persisted locally and never automatically deleted (infinite retention).
 */

import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { parseISO } from 'date-fns';
import type { SymptomEntry } from '../types';

const STORAGE_KEY = 'microdoc_symptom_entries';

/**
 * Reads the full entry array from Capacitor Preferences.
 */
async function loadEntries(): Promise<SymptomEntry[]> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      // Migration: Convert old { symptoms: string[], severity: number } to Record<string, number>
      const migrated = parsed.map((entry: any) => {
        if (Array.isArray(entry.symptoms)) {
          const migratedSymptoms: Record<string, number> = {};
          entry.symptoms.forEach((s: string) => {
            migratedSymptoms[s] = entry.severity || 1;
          });
          entry.symptoms = migratedSymptoms;
          delete entry.severity;
        }
        return entry as SymptomEntry;
      });
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Writes the full entry array to Capacitor Preferences.
 */
async function saveEntries(entries: SymptomEntry[]): Promise<void> {
  await Preferences.set({
    key: STORAGE_KEY,
    value: JSON.stringify(entries),
  });
  window.dispatchEvent(new CustomEvent('microdoc_update'));
}

/**
 * Validates that an object conforms to the SymptomEntry interface.
 */
export function isValidSymptomEntry(obj: unknown): obj is SymptomEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.timestamp === 'string' &&
    typeof e.symptoms === 'object' &&
    e.symptoms !== null &&
    !Array.isArray(e.symptoms) &&
    Object.values(e.symptoms).every((v: unknown) => typeof v === 'number') &&
    (e.note === undefined || typeof e.note === 'string')
  );
}

export function useSymptoms() {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    loadEntries().then((data) => {
      // Sort descending by timestamp (newest first)
      data.sort((a, b) => {
        const timeA = parseISO(a.timestamp).getTime() || new Date(a.timestamp).getTime();
        const timeB = parseISO(b.timestamp).getTime() || new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      setEntries(data);
      setLoading(false);
    });
  }, []);

  // Load entries on mount and listen for cross-tab updates
  useEffect(() => {
    refresh();
    window.addEventListener('microdoc_update', refresh);
    return () => window.removeEventListener('microdoc_update', refresh);
  }, [refresh]);

  /**
   * Adds a new symptom entry, persists, and updates state.
   */
  const addEntry = useCallback(
    async (
      symptoms: Record<string, number>,
      note?: string
    ): Promise<void> => {
      const newEntry: SymptomEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symptoms,
        note: note && note.trim().length > 0 ? note.trim() : undefined,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      await saveEntries(updated);
    },
    [entries]
  );

  /**
   * Deletes a single entry by ID.
   */
  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await saveEntries(updated);
    },
    [entries]
  );

  /**
   * Purges all records from local storage.
   */
  const purgeAll = useCallback(async (): Promise<void> => {
    setEntries([]);
    await Preferences.remove({ key: STORAGE_KEY });
  }, []);

  /**
   * Exports all entries as a JSON string (for backup).
   */
  const exportBackupJSON = useCallback((): string => {
    return JSON.stringify(entries, null, 2);
  }, [entries]);

  /**
   * Imports entries from a JSON string.
   * @param json The raw JSON string from a backup file.
   * @param mode 'merge' adds new entries (skips duplicate IDs), 'overwrite' replaces all data.
   * @returns The number of entries imported.
   */
  const importBackup = useCallback(
    async (json: string, mode: 'merge' | 'overwrite'): Promise<number> => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error('Invalid JSON format.');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Backup file must contain an array of entries.');
      }

      const validEntries = parsed.filter(isValidSymptomEntry);
      if (validEntries.length === 0) {
        throw new Error('No valid symptom entries found in backup file.');
      }

      let updated: SymptomEntry[];
      if (mode === 'overwrite') {
        updated = validEntries;
      } else {
        // Merge: add entries that don't already exist by ID
        const existingIds = new Set(entries.map((e) => e.id));
        const newEntries = validEntries.filter((e) => !existingIds.has(e.id));
        updated = [...entries, ...newEntries];
      }

      // Sort descending
      updated.sort((a, b) => {
        const timeA = parseISO(a.timestamp).getTime() || new Date(a.timestamp).getTime();
        const timeB = parseISO(b.timestamp).getTime() || new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      setEntries(updated);
      await saveEntries(updated);

      return mode === 'overwrite'
        ? validEntries.length
        : validEntries.filter(
            (e) => !new Set(entries.map((x) => x.id)).has(e.id)
          ).length;
    },
    [entries]
  );

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    purgeAll,
    exportBackupJSON,
    importBackup,
  };
}
