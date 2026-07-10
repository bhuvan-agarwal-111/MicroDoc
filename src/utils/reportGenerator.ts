/**
 * MicroDoc — Report Summary Generator
 *
 * Parses SymptomEntry data and produces both structured data objects and
 * a professional plain-text report designed for sharing with a physician.
 */

import { subDays, subWeeks, subMonths, isAfter, format, parseISO } from 'date-fns';
import type { SymptomEntry, ReportRange } from '../types';

/* ── Helpers ──────────────────────────────────────────────── */

function getCutoffDate(range: ReportRange): Date {
  const now = new Date();
  switch (range) {
    case '3d':  return subDays(now, 3);
    case '1w':  return subWeeks(now, 1);
    case '2w':  return subWeeks(now, 2);
    case '1m':  return subMonths(now, 1);
    case 'all': return new Date(0);
  }
}

function getRangeLabel(range: ReportRange): string {
  switch (range) {
    case '3d':  return 'Past 3 Days';
    case '1w':  return 'Past 1 Week';
    case '2w':  return 'Past 2 Weeks';
    case '1m':  return 'Past 1 Month';
    case 'all': return 'All Time';
  }
}

function severityLabel(sev: number): string {
  if (sev <= 1.5) return 'Mild';
  if (sev <= 2.5) return 'Low';
  if (sev <= 3.5) return 'Moderate';
  if (sev <= 4.5) return 'High';
  return 'Severe';
}

/* ── Data Types ───────────────────────────────────────────── */

export interface SymptomStat {
  name: string;
  frequency: number;
  avgSeverity: number;
  maxSeverity: number;
  lastOccurrence: string; // ISO timestamp
}

export interface TimelineDay {
  date: string;         // formatted date string e.g. "Jul 9, 2026"
  dateISO: string;      // ISO date for sorting
  entries: {
    symptoms: Record<string, number>;
    note?: string;
    time: string;       // formatted time e.g. "2:30 PM"
  }[];
}

export interface ReportData {
  totalEntries: number;
  totalSymptomInstances: number;
  averageSeverity: number;
  overallSeverityLabel: string;
  mostFrequentSymptom: string | null;
  mostFrequentCount: number;
  highestSeveritySymptom: string | null;
  highestSeverityValue: number;
  entriesWithNotes: number;
  rangeLabel: string;
  dateRangeFormatted: string;  // e.g. "Jun 25 – Jul 9, 2026"
  symptomStats: SymptomStat[];
  timeline: TimelineDay[];
  patientNotes: { date: string; note: string }[];
  filteredEntries: SymptomEntry[];
}

/* ── Core Generator ───────────────────────────────────────── */

export function generateReportData(
  entries: SymptomEntry[],
  range: ReportRange
): ReportData {
  const cutoff = getCutoffDate(range);
  const rangeLabel = getRangeLabel(range);
  const now = new Date();

  const filtered = entries.filter((e) => {
    const d = parseISO(e.timestamp);
    const validDate = isNaN(d.getTime()) ? new Date(e.timestamp) : d;
    return isAfter(validDate, cutoff);
  });

  // Date range label
  const lastEntryTime = filtered.length > 0 ? (parseISO(filtered[filtered.length - 1].timestamp).getTime() || new Date(filtered[filtered.length - 1].timestamp).getTime()) : 0;
  const dateRangeFormatted = filtered.length > 0
    ? `${format(lastEntryTime, 'MMM d')} – ${format(now, 'MMM d, yyyy')}`
    : `${format(cutoff, 'MMM d')} – ${format(now, 'MMM d, yyyy')}`;

  if (filtered.length === 0) {
    return {
      totalEntries: 0,
      totalSymptomInstances: 0,
      averageSeverity: 0,
      overallSeverityLabel: 'N/A',
      mostFrequentSymptom: null,
      mostFrequentCount: 0,
      highestSeveritySymptom: null,
      highestSeverityValue: 0,
      entriesWithNotes: 0,
      rangeLabel,
      dateRangeFormatted,
      symptomStats: [],
      timeline: [],
      patientNotes: [],
      filteredEntries: [],
    };
  }

  // ── Per-symptom statistics ──
  const symptomMap: Record<string, {
    count: number;
    totalSev: number;
    maxSev: number;
    lastOccurrence: string;
  }> = {};

  let totalSeverity = 0;
  let totalSymptomInstances = 0;

  for (const entry of filtered) {
    for (const [symptom, sev] of Object.entries(entry.symptoms)) {
      totalSeverity += sev;
      totalSymptomInstances++;

      if (!symptomMap[symptom]) {
        symptomMap[symptom] = {
          count: 0,
          totalSev: 0,
          maxSev: 0,
          lastOccurrence: entry.timestamp,
        };
      }
      const s = symptomMap[symptom];
      s.count++;
      s.totalSev += sev;
      if (sev > s.maxSev) s.maxSev = sev;
      // Since entries are sorted newest-first, the first occurrence IS the latest
      const entryTime = parseISO(entry.timestamp).getTime() || new Date(entry.timestamp).getTime();
      const lastOccurTime = parseISO(s.lastOccurrence).getTime() || new Date(s.lastOccurrence).getTime();
      if (entryTime > lastOccurTime) {
        s.lastOccurrence = entry.timestamp;
      }
    }
  }

  const symptomStats: SymptomStat[] = Object.entries(symptomMap)
    .map(([name, data]) => ({
      name,
      frequency: data.count,
      avgSeverity: Math.round((data.totalSev / data.count) * 10) / 10,
      maxSeverity: data.maxSev,
      lastOccurrence: data.lastOccurrence,
    }))
    .sort((a, b) => b.frequency - a.frequency);

  const averageSeverity = totalSymptomInstances === 0
    ? 0
    : Math.round((totalSeverity / totalSymptomInstances) * 10) / 10;

  // Most frequent & highest severity
  const mostFrequent = symptomStats[0] || null;
  let highestSev = symptomStats[0] || null;
  for (const s of symptomStats) {
    if (s.maxSeverity > (highestSev?.maxSeverity || 0)) {
      highestSev = s;
    }
  }

  // ── Timeline (grouped by date) ──
  const dayMap: Record<string, TimelineDay> = {};

  for (const entry of filtered) {
    let d = parseISO(entry.timestamp);
    if (isNaN(d.getTime())) d = new Date(entry.timestamp);

    const dateKey = format(d, 'yyyy-MM-dd');
    const dateLabel = format(d, 'MMM d, yyyy');
    const timeLabel = format(d, 'h:mm a');

    if (!dayMap[dateKey]) {
      dayMap[dateKey] = { date: dateLabel, dateISO: dateKey, entries: [] };
    }
    dayMap[dateKey].entries.push({
      symptoms: entry.symptoms,
      note: entry.note,
      time: timeLabel,
    });
  }

  const timeline = Object.values(dayMap)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO)); // newest first

  // ── Patient notes ──
  const patientNotes = filtered
    .filter((e) => e.note && e.note.trim().length > 0)
    .map((e) => {
      let d = parseISO(e.timestamp);
      if (isNaN(d.getTime())) d = new Date(e.timestamp);
      return {
        date: format(d, 'MMM d'),
        note: e.note!.trim(),
      };
    });

  const entriesWithNotes = patientNotes.length;

  return {
    totalEntries: filtered.length,
    totalSymptomInstances,
    averageSeverity,
    overallSeverityLabel: severityLabel(averageSeverity),
    mostFrequentSymptom: mostFrequent?.name || null,
    mostFrequentCount: mostFrequent?.frequency || 0,
    highestSeveritySymptom: highestSev?.name || null,
    highestSeverityValue: highestSev?.maxSeverity || 0,
    entriesWithNotes,
    rangeLabel,
    dateRangeFormatted,
    symptomStats,
    timeline,
    patientNotes,
    filteredEntries: filtered,
  };
}

/* ── Plain-Text Report (for Copy / Share) ────────────────── */

export function generateReportText(data: ReportData): string {
  const line = '──────────────────────────────';

  if (data.totalEntries === 0) {
    return (
      `${line}\n` +
      `MICRODOC SYMPTOM REPORT\n` +
      `Period: ${data.dateRangeFormatted} (${data.rangeLabel})\n` +
      `${line}\n\n` +
      `No symptoms were logged during this period.\n\n` +
      `${line}\n` +
      `This report is auto-generated from self-reported data\n` +
      `and is not a medical diagnosis. Please consult a\n` +
      `qualified healthcare professional for medical advice.\n` +
      `${line}`
    );
  }

  // Header
  let text = '';
  text += `${line}\n`;
  text += `MICRODOC SYMPTOM REPORT\n`;
  text += `Period: ${data.dateRangeFormatted} (${data.rangeLabel})\n`;
  text += `Total Entries: ${data.totalEntries}\n`;
  text += `Overall Avg Severity: ${data.averageSeverity}/5 (${data.overallSeverityLabel})\n`;
  text += `${line}\n\n`;

  // Symptom Breakdown
  text += `SYMPTOM BREAKDOWN\n`;
  for (const s of data.symptomStats) {
    text += `  • ${s.name} — ${s.frequency}× reported, avg ${s.avgSeverity}/5, peak ${s.maxSeverity}/5\n`;
  }
  text += '\n';

  // Timeline
  text += `TIMELINE\n`;
  for (const day of data.timeline) {
    for (const entry of day.entries) {
      const symptoms = Object.entries(entry.symptoms)
        .map(([name, sev]) => `${name} (${sev}/5)`)
        .join(', ');
      text += `  ${day.date} ${entry.time} — ${symptoms}\n`;
    }
  }
  text += '\n';

  // Patient Notes
  if (data.patientNotes.length > 0) {
    text += `PATIENT NOTES\n`;
    for (const n of data.patientNotes) {
      text += `  ${n.date}: "${n.note}"\n`;
    }
    text += '\n';
  }

  // Disclaimer
  text += `${line}\n`;
  text += `This report is auto-generated from self-reported data\n`;
  text += `and is not a medical diagnosis. Please consult a\n`;
  text += `qualified healthcare professional for medical advice.\n`;
  text += `${line}`;

  return text;
}
