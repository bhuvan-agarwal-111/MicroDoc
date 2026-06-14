/**
 * MicroDoc — Report Summary Generator
 *
 * Parses SymptomEntry data and produces a plain-text chronological summary
 * designed for a physician during a time-constrained appointment.
 */

import { subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import type { SymptomEntry, ReportRange } from '../types';

/**
 * Returns the cutoff Date for a given report range.
 * For 'all', returns the epoch (all entries pass).
 */
function getCutoffDate(range: ReportRange): Date {
  const now = new Date();
  switch (range) {
    case '3d':
      return subDays(now, 3);
    case '1w':
      return subWeeks(now, 1);
    case '2w':
      return subWeeks(now, 2);
    case '1m':
      return subMonths(now, 1);
    case 'all':
      return new Date(0);
  }
}

/**
 * Returns the human-readable label for the time range.
 */
function getRangeLabel(range: ReportRange): string {
  switch (range) {
    case '3d':
      return 'past 3 days';
    case '1w':
      return 'past 1 week';
    case '2w':
      return 'past 2 weeks';
    case '1m':
      return 'past 1 month';
    case 'all':
      return 'all time';
  }
}

export interface ReportData {
  totalEntries: number;
  mostFrequentSymptom: string | null;
  mostFrequentCount: number;
  averageSeverity: number;
  entriesWithNotes: number;
  rangeLabel: string;
  filteredEntries: SymptomEntry[];
}

/**
 * Filters entries by the given range and computes summary statistics.
 */
export function generateReportData(
  entries: SymptomEntry[],
  range: ReportRange
): ReportData {
  const cutoff = getCutoffDate(range);
  const rangeLabel = getRangeLabel(range);

  const filtered = entries.filter((e) =>
    isAfter(new Date(e.timestamp), cutoff)
  );

  if (filtered.length === 0) {
    return {
      totalEntries: 0,
      mostFrequentSymptom: null,
      mostFrequentCount: 0,
      averageSeverity: 0,
      entriesWithNotes: 0,
      rangeLabel,
      filteredEntries: [],
    };
  }

  // Count symptom frequency
  const symptomCounts: Record<string, number> = {};
  for (const entry of filtered) {
    for (const symptom of Object.keys(entry.symptoms)) {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
    }
  }

  // Find most frequent
  let mostFrequentSymptom: string | null = null;
  let mostFrequentCount = 0;
  for (const [symptom, count] of Object.entries(symptomCounts)) {
    if (count > mostFrequentCount) {
      mostFrequentSymptom = symptom;
      mostFrequentCount = count;
    }
  }

  // Average severity
  let totalSeverity = 0;
  let severityCount = 0;
  filtered.forEach(e => {
    Object.values(e.symptoms).forEach(sev => {
      totalSeverity += sev;
      severityCount++;
    });
  });
  const averageSeverity = severityCount === 0 ? 0 : Math.round((totalSeverity / severityCount) * 10) / 10;

  // Count notes
  const entriesWithNotes = filtered.filter(
    (e) => e.note && e.note.trim().length > 0
  ).length;

  return {
    totalEntries: filtered.length,
    mostFrequentSymptom,
    mostFrequentCount,
    averageSeverity,
    entriesWithNotes,
    rangeLabel,
    filteredEntries: filtered,
  };
}

/**
 * Generates the exact plain-text summary string for the doctor.
 */
export function generateReportText(data: ReportData): string {
  if (data.totalEntries === 0) {
    return `Summary for ${data.rangeLabel}: No symptoms were logged during this period.`;
  }

  const symptomPart = data.mostFrequentSymptom
    ? ` Most frequent symptom: ${data.mostFrequentSymptom} (${data.mostFrequentCount} time${data.mostFrequentCount !== 1 ? 's' : ''}).`
    : '';

  return (
    `Summary for ${data.rangeLabel}: ` +
    `Patient logged symptoms ${data.totalEntries} time${data.totalEntries !== 1 ? 's' : ''}.` +
    symptomPart +
    ` Average reported severity: ${data.averageSeverity}/5.` +
    ` Notes provided on ${data.entriesWithNotes} entr${data.entriesWithNotes !== 1 ? 'ies' : 'y'}.`
  );
}
