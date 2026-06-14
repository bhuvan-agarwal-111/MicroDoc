/**
 * ReportView — Doctor Consultation Report
 *
 * Transforms raw data entries into a highly structured, plain-text
 * chronological summary designed to be quickly read by a physician
 * during a time-constrained appointment.
 *
 * Also provides backup/restore and purge functionality.
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
      setToastMessage('Summary copied to clipboard');
    } catch {
      // Fallback for web
      try {
        await navigator.clipboard.writeText(reportText);
        setToastMessage('Summary copied to clipboard');
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
      // User cancelled or share unavailable
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
      // Fallback: copy to clipboard
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

    // Reset the input so the same file can be re-selected
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

        {/* ── Summary Card ── */}
        <div className="report__summary-card">
          <span className="report__summary-label">Doctor Summary</span>
          <div className="report__summary-text">{reportText}</div>
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
