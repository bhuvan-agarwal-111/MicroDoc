import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { format } from 'date-fns';
import { SymptomEntry } from '../types';
import { SYMPTOM_CONFIG } from '../constants/symptoms';
import './CalendarWidget.css';

interface CalendarWidgetProps {
  entries: SymptomEntry[];
  selectedDate: string | null;
  onDateSelect: (dateStr: string | null) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  entries,
  selectedDate,
  onDateSelect,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    // Ensure correct local date string format YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDate === dateStr) {
      onDateSelect(null);
    } else {
      onDateSelect(dateStr);
    }
  };

  const getDaySymptoms = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Using date-fns format to match local date part of entry
    const dayEntries = entries.filter((entry) => format(new Date(entry.timestamp), 'yyyy-MM-dd') === dateStr);
    const daySymptoms = new Set<string>();
    dayEntries.forEach((entry) => {
      Object.keys(entry.symptoms).forEach((symp) => daySymptoms.add(symp));
    });
    return Array.from(daySymptoms);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="calendar-widget glass-container-surface">
      <div className="calendar-widget__header">
        <button className="calendar-widget__nav-btn" onClick={handlePrevMonth} type="button">
          <IonIcon icon={chevronBack} />
        </button>
        <div className="calendar-widget__title">{monthName} {year}</div>
        <button className="calendar-widget__nav-btn" onClick={handleNextMonth} type="button">
          <IonIcon icon={chevronForward} />
        </button>
      </div>

      <div className="calendar-widget__grid">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="calendar-widget__day-label">{day}</div>
        ))}
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="calendar-widget__day calendar-widget__day--empty" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const symptoms = getDaySymptoms(day).slice(0, 4); // Max 4 dots to keep it clean

          return (
            <button
              key={`day-${day}`}
              className={`calendar-widget__day ${isSelected ? 'calendar-widget__day--selected' : ''} ${isToday && !isSelected ? 'calendar-widget__day--today' : ''}`}
              onClick={() => handleDayClick(day)}
              type="button"
            >
              <span className="calendar-widget__day-number">{day}</span>
              {symptoms.length > 0 && (
                <div className="calendar-widget__dots">
                  {symptoms.map((symp, sIdx) => {
                    const config = SYMPTOM_CONFIG.find((c) => c.label === symp);
                    const color = config ? config.color : '#94A3B8';
                    return <span key={sIdx} className="calendar-widget__dot" style={{ backgroundColor: color }} />;
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWidget;
