import React from 'react';

/**
 * TopographicWave
 * 
 * Subtle layered background contours in the municipal earthy palette
 * that sit behind content sections to provide depth and an organic civic atmosphere.
 */
export const TopographicWave: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`absolute pointer-events-none select-none overflow-hidden ${className}`}
    aria-hidden="true"
    role="presentation"
  >
    <svg
      viewBox="0 0 1200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full opacity-40 dark:opacity-20"
      preserveAspectRatio="none"
    >
      <path
        d="M0 40 C300 80 600 0 900 60 C1050 90 1150 70 1200 50 L1200 120 L0 120 Z"
        fill="#F2A554"
        fillOpacity="0.04"
      />
      <path
        d="M0 60 C250 10 550 90 850 30 C1020 0 1120 40 1200 20"
        stroke="#D96E43"
        strokeWidth="1.2"
        strokeOpacity="0.12"
        strokeDasharray="6 6"
      />
      <path
        d="M0 85 C350 110 700 45 1000 85 C1100 100 1160 90 1200 80"
        stroke="#2C4E5B"
        strokeWidth="1"
        strokeOpacity="0.08"
      />
    </svg>
  </div>
);

/**
 * CardCornerFlourish
 * 
 * Elegant, lightweight corner accent for analytical cards (charts, data tables)
 * bringing community warmth into structured data containers.
 */
export const CardCornerFlourish: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`absolute top-0 right-0 pointer-events-none select-none ${className}`}
    aria-hidden="true"
    role="presentation"
  >
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="80" cy="0" r="60" fill="#E07A28" fillOpacity="0.04" />
      <path
        d="M25 0 C25 30 50 55 80 55"
        stroke="#D96E43"
        strokeWidth="1"
        strokeOpacity="0.15"
        strokeDasharray="3 3"
      />
      <circle cx="55" cy="25" r="3" fill="#F2A554" fillOpacity="0.3" />
    </svg>
  </div>
);
