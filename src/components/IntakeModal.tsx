/**
 * IntakeModal — Symptom Logging Intake Form
 *
 * Jade Horizon glassmorphism aesthetic with frosted glass symptom cards,
 * per-symptom translucent color tints, Mindfulness Halo, and curved arc slider.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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

/* ── Severity label config ── */

const SEVERITY_FEELINGS: Record<number, string> = {
  1: 'Comfortable',
  2: 'Uneasy',
  3: 'Struggling',
  4: 'Overwhelmed',
  5: 'Agitated',
};

/* ══════════════════════════════════════════════════════════════
 * CONTINUOUS RGB LINEAR INTERPOLATION
 * Replaces the old step-bracket functions for perfectly smooth
 * color transitions without any abrupt jumps.
 * ══════════════════════════════════════════════════════════════ */

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parse a hex color string to an RGB object */
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Linearly interpolate between two RGB colors */
function lerpRgb(c1: RGB, c2: RGB, factor: number): RGB {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * factor),
    g: Math.round(c1.g + (c2.g - c1.g) * factor),
    b: Math.round(c1.b + (c2.b - c1.b) * factor),
  };
}

function rgbToString(c: RGB): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function rgbaToString(c: RGB, alpha: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

/** The 5 severity color stops */
const COLOR_STOPS: RGB[] = [
  hexToRgb('#4ADE80'), // 1.0 — Sage Green
  hexToRgb('#FBBF24'), // 2.0 — Soft Yellow
  hexToRgb('#F97316'), // 3.0 — Ochre Amber
  hexToRgb('#EF4444'), // 4.0 — Terracotta Red
  hexToRgb('#E11D48'), // 5.0 — Deep Crimson
];

/**
 * Get a continuously interpolated color for any severity value 1.0–5.0.
 * At severity 2.3, returns 30% blend between stop[1] (yellow) and stop[2] (amber).
 */
function getSmoothColor(value: number): RGB {
  const clamped = Math.max(1, Math.min(5, value));
  if (clamped <= 1) return COLOR_STOPS[0];
  if (clamped >= 5) return COLOR_STOPS[4];
  const segment = clamped - 1; // 0..4
  const index = Math.floor(segment); // 0..3
  const factor = segment - index;   // 0..1 within segment
  return lerpRgb(COLOR_STOPS[index], COLOR_STOPS[Math.min(index + 1, 4)], factor);
}

/**
 * Compute the three offset halo colors for the layered aurora effect.
 * - primary: exact slider value
 * - left: cooler undertone (offset -0.7)
 * - right: warmer highlight (offset +0.7)
 */
function getHaloColors(value: number) {
  const primary = getSmoothColor(value);
  const left = getSmoothColor(value - 0.7);
  const right = getSmoothColor(value + 0.7);
  const glow = getSmoothColor(value);
  return { primary, left, right, glow };
}

/** Get the slider track and dot color as a CSS string */
function getSeverityColorString(value: number): string {
  return rgbToString(getSmoothColor(value));
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

/** 
 * Generates an SVG path for a hollow, wavy torus ring.
 * Draws an outer wavy circle (clockwise) and inner wavy circle (counter-clockwise) 
 * so that when combined, they cut a hole in the center.
 */
function createWavyRingPath(
  cx: number, cy: number, 
  rOut: number, rIn: number, 
  waveCount: number, waveDepthOut: number, waveDepthIn: number, 
  phase: number = 0
): string {
  const pointsOut: {x: number, y: number}[] = [];
  const pointsIn: {x: number, y: number}[] = [];
  const steps = 16; 
  
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const rO = rOut + Math.sin(angle * waveCount + phase) * waveDepthOut;
    pointsOut.push({ x: cx + Math.cos(angle) * rO, y: cy + Math.sin(angle) * rO });

    const rI = rIn + Math.sin(angle * waveCount - phase + Math.PI) * waveDepthIn;
    pointsIn.push({ x: cx + Math.cos(angle) * rI, y: cy + Math.sin(angle) * rI });
  }

  const buildBezierPath = (pts: {x: number, y: number}[], clockwise: boolean) => {
    const arr = clockwise ? [...pts] : [...pts].reverse();
    let d = `M ${arr[0].x.toFixed(1)} ${arr[0].y.toFixed(1)}`;
    const len = arr.length;
    for (let i = 0; i < len; i++) {
      const p0 = arr[i];
      const p1 = arr[(i + 1) % len];
      const p2 = arr[(i + 2) % len];
      
      const cp1x = p0.x + (p1.x - arr[(i - 1 + len) % len].x) / 6;
      const cp1y = p0.y + (p1.y - arr[(i - 1 + len) % len].y) / 6;
      const cp2x = p1.x - (p2.x - p0.x) / 6;
      const cp2y = p1.y - (p2.y - p0.y) / 6;
      
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    d += ' Z';
    return d;
  };

  return `${buildBezierPath(pointsOut, true)} ${buildBezierPath(pointsIn, false)}`;
}

const IntakeModal: React.FC<IntakeModalProps> = ({
  isOpen,
  onDismiss,
  onSave,
}) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Bottom Sheet State
  const [activeSymptomModal, setActiveSymptomModal] = useState<string | null>(null);
  const [activeSeverity, setActiveSeverity] = useState<number>(1.0);

  // Generate the 3 wavy halo layers (thicker and slightly larger)
  const pathLayer1 = useMemo(() => createWavyRingPath(100, 100, 84, 28, 4, 10, 6, 0), []);
  const pathLayer2 = useMemo(() => createWavyRingPath(100, 100, 88, 32, 3, 12, 8, Math.PI / 4), []);
  const pathLayer3 = useMemo(() => createWavyRingPath(100, 100, 80, 26, 5, 8, 5, Math.PI / 2), []);

  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const resetForm = () => {
    setSelectedSymptoms({});
    setNote('');
    setError('');
    setActiveSymptomModal(null);
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const openSymptomModal = (symptom: string) => {
    setActiveSymptomModal(symptom);
    setActiveSeverity(selectedSymptoms[symptom] || 1.0);
  };

  const closeSymptomModal = () => {
    if (activeSymptomModal) {
      // Save it
      setSelectedSymptoms(prev => ({
        ...prev,
        [activeSymptomModal]: Math.round(activeSeverity * 2) / 2
      }));
    }
    setActiveSymptomModal(null);
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const copy = { ...prev };
      delete copy[symptom];
      return copy;
    });
    setActiveSymptomModal(null);
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
  const severityColor = getSeverityColorString(activeSeverity);
  const feelingLabel = SEVERITY_FEELINGS[Math.round(snappedSeverity)] ?? 'Unknown';

  // Continuous halo colors
  const haloColors = getHaloColors(activeSeverity);

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

  // Dot colors — continuously interpolated per dot position
  const dotColors = [1, 2, 3, 4, 5].map(v => getSeverityColorString(v));

  const activeConfig = SYMPTOM_CONFIG.find(c => c.label === activeSymptomModal);

  // CSS variable injection for the halo
  const haloStyleVars = {
    '--halo-color-primary': rgbToString(haloColors.primary),
    '--halo-color-left': rgbToString(haloColors.left),
    '--halo-color-right': rgbToString(haloColors.right),
    '--halo-glow': rgbaToString(haloColors.glow, 0.3),
    marginBottom: '40px',
  } as React.CSSProperties;

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

      {/* ── Bottom Sheet Mindfulness Halo Modal ── */}
      <IonModal
        isOpen={!!activeSymptomModal}
        onDidDismiss={closeSymptomModal}
        breakpoints={[0, 0.65, 0.9]}
        initialBreakpoint={0.65}
        handle={false}
        className="severity-bottom-sheet"
      >
        <div className="severity-sheet-content" style={haloStyleVars as React.CSSProperties}>
          {/* Drag Handle */}
          <div className="severity-sheet-handle" />

          {/* ── Header: Symptom name + close ── */}
          <div className="severity-sheet-header">
            <div className="severity-sheet-title">
              {activeConfig && <IonIcon icon={activeConfig.icon} style={{ color: activeConfig.color, fontSize: '22px' }} />}
              <span>{activeSymptomModal}</span>
            </div>
            <IonButton fill="clear" className="severity-sheet-close" onClick={closeSymptomModal}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </div>

          {/* ── Middle: Halo + status text ── */}
          <div className="severity-sheet-halo-area">
            <div className="severity-ambient-glow" />
            <div className="severity-halo-container">
              <svg
                className="severity-halo-svg"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                style={{ fillRule: 'evenodd' }}
              >
                <defs>
                  <radialGradient id="haloCool" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor={rgbaToString(haloColors.left, 0.75)} />
                    <stop offset="60%" stopColor={rgbaToString(haloColors.left, 0.3)} />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  <radialGradient id="haloWarm" cx="65%" cy="65%" r="65%">
                    <stop offset="0%" stopColor={rgbaToString(haloColors.right, 0.75)} />
                    <stop offset="60%" stopColor={rgbaToString(haloColors.right, 0.3)} />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  <radialGradient id="haloPrimary" cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stopColor={rgbaToString(haloColors.primary, 0.8)} />
                    <stop offset="50%" stopColor={rgbaToString(haloColors.primary, 0.35)} />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                <path d={pathLayer1} fill="url(#haloCool)" className="halo-layer halo-layer--1" />
                <path d={pathLayer2} fill="url(#haloWarm)" className="halo-layer halo-layer--2" />
                <path d={pathLayer3} fill="url(#haloPrimary)" className="halo-layer halo-layer--3" />
              </svg>
            </div>
            <div className="severity-status-text">
              <span className="severity-status-text__feeling">I'm feeling</span>
              <span className="severity-status-text__label">{feelingLabel}</span>
              <span className="severity-status-text__score">{snappedSeverity.toFixed(1)} / 5</span>
            </div>
          </div>

          {/* ── Bottom: Curved Slider + Actions ── */}
          <div className="severity-sheet-footer">
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
                      fill={isActive ? dotColors[i] : 'rgba(26, 46, 35, 0.15)'}
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

            <div className="severity-sheet-actions">
              <IonButton fill="outline" color="danger" className="symptom-remove-btn" onClick={() => removeSymptom(activeSymptomModal!)}>
                Remove
              </IonButton>
              <IonButton fill="solid" className="symptom-save-btn" onClick={closeSymptomModal}>
                Save Symptom
              </IonButton>
            </div>
          </div>
        </div>
      </IonModal>
    </IonModal>
  );
};

export default IntakeModal;
