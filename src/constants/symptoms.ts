import {
  bandage,
  water,
  batteryDead,
  alertCircle,
  body,
  moon,
  heart,
} from 'ionicons/icons';

/**
 * Symptom configuration with glassy selected-state colors.
 * bg: translucent tinted background for selected state
 * border: translucent border color for selected state
 * color: icon/text accent for selected state
 */
export const SYMPTOM_CONFIG = [
  { label: 'Headache', icon: bandage, color: '#B91C1C', bg: 'rgba(254, 226, 226, 0.65)', border: 'rgba(239, 68, 68, 0.5)' },
  { label: 'Nausea', icon: water, color: '#15803D', bg: 'rgba(220, 252, 231, 0.65)', border: 'rgba(34, 197, 94, 0.5)' },
  { label: 'Fatigue', icon: batteryDead, color: '#6B21A8', bg: 'rgba(243, 232, 255, 0.65)', border: 'rgba(168, 85, 247, 0.5)' },
  { label: 'Dizziness', icon: alertCircle, color: '#B45309', bg: 'rgba(254, 243, 199, 0.65)', border: 'rgba(245, 158, 11, 0.5)' },
  { label: 'Body Aches', icon: body, color: '#0369A1', bg: 'rgba(224, 242, 254, 0.65)', border: 'rgba(14, 165, 233, 0.5)' },
  { label: 'Insomnia', icon: moon, color: '#4338CA', bg: 'rgba(224, 231, 255, 0.65)', border: 'rgba(99, 102, 241, 0.5)' },
  { label: 'Anxiety', icon: heart, color: '#9D174D', bg: 'rgba(252, 231, 243, 0.65)', border: 'rgba(236, 72, 153, 0.5)' },
] as const;
