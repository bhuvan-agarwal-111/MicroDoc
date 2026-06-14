/**
 * SymptomCard — Renders a single symptom entry in the historical feed.
 */

import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { trashOutline, bandageOutline, waterOutline, batteryDeadOutline, alertCircleOutline, accessibilityOutline, moonOutline, heartOutline } from 'ionicons/icons';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import type { SymptomEntry } from '../types';
import './SymptomCard.css';

const SYMPTOM_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  'Headache': { icon: bandageOutline, color: '#E65100', bg: '#FFE0B2' },
  'Nausea': { icon: waterOutline, color: '#1B5E20', bg: '#C8E6C9' },
  'Fatigue': { icon: batteryDeadOutline, color: '#4A148C', bg: '#E1BEE7' },
  'Dizziness': { icon: alertCircleOutline, color: '#E65100', bg: '#FFECB3' },
  'Body Aches': { icon: accessibilityOutline, color: '#1A237E', bg: '#C5CAE9' },
  'Insomnia': { icon: moonOutline, color: '#263238', bg: '#CFD8DC' },
  'Anxiety': { icon: heartOutline, color: '#880E4F', bg: '#F8BBD0' },
};

interface SymptomCardProps {
  entry: SymptomEntry;
  onDelete: (id: string) => void;
}

/**
 * Formats the timestamp into a human-friendly string.
 * - "Today, 4:30 PM"
 * - "Yesterday, 10:15 AM"
 * - "2 hours ago"  (if within the last 6 hours)
 * - "Jun 5, 2026, 9:00 AM"  (older)
 */
function formatTimestamp(isoString: string): { relative: string; exact: string } {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sixHours = 6 * 60 * 60 * 1000;
  
  const exact = format(date, 'MMM d, h:mm a');
  let relative = '';

  if (diffMs < sixHours) {
    relative = formatDistanceToNow(date, { addSuffix: true });
  } else if (isToday(date)) {
    relative = `Today`;
  } else if (isYesterday(date)) {
    relative = `Yesterday`;
  } else {
    relative = format(date, 'MMM d, yyyy');
  }
  
  return { relative, exact };
}

const SymptomCard: React.FC<SymptomCardProps> = ({ entry, onDelete }) => {
  const { relative, exact } = formatTimestamp(entry.timestamp);

  return (
    <div className="symptom-card">
      <div className="symptom-card__content">
        <div className="symptom-card__header">
          <div className="symptom-card__header-text">
            <span className="symptom-card__timestamp-relative">{relative}</span>
            <span className="symptom-card__timestamp-exact">{exact}</span>
          </div>
          <IonButton
            fill="clear"
            className="symptom-card__delete-btn"
            onClick={() => onDelete(entry.id)}
          >
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>

        <div className="symptom-card__tags">
          {Object.entries(entry.symptoms).map(([s, sev]) => {
            const iconConf = SYMPTOM_ICON_MAP[s];
            return (
              <span key={s} className="symptom-card__tag" style={iconConf ? { backgroundColor: iconConf.bg, color: iconConf.color } : {}}>
                {iconConf && <IonIcon icon={iconConf.icon} className="symptom-card__tag-icon" />}
                {s} ({sev.toFixed(1)})
              </span>
            );
          })}
        </div>

        {entry.note && <div className="symptom-card__note">"{entry.note}"</div>}
      </div>
    </div>
  );
};

export default SymptomCard;
