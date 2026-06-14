/**
 * MicroDoc — Core Data Types
 */

export interface SymptomEntry {
  /** Unique identifier (crypto.randomUUID) */
  id: string;
  /** ISO 8601 timestamp of when the entry was saved */
  timestamp: string;
  /** Map of symptom tags to their respective severities (1.0 - 5.0) */
  symptoms: Record<string, number>;
  /** Optional free-text note */
  note?: string;
}

/** Predefined symptom tags available in the intake form */
export const SYMPTOM_TAGS = [
  'Headache',
  'Nausea',
  'Fatigue',
  'Dizziness',
  'Body Aches',
  'Insomnia',
  'Anxiety',
] as const;

/** Report time range options */
export type ReportRange = '3d' | '1w' | '2w' | '1m' | 'all';

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  '3d': '3 Days',
  '1w': '1 Week',
  '2w': '2 Weeks',
  '1m': '1 Month',
  'all': 'All Time',
};
