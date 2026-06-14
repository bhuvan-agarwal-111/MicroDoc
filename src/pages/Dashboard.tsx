/**
 * Dashboard — Main Journal Feed & FAB
 *
 * Provides an immediate action point to log a new symptom and displays
 * a scrollable, descending chronological list of all previously saved entries.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { add, documentTextOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { useSymptoms } from '../hooks/useSymptoms';
import SymptomCard from '../components/SymptomCard';
import IntakeModal from '../components/IntakeModal';
import CalendarWidget from '../components/CalendarWidget';
import './Dashboard.css';

const MORNING_GREETINGS = ["Good morning, Bhuvan", "Rise and shine, Bhuvan", "Morning, Bhuvan!"];
const AFTERNOON_GREETINGS = ["Good afternoon, Bhuvan", "Hope you're having a good day, Bhuvan"];
const EVENING_GREETINGS = ["Good evening, Bhuvan", "Winding down, Bhuvan?"];
const NIGHT_GREETINGS = ["Greetings, Midnight Owl", "Late night, Bhuvan?", "Still awake, Bhuvan?"];

function getGreeting(): string {
  const hour = new Date().getHours();
  let list = NIGHT_GREETINGS;
  if (hour >= 5 && hour < 12) list = MORNING_GREETINGS;
  else if (hour >= 12 && hour < 17) list = AFTERNOON_GREETINGS;
  else if (hour >= 17 && hour < 22) list = EVENING_GREETINGS;
  return list[Math.floor(Math.random() * list.length)];
}

const Dashboard: React.FC = () => {
  const { entries, loading, addEntry, deleteEntry } = useSymptoms();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedDateString, setSelectedDateString] = useState<string | null>(null);
  
  // Ephemeral Greeting State
  const [greetingVisible, setGreetingVisible] = useState(true);
  const [greetingRendered, setGreetingRendered] = useState(true);
  const greetingText = useRef(getGreeting()).current;

  // Vanish after 4s
  useEffect(() => {
    const timer = setTimeout(() => {
      setGreetingVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = useCallback((e: CustomEvent) => {
    if (greetingVisible && e.detail.scrollTop > 20) {
      setGreetingVisible(false);
    }
  }, [greetingVisible]);

  const filteredEntries = selectedDateString
    ? entries.filter((entry) => format(new Date(entry.timestamp), 'yyyy-MM-dd') === selectedDateString)
    : entries;

  const handleSave = async (
    symptoms: Record<string, number>,
    note?: string
  ) => {
    await addEntry(symptoms, note);
    setModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteEntry(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="dashboard__header-toolbar">
          <IonTitle className="dashboard__title">MicroDoc Symptom Journal</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard__content" scrollEvents={true} onIonScroll={handleScroll}>
        {loading ? (
          <div className="dashboard__loading">
            <IonSpinner name="crescent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="dashboard__empty">
            <IonIcon icon={documentTextOutline} className="dashboard__empty-icon" />
            <p className="dashboard__empty-text">
              No symptoms logged yet.
              <br />
              Tap the <strong>+</strong> button to start tracking.
            </p>
          </div>
        ) : (
          <div className="dashboard__timeline-wrapper">
            {greetingRendered && (
              <div 
                className={`dashboard__ephemeral-greeting ${!greetingVisible ? 'dashboard__ephemeral-greeting--hidden' : ''}`}
                onTransitionEnd={() => { if (!greetingVisible) setGreetingRendered(false); }}
              >
                <div className="dashboard__ephemeral-content">
                  <div className="dashboard__ephemeral-title">{greetingText}</div>
                  <div className="dashboard__ephemeral-date">{format(new Date(), "'Today is' EEEE, MMMM d, yyyy")}</div>
                </div>
                <svg className="dashboard__ephemeral-wave" viewBox="0 0 1440 180" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,128L60,112C120,96,240,64,360,69.3C480,75,600,117,720,138.7C840,160,960,160,1080,149.3C1200,139,1320,117,1380,106.7L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"></path>
                </svg>
              </div>
            )}
            <CalendarWidget
              entries={entries}
              selectedDate={selectedDateString}
              onDateSelect={setSelectedDateString}
            />
            {filteredEntries.length === 0 ? (
              <div className="dashboard__empty" style={{ marginTop: '24px' }}>
                <IonIcon icon={documentTextOutline} className="dashboard__empty-icon" />
                <p className="dashboard__empty-text">
                  No symptoms logged on this date.
                </p>
              </div>
            ) : (
              <div className="dashboard__timeline-container glass-container-surface">
                <div className="dashboard__feed">
                  {filteredEntries.map((entry) => (
                    <SymptomCard
                      key={entry.id}
                      entry={entry}
                      onDelete={(id) => setDeleteTarget(id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Anchored Pill Button */}
        <div className="dashboard__action-container">
          <button
            className="dashboard__action-pill"
            onClick={() => setModalOpen(true)}
            type="button"
          >
            <IonIcon icon={add} className="dashboard__action-icon" />
            <span>Log Symptom</span>
          </button>
        </div>
      </IonContent>

      {/* Intake Modal */}
      <IntakeModal
        isOpen={modalOpen}
        onDismiss={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <IonAlert
        isOpen={deleteTarget !== null}
        header="Delete Entry"
        message="Are you sure you want to delete this symptom entry?"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setDeleteTarget(null),
          },
          {
            text: 'Delete',
            role: 'destructive',
            cssClass: 'alert-button-danger',
            handler: handleDeleteConfirm,
          },
        ]}
        onDidDismiss={() => setDeleteTarget(null)}
      />
    </IonPage>
  );
};

export default Dashboard;
