import React from 'react';

interface LandingBackgroundOverlaysProps {
  className?: string;
}

/**
 * LandingBackgroundOverlays
 * 
 * Recreates the soft, translucent geometric pastel color overlays from the design reference:
 * - Pale yellow / cream (#FFF5CC) for the upper-left diagonal area
 * - Soft lavender (#DCDCFB) for the upper-right area
 * - Light pink / blush (#F9C2C7) for the lower-right diagonal area
 * - Very light peach (#FFE0C2) for subtle overlapping areas
 * 
 * Features smooth, clean diagonal geometry layered behind all page content
 * with zero interference with pointer events or content readability.
 */
export const LandingBackgroundOverlays: React.FC<LandingBackgroundOverlaysProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <svg
        viewBox="0 0 1440 1200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover dark:opacity-20 transition-opacity duration-300"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Upper-Left: Pale Yellow / Cream Linear Gradient */}
          <linearGradient id="bgYellowGrad" x1="0%" y1="0%" x2="60%" y2="80%">
            <stop offset="0%" stopColor="#FFF5CC" stopOpacity="0.82" />
            <stop offset="60%" stopColor="#FFF2BF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FFF9E0" stopOpacity="0.35" />
          </linearGradient>

          {/* Secondary Upper-Left Facet */}
          <linearGradient id="bgYellowFacetGrad" x1="10%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFF5CC" stopOpacity="0.60" />
            <stop offset="100%" stopColor="#FFF9E6" stopOpacity="0.25" />
          </linearGradient>

          {/* Upper-Right: Soft Lavender Gradient */}
          <linearGradient id="bgLavenderGrad" x1="60%" y1="0%" x2="100%" y2="60%">
            <stop offset="0%" stopColor="#DCDCFB" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#E4E4FC" stopOpacity="0.70" />
            <stop offset="100%" stopColor="#EEEEFD" stopOpacity="0.40" />
          </linearGradient>

          {/* Lower-Right: Light Pink / Blush Gradient */}
          <linearGradient id="bgBlushGrad" x1="30%" y1="60%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#F9C2C7" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#FAC8CD" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FCDCE0" stopOpacity="0.45" />
          </linearGradient>

          {/* Center Overlap: Very Light Peach Gradient */}
          <linearGradient id="bgPeachOverlapGrad" x1="20%" y1="40%" x2="80%" y2="80%">
            <stop offset="0%" stopColor="#FFE0C2" stopOpacity="0.60" />
            <stop offset="60%" stopColor="#FFE8D2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFF1E3" stopOpacity="0.20" />
          </linearGradient>
        </defs>

        {/* 1. UPPER-LEFT DIAGONAL FACETS (Pale yellow / cream #FFF5CC) */}
        {/* Main upper-left diagonal triangle extending down-left */}
        <polygon
          points="0,0 360,0 0,920"
          fill="url(#bgYellowGrad)"
        />

        {/* Secondary softer facet extending diagonally toward lower center */}
        <polygon
          points="0,180 520,780 180,1200 0,1200"
          fill="url(#bgYellowFacetGrad)"
        />

        {/* 2. UPPER-RIGHT AREA (Soft lavender #DCDCFB) */}
        {/* Clean diagonal wedge covering upper right behind hero */}
        <polygon
          points="720,0 1440,0 1440,560"
          fill="url(#bgLavenderGrad)"
        />

        {/* Secondary soft lavender facet extending toward upper-middle */}
        <polygon
          points="900,0 1440,120 1440,680 1120,480"
          fill="#DCDCFB"
          fillOpacity="0.35"
        />

        {/* 3. LOWER-RIGHT DIAGONAL AREA (Light pink / blush #F9C2C7) */}
        {/* Prominent diagonal band cutting across lower-right behind metrics and seal */}
        <polygon
          points="460,780 1440,380 1440,1020 760,1200"
          fill="url(#bgBlushGrad)"
        />

        {/* 4. SUBTLE OVERLAPPING AREA (Very light peach #FFE0C2) */}
        {/* Harmonious junction between yellow, pink, and lavender planes */}
        <polygon
          points="320,540 880,360 1160,720 540,1080"
          fill="url(#bgPeachOverlapGrad)"
        />

        {/* Diagonal clean dividing boundary lines with ultra-subtle sheen */}
        <line
          x1="360"
          y1="0"
          x2="0"
          y2="920"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
        <line
          x1="720"
          y1="0"
          x2="1440"
          y2="560"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
        <line
          x1="460"
          y1="780"
          x2="1440"
          y2="380"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
};
