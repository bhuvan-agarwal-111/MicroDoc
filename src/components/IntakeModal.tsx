/**
 * IntakeModal — Symptom Logging Intake Form
 *
 * Jade Horizon glassmorphism aesthetic with frosted glass symptom cards,
 * per-symptom translucent color tints, 3D morphing blob, and curved arc slider.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonTextarea,
  IonFooter,
} from '@ionic/react';
import './IntakeModal.css';
import { SYMPTOM_CONFIG } from '../constants/symptoms';
import { checkmarkOutline, closeOutline, addOutline } from 'ionicons/icons';

interface IntakeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSave: (symptoms: Record<string, number>, note?: string) => void;
}

/* ── Severity color + label config ── */

const SEVERITY_FEELINGS: Record<number, string> = {
  1: 'Comfortable',
  2: 'Uneasy',
  3: 'Struggling',
  4: 'Overwhelmed',
  5: 'Agitated',
};

function interpolateColor(color1: string, color2: string, factor: number) {
  const result = color1.slice(1).match(/.{2}/g)!.map((hex, i) =>
    Math.round(parseInt(hex, 16) + factor * (parseInt(color2.slice(1).match(/.{2}/g)![i], 16) - parseInt(hex, 16)))
  );
  return `#${result.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function getDynamicSeverityColor(value: number): string {
  if (value <= 1) return '#4ADE80';
  if (value >= 5) return '#E11D48';
  if (value <= 3) return interpolateColor('#4ADE80', '#F59E0B', (value - 1) / 2);
  return interpolateColor('#F59E0B', '#E11D48', (value - 3) / 2);
}

function getBlobGradient(value: number): string {
  if (value <= 1.5) return 'radial-gradient(circle at 35% 35%, #6EE7A0, #22C55E 50%, #15803D)';
  if (value <= 2.5) return 'radial-gradient(circle at 35% 35%, #FDE68A, #FBBF24 50%, #D97706)';
  if (value <= 3.5) return 'radial-gradient(circle at 35% 35%, #FDBA74, #F97316 50%, #EA580C)';
  if (value <= 4.5) return 'radial-gradient(circle at 35% 35%, #FCA5A5, #EF4444 50%, #DC2626)';
  return 'radial-gradient(circle at 35% 35%, #FDA4AF, #E11D48 50%, #BE123C)';
}

function getBlobGlow(value: number): string {
  if (value <= 1.5) return 'rgba(74, 222, 128, 0.4)';
  if (value <= 2.5) return 'rgba(251, 191, 36, 0.4)';
  if (value <= 3.5) return 'rgba(249, 115, 22, 0.4)';
  if (value <= 4.5) return 'rgba(239, 68, 68, 0.4)';
  return 'rgba(225, 29, 72, 0.4)';
}

/* ── Bezier arc math for the curved slider ── */
const ARC_W = 320;
const ARC_H = 90;
const ARC_PAD_X = 30;
const ARC_SPAN = ARC_W - 2 * ARC_PAD_X; // 260
const ARC_PEAK = 36; // curve peak height
const ARC_BASE_Y = 56; // vertical base of the arc

function getArcPoint(t: number): { x: number; y: number } {
  const p0x = ARC_PAD_X;
  const p0y = ARC_BASE_Y;
  const p1x = ARC_W / 2;
  const p1y = ARC_BASE_Y - ARC_PEAK;
  const p2x = ARC_W - ARC_PAD_X;
  const p2y = ARC_BASE_Y;
  const x = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
  const y = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;
  return { x, y };
}

function severityToT(severity: number): number {
  return (severity - 1) / 4;
}

function tToSeverity(t: number): number {
  return 1 + t * 4;
}

const DOT_COLORS = ['#4ADE80', '#FBBF24', '#F97316', '#EF4444', '#E11D48'];

const IntakeModal: React.FC<IntakeModalProps> = ({
  isOpen,
  onDismiss,
  onSave,
}) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Full-screen Modal State
  const [activeSymptomModal, setActiveSymptomModal] = useState<string | null>(null);
  const [activeSeverity, setActiveSeverity] = useState<number>(1.0);
  const [modalVisible, setModalVisible] = useState(false); // for CSS transition

  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const resetForm = () => {
    setSelectedSymptoms({});
    setNote('');
    setError('');
    setActiveSymptomModal(null);
    setModalVisible(false);
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const openSymptomModal = (symptom: string) => {
    setActiveSymptomModal(symptom);
    setActiveSeverity(selectedSymptoms[symptom] || 1.0);
    // slight delay to allow display:block before opacity:1 for transition
    setTimeout(() => setModalVisible(true), 10);
  };

  const closeSymptomModal = () => {
    if (activeSymptomModal) {
      // Save it
      setSelectedSymptoms(prev => ({
        ...prev,
        [activeSymptomModal]: Math.round(activeSeverity * 2) / 2
      }));
    }
    setModalVisible(false);
    setTimeout(() => setActiveSymptomModal(null), 400); // wait for CSS transition
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const copy = { ...prev };
      delete copy[symptom];
      return copy;
    });
    setModalVisible(false);
    setTimeout(() => setActiveSymptomModal(null), 400);
  };

  const handleSave = () => {
    if (Object.keys(selectedSymptoms).length === 0) {
      setError('Please select at least one symptom.');
      return;
    }
    onSave(selectedSymptoms, note || undefined);
    resetForm();
  };

  /* ── Drag logic for the curved slider inside the full screen modal ── */
  const getClientXFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): number => {
    if ('touches' in e) {
      return (e as TouchEvent).touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX ?? 0;
    }
    return (e as MouseEvent).clientX;
  };

  const updateSeverityFromClientX = useCallback((clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * ARC_W;
    let t = (svgX - ARC_PAD_X) / ARC_SPAN;
    t = Math.max(0, Math.min(1, t));
    const rawSeverity = tToSeverity(t);
    const smooth = Math.round(rawSeverity * 20) / 20;
    const clamped = Math.max(1, Math.min(5, smooth));
    setActiveSeverity(clamped);
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    updateSeverityFromClientX(getClientXFromEvent(e as unknown as MouseEvent | TouchEvent));

    const moveHandler = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      ev.preventDefault();
      updateSeverityFromClientX(getClientXFromEvent(ev));
    };

    const upHandler = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', upHandler);
    };

    window.addEventListener('mousemove', moveHandler, { passive: false });
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', upHandler);
  }, [updateSeverityFromClientX]);

  /* ── Computed visuals for Modal ── */
  const snappedSeverity = Math.round(activeSeverity * 2) / 2;
  const severityColor = getDynamicSeverityColor(activeSeverity);
  const blobGradient = getBlobGradient(activeSeverity);
  const blobGlow = getBlobGlow(activeSeverity);
  const feelingLabel = SEVERITY_FEELINGS[Math.round(snappedSeverity)] ?? 'Unknown';

  const handleT = severityToT(activeSeverity);
  const handlePos = getArcPoint(handleT);
  const arcPath = `M ${ARC_PAD_X} ${ARC_BASE_Y} Q ${ARC_W / 2} ${ARC_BASE_Y - ARC_PEAK} ${ARC_W - ARC_PAD_X} ${ARC_BASE_Y}`;
  const activeArcPath = (() => {
    const steps = 20;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * handleT;
      const p = getArcPoint(t);
      pts.push(`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();

  const activeConfig = SYMPTOM_CONFIG.find(c => c.label === activeSymptomModal);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
      className="intake-modal"
    >
      <IonHeader>
        <IonToolbar className="intake-modal__toolbar">
          <IonTitle>Log Symptom</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="intake-modal__content">
        {/* ── Main Cream Card ── */}
        <div className="intake-main-card">
          <div className="intake-modal__section" style={{ marginBottom: 0 }}>
            <span className="intake-modal__label">What are you feeling?</span>
            <div className="symptom-grid">
              {SYMPTOM_CONFIG.map(({ label, icon, color, bg, border }) => {
                const isSelected = selectedSymptoms[label] !== undefined;
                const sev = selectedSymptoms[label];
                return (
                  <button
                    key={label}
                    className={`symptom-card-button ${isSelected ? 'symptom-card-button--active' : ''}`}
                    style={isSelected ? {
                      background: bg,
                      borderColor: border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    } : {}}
                    onClick={() => openSymptomModal(label)}
                    type="button"
                  >
                    <IonIcon icon={icon} style={{ fontSize: '32px', color: isSelected ? color : '#7E807D' }} />
                    <h3 style={{ color: isSelected ? color : '#4A4C4A', margin: 0, marginTop: '12px' }}>{label}</h3>
                    {isSelected && (
                      <div className="symptom-card-badge" style={{ backgroundColor: color }}>
                        {sev.toFixed(1)}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* The "Add Custom" Jewel */}
              <button
                className="symptom-card-button symptom-add-custom"
                type="button"
              >
                <div className="symptom-add-custom__icon-wrapper">
                  <IonIcon icon={addOutline} />
                </div>
                <h3 style={{ color: '#87958B' }}>Add Custom</h3>
              </button>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <span className="intake-modal__label">Additional notes</span>
            </div>
          </div>
        </div>

        {/* ── Notes Slip (Tucked Underneath) ── */}
        <div className="note-slip-wrapper">
          <IonTextarea
            className="note-slip-textarea"
            placeholder="*e.g., Occurred after lunch, took 400mg Ibuprofen..."
            value={note}
            rows={3}
            onIonInput={(e) => setNote(e.detail.value ?? '')}
          />
        </div>

        {/* ── Integrated Aura Summary Canvas ── */}
        <div className="aura-canvas">
          {SYMPTOM_CONFIG.map(({ label, color }, index) => {
            const sev = selectedSymptoms[label];
            if (!sev) return null;
            // Generate stable pseudo-random offsets
            const left = 10 + (index * 27) % 60; 
            const top = 0 + (index * 41) % 40;
            return (
              <div 
                key={`aura-${label}`}
                className="aura-orb"
                style={{ 
                  backgroundColor: color, 
                  opacity: (sev / 5) * 0.9,
                  transform: `scale(${0.7 + (sev / 5) * 0.6})`,
                  left: `${left}%`,
                  top: `${top}%`
                }} 
              />
            );
          })}
        </div>

        {error && <div className="intake-modal__error">{error}</div>}
      </IonContent>

      <IonFooter collapse="fade" className="ion-no-border">
        <div className="intake-modal__footer">
          <IonButton
            fill="clear"
            color="medium"
            className="intake-modal__cancel-btn"
            onClick={handleDismiss}
          >
            Cancel
          </IonButton>
          <IonButton
            fill="solid"
            className="intake-modal__save-btn"
            onClick={handleSave}
          >
            Save Log
          </IonButton>
        </div>
      </IonFooter>

      {/* ── Full Screen Morphing Symptom Modal ── */}
      {activeSymptomModal && (
        <div 
          className={`symptom-fullscreen-overlay ${modalVisible ? 'symptom-fullscreen-overlay--visible' : ''}`}
        >
          {/* Backdrop (clicking it closes and saves) */}
          <div className="symptom-fullscreen-backdrop" onClick={closeSymptomModal} />
          
          {/* Modal Content */}
          <div className="symptom-fullscreen-content">
            <div className="symptom-fullscreen-header">
              <div className="symptom-fullscreen-title">
                {activeConfig && <IonIcon icon={activeConfig.icon} style={{ color: activeConfig.color }} />}
                {activeSymptomModal}
              </div>
              <IonButton fill="clear" color="dark" onClick={closeSymptomModal}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <span className="intake-modal__label" style={{ alignSelf: 'center', marginBottom: '24px' }}>How severe is it?</span>

            <div
              className="intake-modal__severity-container"
              style={{
                '--blob-gradient': blobGradient,
                '--blob-glow': blobGlow,
                marginBottom: '40px',
              } as React.CSSProperties}
            >
              <div className="severity-ambient-glow" />

              <div className="severity-blob-wrapper">
                <div className="severity-blob-container">
                  <div className="severity-blob" />
                </div>

                <div className="severity-status-text">
                  <span className="severity-status-text__feeling">I'm feeling</span>
                  <span className="severity-status-text__label">{feelingLabel}</span>
                  <span className="severity-status-text__score">{snappedSeverity.toFixed(1)} / 5</span>
                </div>

                <div
                  className="curved-slider"
                  onMouseDown={handlePointerDown}
                  onTouchStart={handlePointerDown}
                >
                  <svg
                    ref={svgRef}
                    className="curved-slider__svg"
                    viewBox={`0 0 ${ARC_W} ${ARC_H}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <path d={arcPath} className="curved-slider__track" />
                    <path d={activeArcPath} className="curved-slider__track-active" style={{ stroke: severityColor }} />

                    {[1, 2, 3, 4, 5].map((v, i) => {
                      const t = severityToT(v);
                      const p = getArcPoint(t);
                      const isActive = snappedSeverity >= v;
                      return (
                        <circle
                          key={v}
                          cx={p.x}
                          cy={p.y}
                          r={isActive ? 4.5 : 3.5}
                          className="curved-slider__dot"
                          fill={isActive ? DOT_COLORS[i] : 'rgba(26, 46, 35, 0.15)'}
                        />
                      );
                    })}

                    <circle cx={handlePos.x} cy={handlePos.y} r={14} fill="#FFFFFF" className="curved-slider__handle" />
                    <circle cx={handlePos.x} cy={handlePos.y} r={17} className="curved-slider__handle-ring" />
                  </svg>

                  <div className="curved-slider__labels">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="symptom-fullscreen-actions">
              <IonButton fill="outline" color="danger" className="symptom-remove-btn" onClick={() => removeSymptom(activeSymptomModal)}>
                Remove
              </IonButton>
              <IonButton fill="solid" className="symptom-save-btn" onClick={closeSymptomModal}>
                Save Symptom
              </IonButton>
            </div>
          </div>
        </div>
      )}
    </IonModal>
  );
};

export default IntakeModal;
