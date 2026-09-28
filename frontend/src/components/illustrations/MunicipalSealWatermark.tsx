import React from 'react';

interface MunicipalSealWatermarkProps {
  className?: string;
}

/**
 * MunicipalSealWatermark
 * 
 * Recreates the oversized, semi-transparent circular municipal seal graphic from the design reference:
 * - Positioned toward the lower-right side of the page, extending partially beyond the viewport
 * - Muted pink, lavender, and cream palette (#F9C2C7, #DCDCFB, #FFF5CC)
 * - Low opacity watermark sitting strictly behind all interactive content and cards
 * - Features concentric decorative rings, circumferential Talibon civic lettering,
 *   equilateral central crest triangle, 5-point star, and Bohol coastal/agricultural motifs.
 */
export const MunicipalSealWatermark: React.FC<MunicipalSealWatermarkProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`absolute pointer-events-none select-none overflow-visible z-0 ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <svg
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[480px] h-[480px] sm:w-[640px] sm:h-[640px] lg:w-[820px] lg:h-[820px] max-w-none opacity-25 dark:opacity-10 transition-opacity duration-300"
      >
        <defs>
          {/* Subtle gradient fills for seal elements */}
          <linearGradient id="sealPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E27380" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C85265" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="sealCreamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF5CC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFE099" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="sealLavenderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B4B4EE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DCDCFB" stopOpacity="0.3" />
          </linearGradient>

          {/* Top text arc: Sweeps over the top half of the circle (clockwise) */}
          <path
            id="talibonTopTextArc"
            d="M 100 400 A 300 300 0 1 1 700 400"
            fill="none"
          />

          {/* Bottom text arc: Sweeps along the bottom half (clockwise) */}
          <path
            id="talibonBottomTextArc"
            d="M 695 410 A 295 295 0 0 1 105 410"
            fill="none"
          />
        </defs>

        {/* ================= BACKGROUND AURA & OUTER CONCENTRIC BORDERS ================= */}
        {/* Soft background tint behind seal */}
        <circle cx="400" cy="400" r="390" fill="#FFF5CC" fillOpacity="0.12" />
        <circle cx="400" cy="400" r="380" stroke="#D96E43" strokeWidth="6" strokeOpacity="0.35" />
        <circle cx="400" cy="400" r="366" stroke="#C85265" strokeWidth="2" strokeOpacity="0.4" />
        <circle
          cx="400"
          cy="400"
          r="354"
          stroke="#E27380"
          strokeWidth="3"
          strokeDasharray="4 8"
          strokeOpacity="0.45"
        />

        {/* Circular text band background */}
        <circle cx="400" cy="400" r="306" stroke="#D96E43" strokeWidth="3" strokeOpacity="0.4" />
        <circle cx="400" cy="400" r="294" stroke="#B4B4EE" strokeWidth="1.5" strokeOpacity="0.3" />

        {/* ================= CIRCUMFERENTIAL CIVIC LETTERING ================= */}
        {/* Upper Arc: MUNICIPALITY OF TALIBON */}
        <text
          fill="#B03A48"
          fillOpacity="0.65"
          className="font-black tracking-[0.22em] text-[40px] uppercase font-sans select-none"
        >
          <textPath
            href="#talibonTopTextArc"
            startOffset="50%"
            textAnchor="middle"
          >
            MUNICIPALITY OF TALIBON
          </textPath>
        </text>

        {/* Lower Arc: • PROVINCE OF BOHOL • */}
        <text
          fill="#B03A48"
          fillOpacity="0.65"
          className="font-bold tracking-[0.24em] text-[34px] uppercase font-sans select-none"
        >
          <textPath
            href="#talibonBottomTextArc"
            startOffset="50%"
            textAnchor="middle"
          >
            • PROVINCE OF BOHOL •
          </textPath>
        </text>

        {/* Lateral Separator Stars in text ring */}
        <g fill="#D96E43" fillOpacity="0.5">
          <polygon points="100,400 106,412 118,414 110,422 112,434 100,428 88,434 90,422 82,414 94,412" transform="translate(0,-10)" />
          <polygon points="700,400 706,412 718,414 710,422 712,434 700,428 688,434 690,422 682,414 694,412" transform="translate(0,-10)" />
        </g>

        {/* ================= INNER CREST / SHIELD ================= */}
        {/* Inner Field Background */}
        <circle cx="400" cy="400" r="290" fill="#FFFBF0" fillOpacity="0.35" />

        {/* Subtle radial sunburst rays behind triangle */}
        <g stroke="#F2A554" strokeWidth="1.5" strokeOpacity="0.25">
          <line x1="400" y1="400" x2="400" y2="120" />
          <line x1="400" y1="400" x2="480" y2="135" />
          <line x1="400" y1="400" x2="320" y2="135" />
          <line x1="400" y1="400" x2="550" y2="175" />
          <line x1="400" y1="400" x2="250" y2="175" />
          <line x1="400" y1="400" x2="610" y2="235" />
          <line x1="400" y1="400" x2="190" y2="235" />
        </g>

        {/* Clouds & Mount Horizon Contours (Upper Center) */}
        <path
          d="M 270 320 C 310 290 350 310 400 295 C 450 310 490 290 530 320"
          stroke="#C85265"
          strokeWidth="3"
          strokeOpacity="0.3"
          fill="none"
        />
        <path
          d="M 320 310 C 350 280 380 290 400 280 C 420 290 450 280 480 310"
          stroke="#C85265"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeOpacity="0.25"
          fill="none"
        />

        {/* Central Triangle (Equilateral, pointing upwards) */}
        {/* Outer Triangle */}
        <polygon
          points="400,195 595,532 205,532"
          stroke="url(#sealPinkGrad)"
          strokeWidth="14"
          strokeLinejoin="round"
          fill="#FFF7E6"
          fillOpacity="0.4"
        />
        {/* Inner Triangle Border */}
        <polygon
          points="400,225 570,518 230,518"
          stroke="#C85265"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
          strokeOpacity="0.45"
        />

        {/* Five-Point Star in the center of the triangle */}
        <g transform="translate(400, 395) scale(1.15)">
          <polygon
            points="0,-65 20,-20 65,-20 30,12 42,58 0,30 -42,58 -30,12 -65,-20 -20,-20"
            fill="url(#sealCreamGrad)"
            stroke="#D96E43"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeOpacity="0.55"
          />
          {/* Inner faceted star facets */}
          <line x1="0" y1="0" x2="0" y2="-65" stroke="#D96E43" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="0" y1="0" x2="65" y2="-20" stroke="#D96E43" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="0" y1="0" x2="42" y2="58" stroke="#D96E43" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="0" y1="0" x2="-42" y2="58" stroke="#D96E43" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="0" y1="0" x2="-65" y2="-20" stroke="#D96E43" strokeWidth="2" strokeOpacity="0.4" />
        </g>

        {/* ================= BOHOL CIVIC MOTIFS ================= */}
        {/* Right Motif: Marine Fish (Talibon Danajon Bank coastal marine reserve) */}
        <g transform="translate(540, 360) scale(0.75)" stroke="#3D6878" strokeWidth="3" strokeOpacity="0.4" fill="#B4B4EE" fillOpacity="0.15">
          {/* Fish Body */}
          <path
            d="M 120 0 C 80 -45 20 -40 -40 -15 C -80 0 -110 30 -140 45 L -165 20 L -155 55 L -165 90 L -140 65 C -100 80 -60 70 -20 50 C 30 30 90 35 120 0 Z"
            strokeLinejoin="round"
          />
          {/* Fish Fin */}
          <path d="M -10 -35 C 10 -60 40 -50 50 -25" strokeLinecap="round" />
          <path d="M -10 40 C 10 65 35 55 45 30" strokeLinecap="round" />
          {/* Fish Eye & Gills */}
          <circle cx="85" cy="-5" r="4" fill="#2C4E5B" fillOpacity="0.4" />
          <path d="M 60 -18 C 50 0 50 15 60 20" strokeLinecap="round" />
        </g>

        {/* Left Motif: Coastal Coconut Palm Trees (Shoreline / Agricultural heritage) */}
        <g transform="translate(195, 490) scale(0.65)" stroke="#C85265" strokeWidth="3" strokeOpacity="0.4" fill="#C85265" fillOpacity="0.2">
          {/* Palm Trunks */}
          <path d="M 40 100 C 50 50 65 10 90 -40" fill="none" strokeWidth="5" strokeLinecap="round" />
          <path d="M 10 100 C 15 60 25 25 45 -20" fill="none" strokeWidth="4" strokeLinecap="round" />
          {/* Palm Fronds Tree 1 */}
          <path d="M 90 -40 C 60 -60 20 -55 0 -40" fill="none" />
          <path d="M 90 -40 C 80 -75 50 -90 20 -80" fill="none" />
          <path d="M 90 -40 C 110 -80 135 -75 150 -55" fill="none" />
          <path d="M 90 -40 C 125 -60 155 -30 160 0" fill="none" />
          <path d="M 90 -40 C 100 -5 110 20 120 40" fill="none" />
          {/* Palm Fronds Tree 2 */}
          <path d="M 45 -20 C 20 -40 -10 -35 -25 -20" fill="none" />
          <path d="M 45 -20 C 35 -50 10 -60 -10 -50" fill="none" />
          <path d="M 45 -20 C 65 -50 85 -45 100 -30" fill="none" />
        </g>

        {/* Lower Right Motif: Carabao with Plow (Talibon lowland agriculture) */}
        <g transform="translate(450, 520) scale(0.55)" stroke="#C85265" strokeWidth="3" strokeOpacity="0.4" fill="#C85265" fillOpacity="0.2">
          {/* Carabao Silhouette */}
          <path
            d="M 120 40 C 110 30 95 30 80 40 C 65 30 45 35 30 50 L 10 50 L 10 75 L 25 75 L 30 65 L 60 65 L 65 80 L 80 80 L 85 60 C 95 60 110 65 125 55 Z"
            strokeLinejoin="round"
          />
          {/* Curved Horns */}
          <path d="M 115 32 C 125 20 140 18 145 22 C 145 28 135 32 125 35" fill="none" strokeWidth="4" />
          {/* Traditional Plow */}
          <path d="M 25 55 L -30 65 L -45 80" fill="none" strokeWidth="3" />
          <path d="M -30 65 L -20 40" fill="none" strokeWidth="3" />
          {/* Furrowed Field Base */}
          <path d="M -60 85 Q 30 75 140 85" fill="none" strokeWidth="2.5" strokeDasharray="6 4" />
        </g>

        {/* Decorative inner circular beaded accent */}
        <circle
          cx="400"
          cy="400"
          r="268"
          stroke="#D96E43"
          strokeWidth="1.5"
          strokeDasharray="2 6"
          strokeOpacity="0.3"
        />
      </svg>
    </div>
  );
};
