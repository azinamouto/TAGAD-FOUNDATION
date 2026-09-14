import React from 'react';

interface BarangayNetworkArtworkProps {
  className?: string;
}

/**
 * BarangayNetworkArtwork
 * 
 * Left edge-peeking artwork for the Statutory Framework section.
 * Illustrates island and mainland barangay constituents united under the municipal
 * gender & development statutory mandate (Republic Act No. 9710).
 * 
 * Palette: Terracotta (#D96E43), Warm Ochre (#F2A554), Slate Teal (#2C4E5B),
 * Coastal Amber (#E07A28), and deep espresso.
 */
export const BarangayNetworkArtwork: React.FC<BarangayNetworkArtworkProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`relative select-none pointer-events-none group ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <svg
        viewBox="0 0 320 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto transition-transform duration-700 ease-out group-hover:translate-x-1"
      >
        <defs>
          <radialGradient id="brgyAura" cx="20%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#E07A28" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#C85A32" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#935F3C" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="brgyP1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D96E43" />
            <stop offset="100%" stopColor="#B24C27" />
          </linearGradient>

          <linearGradient id="brgyP2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3D6878" />
            <stop offset="100%" stopColor="#1E3842" />
          </linearGradient>

          <linearGradient id="brgyP3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2A554" />
            <stop offset="100%" stopColor="#D97E2B" />
          </linearGradient>
        </defs>

        {/* Ambient Warm Halo on the left border */}
        <ellipse cx="90" cy="140" rx="140" ry="110" fill="url(#brgyAura)" />

        {/* Stylized topography & island bridge arc symbolizing 25 mainland & island barangays */}
        <path
          d="M0 215 C50 200 120 205 180 195 C240 185 290 190 320 180"
          stroke="#E07A28"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          strokeOpacity="0.25"
        />
        <path
          d="M0 230 C70 218 150 225 220 215 C280 205 300 210 320 205"
          stroke="#2C4E5B"
          strokeWidth="1"
          strokeOpacity="0.15"
        />

        {/* ==================== FIGURE 1 (Leftmost - Peeking Woman in Ochre) ==================== */}
        <g id="brgy-fig-1">
          {/* Peeking Torso from extreme left */}
          <path
            d="M-10 160 C15 155 45 158 55 170 C60 195 58 230 52 255 L-20 255 Z"
            fill="url(#brgyP3)"
          />
          {/* Neck & Head */}
          <path d="M18 135 L34 135 L36 162 L16 162 Z" fill="#D49970" />
          <ellipse cx="25" cy="122" rx="14" ry="17" fill="#E8B590" />
          {/* Hair */}
          <path
            d="M25 104 C10 104 5 116 5 130 C9 132 15 128 17 122 C22 118 30 118 35 124 C38 120 36 104 25 104 Z"
            fill="#351B12"
          />
          {/* Arm holding hands or extending rightward */}
          <path
            d="M48 175 C60 182 72 188 84 192 C88 194 88 200 84 204 C76 206 68 202 60 196 C50 190 44 184 40 180 Z"
            fill="#E8B590"
          />
        </g>

        {/* ==================== FIGURE 2 (Center - Male Community Fisherman/Leader in Slate Teal) ==================== */}
        <g id="brgy-fig-2">
          {/* Torso */}
          <path
            d="M65 145 C82 135 120 135 136 145 C142 175 140 215 132 255 L68 255 C62 215 60 175 65 145 Z"
            fill="url(#brgyP2)"
          />
          {/* Neck */}
          <path d="M92 118 L108 118 L110 146 L90 146 Z" fill="#B87D58" />
          {/* Head */}
          <ellipse cx="100" cy="106" rx="16" ry="19" fill="#CFA07E" />
          {/* Hat / Hair (clean sun-visor / textured cap fitting coastal Talibon) */}
          <path
            d="M100 86 C82 86 78 98 78 110 C82 111 86 108 88 103 C93 98 102 97 110 101 C116 105 117 111 120 112 C122 105 118 86 100 86 Z"
            fill="#24140D"
          />

          {/* Left arm connecting with Figure 1 */}
          <path
            d="M68 152 C58 160 52 172 48 184 C54 188 62 184 68 174 C74 165 78 158 80 155 Z"
            fill="#CFA07E"
          />
          {/* Right arm draped over Figure 3 */}
          <path
            d="M130 152 C146 160 162 168 178 176 C182 180 180 186 174 188 C164 190 152 182 140 174 C132 166 128 160 126 155 Z"
            fill="#CFA07E"
          />
        </g>

        {/* ==================== FIGURE 3 (Right - Female Constituent in Warm Terracotta) ==================== */}
        <g id="brgy-fig-3">
          {/* Torso */}
          <path
            d="M148 155 C164 148 196 148 208 158 C214 185 212 222 206 255 L150 255 C146 220 144 185 148 155 Z"
            fill="url(#brgyP1)"
          />
          {/* Neck */}
          <path d="M172 130 L186 130 L188 156 L170 156 Z" fill="#C88E6D" />
          {/* Head */}
          <ellipse cx="179" cy="118" rx="15" ry="18" fill="#DFA381" />
          {/* Hair - flowing warm auburn curls */}
          <path
            d="M179 98 C160 98 152 112 153 132 C154 152 158 172 162 185 C166 186 172 182 172 176 C168 160 168 140 170 126 C175 127 182 128 186 132 C189 146 188 168 192 184 C194 187 200 187 202 182 C206 164 206 140 203 124 C201 110 195 98 179 98 Z"
            fill="#3D2216"
          />

          {/* Right Arm waving forward toward the 25 barangays text */}
          <path
            d="M204 165 C220 174 238 182 254 188 C260 190 262 196 258 200 C250 204 242 200 230 194 C216 186 208 178 202 170 Z"
            fill="#DFA381"
          />
          <path
            d="M202 160 C214 168 226 175 236 180 C234 186 226 190 216 184 C208 178 204 172 200 166 Z"
            fill="url(#brgyP1)"
          />
        </g>

        {/* Small grounding baseline anchor */}
        <path d="M0 256 L240 256" stroke="#2C1810" strokeOpacity="0.08" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
