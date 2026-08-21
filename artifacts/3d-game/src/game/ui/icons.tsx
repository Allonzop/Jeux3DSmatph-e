import React from 'react';
import { ResourceType } from '../store';

/**
 * Custom vector icons — replace native emojis so the game looks the same
 * on every device (iPhone emojis made it feel like a prototype).
 * Style: chunky low-poly cartoon, rounded shapes, soft highlights.
 */

type IconProps = { className?: string };

export function ResourceIcon({ type, className }: IconProps & { type: ResourceType }) {
  switch (type) {
    case 'boulons':
      // Hex nut
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2.4 L20.3 7.2 V16.8 L12 21.6 L3.7 16.8 V7.2 Z"
            fill="#cfd6dd"
            stroke="#8f9aa6"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.8" fill="#4a5560" />
          <circle cx="12" cy="12" r="3.8" fill="none" stroke="#9aa7b4" strokeWidth="0.9" />
          <path
            d="M6.6 7.6 A 7 7 0 0 1 11 5.1"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      );
    case 'matiere_floue':
      // Fuzzy purple blob with a curl
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="9" cy="10" r="4.6" fill="#8e5ce8" />
          <circle cx="15.2" cy="10.4" r="3.9" fill="#8e5ce8" />
          <circle cx="12" cy="14.2" r="4.9" fill="#8e5ce8" />
          <circle cx="8.4" cy="8.6" r="1.7" fill="#c9b1f7" opacity="0.9" />
          <path
            d="M12 13.8 a2.6 2.6 0 1 1 2.6 -2.6"
            fill="none"
            stroke="#f1e8ff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'energie_rire':
      // Joy spark
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2.5 L14.3 9.7 L21.5 12 L14.3 14.3 L12 21.5 L9.7 14.3 L2.5 12 L9.7 9.7 Z"
            fill="#ffd24c"
            stroke="#e0a92a"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" fill="#fff6d8" />
          <circle cx="19" cy="4.9" r="1.2" fill="#ffd24c" />
        </svg>
      );
    default:
      return null;
  }
}

export function BuildingIcon({ id, className }: IconProps & { id: string }) {
  switch (id) {
    case 'hutte':
      // Mushroom-cap house
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="7" y="12.5" width="10" height="8" rx="2.2" fill="#f3e2c3" />
          <rect x="10.4" y="15" width="3.2" height="5.5" rx="1.6" fill="#8a6242" />
          <path
            d="M3.5 11.5 Q3.5 3.5 12 3.5 Q20.5 3.5 20.5 11.5 Q20.5 13 18.8 13 H5.2 Q3.5 13 3.5 11.5 Z"
            fill="#f4a261"
          />
          <circle cx="8" cy="8.4" r="1.2" fill="#ffffff" opacity="0.55" />
          <circle cx="14.6" cy="6.6" r="0.9" fill="#ffffff" opacity="0.55" />
        </svg>
      );
    case 'ferme':
      // Sprout under a glass dome
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4.5 13.5 a7.5 7.5 0 0 1 15 0 v0.5 H4.5 Z" fill="#bfeefe" opacity="0.75" />
          <path d="M12 12.8 V8.6" stroke="#3da97c" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 9 C12 6.8 10 6 8.6 6.4 C8.8 8.4 10.4 9.3 12 9 Z" fill="#57cc99" />
          <path d="M12 10.8 C12 9 13.7 8.2 15.2 8.6 C15 10.4 13.5 11.2 12 10.8 Z" fill="#6fdcaa" />
          <rect x="3.5" y="14" width="17" height="4.8" rx="2.4" fill="#8a6f4d" />
          <rect x="3.5" y="14" width="17" height="2" rx="1" fill="#a1855f" />
        </svg>
      );
    case 'bar':
      // Space cocktail
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M5 4 H19 L13.4 11 V17.5 H16.2 a1.2 1.2 0 0 1 0 2.4 H7.8 a1.2 1.2 0 0 1 0 -2.4 H10.6 V11 Z"
            fill="#ffd9cf"
          />
          <path d="M7.6 5.8 L16.4 5.8 L12 10.4 Z" fill="#e07a5f" />
          <path d="M13.2 5 L16.8 1.7" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <circle cx="15.4" cy="4.4" r="1.6" fill="#e63946" />
        </svg>
      );
    case 'antenne':
      // Radar dish
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M10 20.8 L12.6 15" stroke="#b3313d" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16.6 20.8 L13.9 15.2" stroke="#b3313d" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.5 13.5 A 8.5 8.5 0 0 1 13 5 L13 13.5 Z" fill="#e63946" />
          <path d="M12.9 13.6 L17 9.5" stroke="#f4a5ab" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="13.5" r="1.7" fill="#f4a5ab" />
          <circle cx="17.4" cy="9.1" r="1.1" fill="#ffd24c" />
          <circle cx="19.4" cy="6.9" r="0.85" fill="#ffd24c" opacity="0.7" />
          <circle cx="21.2" cy="4.8" r="0.7" fill="#ffd24c" opacity="0.45" />
        </svg>
      );
    case 'marche':
      // Market stall with scalloped awning
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="4.6" y="9" width="1.8" height="11" rx="0.9" fill="#a97c3f" />
          <rect x="17.6" y="9" width="1.8" height="11" rx="0.9" fill="#a97c3f" />
          <rect x="3.8" y="15.5" width="16.4" height="5" rx="1.8" fill="#f3e2c3" />
          <rect x="3.6" y="3.8" width="16.8" height="3.8" rx="1.6" fill="#ffd24c" />
          <path d="M3.6 7.4 a2.1 2.1 0 0 0 4.2 0 Z" fill="#ffd24c" />
          <path d="M7.8 7.4 a2.1 2.1 0 0 0 4.2 0 Z" fill="#fff7e0" />
          <path d="M12 7.4 a2.1 2.1 0 0 0 4.2 0 Z" fill="#ffd24c" />
          <path d="M16.2 7.4 a2.1 2.1 0 0 0 4.2 0 Z" fill="#fff7e0" />
        </svg>
      );
    case 'tourelle':
      // Turret pod on legs
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M8 21 L10.5 15.5" stroke="#2a7f9e" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 21 L13.5 15.5" stroke="#2a7f9e" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="10.9" y="2.6" width="2.2" height="5.4" rx="1.1" fill="#2a7f9e" />
          <circle cx="12" cy="2.9" r="1.35" fill="#ffd24c" />
          <circle cx="12" cy="12.5" r="5.4" fill="#4cc9f0" />
          <circle cx="12" cy="12.5" r="2.5" fill="#163a4a" />
          <circle cx="11.2" cy="11.7" r="0.8" fill="#ffffff" opacity="0.8" />
          <path
            d="M8.2 10 A 5 5 0 0 1 10.8 7.7"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      );
    case 'mortier':
      // Squat mortar tube pointing up
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="4.4" y="16.4" width="15.2" height="4.4" rx="2.2" fill="#4a4a52" />
          <path d="M7.6 17.6 L13.4 6.2 L17.6 8.4 L11.8 19.8 Z" fill="#33333a" />
          <path d="M12.6 6.6 L17.2 9" stroke="#ff7b00" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="15.2" cy="4.4" r="2.1" fill="#ffba08" />
          <circle cx="18.9" cy="2.6" r="1.15" fill="#ff7b00" opacity="0.8" />
          <rect x="8.6" y="12.4" width="7.6" height="1.5" rx="0.75" transform="rotate(-27 12 13)" fill="#ff7b00" />
        </svg>
      );
    case 'cryo':
      // Ice spire inside a frost ring
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <ellipse cx="12" cy="18.6" rx="8.6" ry="2.6" fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.75" />
          <path d="M12 3.2 L15.4 12.4 H8.6 Z" fill="#e0f2fe" />
          <path d="M8.6 12.4 H15.4 L14.4 16.8 H9.6 Z" fill="#bae6fd" />
          <path d="M6.2 9.6 L8 14.2 L4.6 13.6 Z" fill="#bae6fd" opacity="0.9" />
          <path d="M17.8 9.6 L16 14.2 L19.4 13.6 Z" fill="#bae6fd" opacity="0.9" />
          <circle cx="12" cy="8.4" r="1.3" fill="#ffffff" opacity="0.85" />
        </svg>
      );
    case 'tesla':
      // Coil stack topped by a sparking orb
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M8 20.6 L10.4 13.6 H13.6 L16 20.6 Z" fill="#3d3357" />
          <ellipse cx="12" cy="13.4" rx="4.6" ry="1.5" fill="#b388eb" />
          <ellipse cx="12" cy="10.8" rx="3.7" ry="1.25" fill="#b388eb" opacity="0.85" />
          <ellipse cx="12" cy="8.5" rx="2.9" ry="1" fill="#b388eb" opacity="0.7" />
          <circle cx="12" cy="5.2" r="2.7" fill="#f3e8ff" />
          <path d="M12 5.2 L17.6 1.8 M12 5.2 L6.6 2.2 M12 5.2 L19.4 6.4" stroke="#e9d5ff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function MoveIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.5 L12 21.5 M2.5 12 L21.5 12 M12 2.5 L9 5.5 M12 2.5 L15 5.5 M12 21.5 L9 18.5 M12 21.5 L15 18.5 M2.5 12 L5.5 9 M2.5 12 L5.5 15 M21.5 12 L18.5 9 M21.5 12 L18.5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HammerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M14.6 3.2 L20.8 9.4 L18 12.2 L15.6 9.8 L5.9 19.5 a1.9 1.9 0 0 1 -2.7 -2.7 L12.9 7.1 L10.5 4.7 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SwordIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M20.5 3.5 L12.6 11.4 L9.4 8.2 L17.3 0.3 Z" fill="none" />
      <path
        d="M21 3 L13.4 10.6 L10.2 13.8 L7.6 11.2 L10.8 8 L18.4 0.4 Z M9.2 14.8 L7 17 M4.4 15.2 L8.8 19.6 M6.6 13 L11 17.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.4 L20 5.4 V11 c0 5.2 -3.4 9 -8 10.6 C7.4 20 4 16.2 4 11 V5.4 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SpeakerIcon({ className, muted }: IconProps & { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" fill="currentColor" />
      {muted ? (
        <path d="M15.5 9.5 L20.5 14.5 M20.5 9.5 L15.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path
          d="M15.4 9 a4 4 0 0 1 0 6 M18 6.8 a7.4 7.4 0 0 1 0 10.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.2 L14.9 8.6 L21.8 9.4 L16.7 14 L18.1 20.8 L12 17.3 L5.9 20.8 L7.3 14 L2.2 9.4 L9.1 8.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SkullIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.4 c-4.7 0 -8 3.3 -8 7.6 0 2.5 1.2 4.3 2.8 5.5 V19 a1.6 1.6 0 0 0 1.6 1.6 h7.2 A1.6 1.6 0 0 0 17.2 19 v-3.5 c1.6 -1.2 2.8 -3 2.8 -5.5 0 -4.3 -3.3 -7.6 -8 -7.6 Z"
        fill="currentColor"
      />
      <circle cx="9" cy="10.4" r="1.9" fill="#111827" />
      <circle cx="15" cy="10.4" r="1.9" fill="#111827" />
      <rect x="11" y="13.6" width="2" height="3" rx="1" fill="#111827" />
    </svg>
  );
}
