import React from 'react';

interface StatsCornerArtworkProps {
  className?: string;
}

/**
 * StatsCornerArtwork
 * 
 * Corner composition artwork for the Annual Performance & Metrics section.
 * Features two constituents (a woman community auditor and a local farmer/fisherman constituent)
 * reviewing a shared civic indicator ledger.
 * 
 * Palette: Terracotta (#D96E43), Warm Ochre (#F2A554), Deep Rust (#C44D34),
 * Slate Navy (#2C4E5B), and natural espresso tones.
 */
export const StatsCornerArtwork: React.FC<StatsCornerArtworkProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`relative select-none pointer-events-none group ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <svg
        viewBox="0 0 280 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto transition-transform duration-500 ease-out group-hover:-translate-y-1"
      >
        <defs>
          <radialGradient id="statsAura" cx="40%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#F2A554" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#D96E43" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#935F3C" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="auditorTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C44D34" />
            <stop offset="100%" stopColor="#96331E" />
          </linearGradient>

          <linearGradient id="residentTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3D6878" />
            <stop offset="100%" stopColor="#223E49" />
          </linearGradient>
        </defs>

        {/* Ambient Warm Backing Glow */}
        <ellipse cx="140" cy="120" rx="120" ry="85" fill="url(#statsAura)" />

        {/* Decorative Topographic Ring */}
        <path
          d="M30 140 C60 100 120 90 180 110 C220 120 250 150 260 180"
          stroke="#E07A28"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          strokeOpacity="0.3"
        />

        {/* ==================== FIGURE 1 (Left - Woman Auditor in Rust Clay) ==================== */}
        <g id="stats-auditor">
          {/* Torso */}
          <path
            d="M60 125 C75 118 108 118 122 125 C126 150 124 185 120 215 L58 215 C54 185 54 150 60 125 Z"
            fill="url(#auditorTop)"
          />
          {/* Neck */}
          <path d="M84 100 L98 100 L100 125 L82 125 Z" fill="#C88E6D" />
          {/* Head */}
          <ellipse cx="91" cy="88" rx="15" ry="17" fill="#DFA381" />
          {/* Hair - sleek tied-back updo */}
          <path
            d="M91 68 C76 68 72 80 72 94 C76 96 82 92 86 86 C94 82 104 84 108 92 C110 84 104 68 91 68 Z"
            fill="#3D2216"
          />
          <circle cx="73" cy="85" r="7" fill="#2B150C" />

          {/* Arm holding ledger/clipboard forward */}
          <path
            d="M102 135 C115 142 128 148 142 152 C146 155 145 162 140 165 C132 168 124 164 116 158 C106 152 98 144 94 138 Z"
            fill="#DFA381"
          />
        </g>

        {/* ==================== SHARED CIVIC LEDGER / DATA BOARD ==================== */}
        <g id="shared-ledger" transform="rotate(-6 145 155)">
          <rect x="125" y="132" width="48" height="58" rx="3" fill="#FFFDF8" stroke="#D96E43" strokeWidth="1.2" />
          <rect x="137" y="129" width="24" height="6" rx="2" fill="#78442A" />
          {/* Micro chart bars on the ledger */}
          <rect x="133" y="145" width="8" height="18" rx="1" fill="#E11D48" fillOpacity="0.8" />
          <rect x="145" y="140" width="8" height="23" rx="1" fill="#2563EB" fillOpacity="0.8" />
          <rect x="157" y="148" width="8" height="15" rx="1" fill="#D97E2B" fillOpacity="0.8" />
          {/* Tiny ledger lines */}
          <line x1="133" y1="170" x2="165" y2="170" stroke="#C44D34" strokeWidth="1" strokeLinecap="round" />
          <line x1="133" y1="176" x2="158" y2="176" stroke="#C44D34" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* ==================== FIGURE 2 (Right - Male Resident in Slate Teal) ==================== */}
        <g id="stats-resident">
          {/* Torso */}
          <path
            d="M158 125 C172 116 206 116 220 125 C225 152 222 185 218 215 L156 215 C154 185 152 152 158 125 Z"
            fill="url(#residentTop)"
          />
          {/* Neck */}
          <path d="M182 100 L196 100 L198 125 L180 125 Z" fill="#B87D58" />
          {/* Head */}
          <ellipse cx="189" cy="88" rx="15" ry="17" fill="#CFA07E" />
          {/* Hair - cropped textured waves */}
          <path
            d="M189 70 C175 70 171 80 171 91 C175 92 178 88 181 84 C186 78 195 78 200 83 C205 87 205 91 208 92 C210 86 205 70 189 70 Z"
            fill="#24140D"
          />

          {/* Left hand pointing towards the data */}
          <path
            d="M174 135 C162 142 152 148 140 152 C136 150 136 144 140 142 C148 138 158 132 168 128 Z"
            fill="#CFA07E"
          />
        </g>

        {/* Soft baseline divider line */}
        <path d="M40 216 L240 216" stroke="#2C1810" strokeOpacity="0.08" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
