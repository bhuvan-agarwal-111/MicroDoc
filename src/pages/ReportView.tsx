/**
 * ReportView — Professional Doctor Consultation Report
 *
 * Transforms raw symptom data into a structured, card-based medical summary
 * with symptom breakdown, severity indicators, timeline, and patient notes.
 * Designed to be shared with a healthcare provider.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonAlert,
  IonToast,
  IonActionSheet,
} from '@ionic/react';
import {
  copyOutline,
  shareSocialOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  trashOutline,
  documentTextOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { useSymptoms } from '../hooks/useSymptoms';
import {
  generateReportData,
  generateReportText,
} from '../utils/reportGenerator';
import { REPORT_RANGE_LABELS } from '../types';
import type { ReportRange } from '../types';
import './ReportView.css';

/**
 * Returns a CSS color for a severity value (1-5).
 * Smooth green → amber → red gradient.
 */
function severityColor(sev: number): string {
  if (sev <= 1.5) return '#2DD36F';
  if (sev <= 2.5) return '#7BC67E';
  if (sev <= 3.5) return '#FFC409';
  if (sev <= 4.5) return '#F58840';
  return '#EB445A';
}

const ReportView: React.FC = () => {
  const { entries, purgeAll, exportBackupJSON, importBackup } = useSymptoms();

  const [selectedRange, setSelectedRange] = useState<ReportRange>('2w');
  const [toastMessage, setToastMessage] = useState('');
  const [showPurgeAlert1, setShowPurgeAlert1] = useState(false);
  const [showPurgeAlert2, setShowPurgeAlert2] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  // Generate report data based on selected range
  const reportData = useMemo(
    () => generateReportData(entries, selectedRange),
    [entries, selectedRange]
  );
  const reportText = useMemo(
    () => generateReportText(reportData),
    [reportData]
  );

  // ── Copy to Clipboard ──
  const handleCopy = async () => {
    try {
      await Clipboard.write({ string: reportText });
      setToastMessage('Report copied to clipboard');
    } catch {
      try {
        await navigator.clipboard.writeText(reportText);
        setToastMessage('Report copied to clipboard');
      } catch {
        setToastMessage('Failed to copy to clipboard');
      }
    }
  };

  // ── Share ──
  const handleShare = async () => {
    try {
      await Share.share({
        title: 'MicroDoc Symptom Report',
        text: reportText,
      });
    } catch {
      setToastMessage('Sharing is not available on this device');
    }
  };

  // ── Export Backup ──
  const handleExportBackup = async () => {
    const json = exportBackupJSON();
    try {
      await Share.share({
        title: 'MicroDoc Backup',
        text: json,
        dialogTitle: 'Export MicroDoc Backup',
      });
    } catch {
      try {
        await navigator.clipboard.writeText(json);
        setToastMessage('Backup JSON copied to clipboard');
      } catch {
        setToastMessage('Export failed');
      }
    }
  };

  // ── Import Backup ──
  const handleImportClick = () => {
    setShowImportSheet(true);
  };

  const handleImportFile = (mode: 'merge' | 'overwrite') => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importBackup(text, importMode);
      setToastMessage(
        `Imported ${count} entr${count !== 1 ? 'ies' : 'y'} (${importMode})`
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : 'Import failed'
      );
    }

    e.target.value = '';
  };

  // ── Purge (Double Confirmation) ──
  const handlePurgeStep1 = () => {
    setShowPurgeAlert1(true);
  };

  const handlePurgeStep2 = () => {
    setShowPurgeAlert1(false);
    setShowPurgeAlert2(true);
  };

  const handlePurgeConfirm = async () => {
    await purgeAll();
    setShowPurgeAlert2(false);
    setToastMessage('All records have been permanently deleted');
  };

  const hasData = reportData.totalEntries > 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="report__header-toolbar">
          <IonTitle className="report__title">Report</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="report__content">
        {/* ── Time Range Selector ── */}
        <div className="report__range-section">
          <IonSegment
            className="report__segment"
            value={selectedRange}
            onIonChange={(e) =>
              setSelectedRange(e.detail.value as ReportRange)
            }
          >
            {(Object.keys(REPORT_RANGE_LABELS) as ReportRange[]).map((key) => (
              <IonSegmentButton key={key} value={key}>
                <IonLabel>{REPORT_RANGE_LABELS[key]}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>

        {!hasData ? (
          /* ── Empty State ── */
          <div className="report__empty-state">
            <IonIcon icon={documentTextOutline} className="report__empty-icon" />
            <h3 className="report__empty-title">No Data Available</h3>
            <p className="report__empty-desc">
              No symptoms were logged during this period. Start tracking from the Journal tab to generate your report.
            </p>
          </div>
        ) : (
          <>
            {/* ── Report Header Card ── */}
            <div className="report__card report__header-card">
              <div className="report__card-label">Symptom Report</div>
              <div className="report__header-period">{reportData.dateRangeFormatted}</div>
              <div className="report__header-stats">
                <div className="report__stat-item">
                  <span className="report__stat-value">{reportData.totalEntries}</span>
                  <span className="report__stat-label">Entries</span>
                </div>
                <div className="report__stat-divider" />
                <div className="report__stat-item">
                  <span className="report__stat-value">{reportData.symptomStats.length}</span>
                  <span className="report__stat-label">Symptoms</span>
                </div>
                <div className="report__stat-divider" />
                <div className="report__stat-item">
                  <span className="report__stat-value" style={{ color: severityColor(reportData.averageSeverity) }}>
                    {reportData.averageSeverity}
                  </span>
                  <span className="report__stat-label">Avg Severity</span>
                </div>
              </div>
            </div>

            {/* ── Symptom Breakdown Card ── */}
            <div className="report__card">
              <div className="report__card-label">Symptom Breakdown</div>
              <div className="report__symptom-list">
                {reportData.symptomStats.map((stat) => (
                  <div key={stat.name} className="report__symptom-row">
                    <div className="report__symptom-info">
                      <span className="report__symptom-name">{stat.name}</span>
                      <span className="report__symptom-freq">{stat.frequency}×</span>
                    </div>
                    <div className="report__severity-bar-track">
                      <div
                        className="report__severity-bar-fill"
                        style={{
                          width: `${(stat.avgSeverity / 5) * 100}%`,
                          background: severityColor(stat.avgSeverity),
                        }}
                      />
                    </div>
                    <div className="report__symptom-meta">
                      <span>avg {stat.avgSeverity}/5</span>
                      <span>peak {stat.maxSeverity}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Timeline Card ── */}
            <div className="report__card">
              <div className="report__card-label">
                <IonIcon icon={calendarOutline} className="report__card-label-icon" />
                Timeline
              </div>
              <div className="report__timeline">
                {reportData.timeline.map((day) => (
                  <div key={day.dateISO} className="report__timeline-day">
                    <div className="report__timeline-date">{day.date}</div>
                    {day.entries.map((entry, i) => (
                      <div key={i} className="report__timeline-entry">
                        <span className="report__timeline-time">{entry.time}</span>
                        <div className="report__timeline-symptoms">
                          {Object.entries(entry.symptoms).map(([name, sev]) => (
                            <span
                              key={name}
                              className="report__timeline-pill"
                              style={{ borderColor: severityColor(sev) }}
                            >
                              {name}
                              <span
                                className="report__timeline-sev"
                                style={{ color: severityColor(sev) }}
                              >
                                {sev}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Patient Notes Card (only if notes exist) ── */}
            {reportData.patientNotes.length > 0 && (
              <div className="report__card">
                <div className="report__card-label">
                  <IonIcon icon={chatbubbleEllipsesOutline} className="report__card-label-icon" />
                  Patient Notes
                </div>
                <div className="report__notes-list">
                  {reportData.patientNotes.map((n, i) => (
                    <div key={i} className="report__note-item">
                      <span className="report__note-date">{n.date}</span>
                      <p className="report__note-text">"{n.note}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Disclaimer ── */}
        <div className="report__disclaimer">
          This report is auto-generated from self-reported data and is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
        </div>

        {/* ── Action Buttons ── */}
        <div className="report__actions">
          <IonButton
            fill="solid"
            color="light"
            className="report__action-btn report__action-btn--secondary"
            onClick={handleCopy}
          >
            <IonIcon slot="start" icon={copyOutline} />
            Copy to Clipboard
          </IonButton>
          <IonButton
            fill="solid"
            color="primary"
            className="report__action-btn report__action-btn--primary"
            onClick={handleShare}
          >
            <IonIcon slot="start" icon={shareSocialOutline} />
            Share with Doctor
          </IonButton>
        </div>

        <div className="report__divider" />

        {/* ── Backup / Restore ── */}
        <span className="report__section-title">Data Management</span>
        <div className="report__backup-actions">
          <IonButton
            fill="clear"
            color="medium"
            className="report__data-btn"
            onClick={handleExportBackup}
          >
            <IonIcon slot="start" icon={cloudUploadOutline} />
            Export Backup
          </IonButton>
          <IonButton
            fill="clear"
            color="medium"
            className="report__data-btn"
            onClick={handleImportClick}
          >
            <IonIcon slot="start" icon={cloudDownloadOutline} />
            Import Backup
          </IonButton>
        </div>

        <div className="report__divider" />

        {/* ── Danger Zone ── */}
        <div className="report__danger-zone">
          <span className="report__danger-label">Danger Zone</span>
          <p className="report__danger-desc">
            Permanently delete all symptom records from this device. This action
            cannot be undone.
          </p>
          <IonButton
            fill="solid"
            color="danger"
            className="report__purge-btn"
            onClick={handlePurgeStep1}
          >
            <IonIcon slot="start" icon={trashOutline} />
            Purge All Records
          </IonButton>
        </div>

        {/* Hidden file input for import */}
        <input
          type="file"
          accept=".json,application/json"
          className="report__file-input"
          ref={fileInputRef}
          onChange={handleFileSelected}
        />
      </IonContent>

      {/* ── Import Action Sheet ── */}
      <IonActionSheet
        isOpen={showImportSheet}
        header="Import Backup"
        subHeader="How should imported data be handled?"
        onDidDismiss={() => setShowImportSheet(false)}
        buttons={[
          {
            text: 'Merge (add new, skip duplicates)',
            handler: () => handleImportFile('merge'),
          },
          {
            text: 'Overwrite (replace all data)',
            role: 'destructive',
            handler: () => handleImportFile('overwrite'),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />

      {/* ── Purge Alert Step 1 ── */}
      <IonAlert
        isOpen={showPurgeAlert1}
        header="Purge All Records"
        message="Are you sure you want to permanently delete all symptom records from this device?"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setShowPurgeAlert1(false),
          },
          {
            text: 'Continue',
            cssClass: 'alert-button-danger',
            handler: handlePurgeStep2,
          },
        ]}
        onDidDismiss={() => setShowPurgeAlert1(false)}
      />

      {/* ── Purge Alert Step 2 (Final Confirmation) ── */}
      <IonAlert
        isOpen={showPurgeAlert2}
        header="Final Confirmation"
        message="This action CANNOT be undone. All your symptom history will be permanently erased from this device."
        buttons={[
          {
            text: 'Go Back',
            role: 'cancel',
            handler: () => setShowPurgeAlert2(false),
          },
          {
            text: 'Delete Everything',
            role: 'destructive',
            cssClass: 'alert-button-danger',
            handler: handlePurgeConfirm,
          },
        ]}
        onDidDismiss={() => setShowPurgeAlert2(false)}
      />

      {/* ── Toast ── */}
      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={2000}
        position="bottom"
        onDidDismiss={() => setToastMessage('')}
      />
    </IonPage>
  );
};

export default ReportView;
