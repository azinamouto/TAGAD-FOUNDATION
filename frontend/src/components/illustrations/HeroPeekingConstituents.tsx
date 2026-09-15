import React from 'react';

interface HeroPeekingConstituentsProps {
  className?: string;
}

/**
 * HeroPeekingConstituents
 * 
 * Edge-peeking SVG artwork for the Portal Hero section.
 * Portrays two diverse civic constituents (a young woman advocate with a tablet/folder
 * and a community organizer) leaning in from the right edge of the viewport.
 * 
 * Palette: Warm terracotta (#D96E43), amber ochre (#F2A554), slate teal (#2C4E5B),
 * warm espresso (#3D2216), and natural skin tones (#DFA381, #CFA07E).
 */
export const HeroPeekingConstituents: React.FC<HeroPeekingConstituentsProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`relative select-none pointer-events-none group ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <svg
        viewBox="0 0 340 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto transition-transform duration-700 ease-out group-hover:translate-x-1"
      >
        <defs>
          {/* Warm background aura */}
          <radialGradient id="heroAura" cx="80%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#E07A28" stopOpacity="0.14" />
            <stop offset="60%" stopColor="#C85A32" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#935F3C" stopOpacity="0" />
          </radialGradient>

          {/* Gradients for figures */}
          <linearGradient id="heroTealTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3D6878" />
            <stop offset="60%" stopColor="#2C4E5B" />
            <stop offset="100%" stopColor="#1E3842" />
          </linearGradient>

          <linearGradient id="heroAmberTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2A554" />
            <stop offset="100%" stopColor="#D96E43" />
          </linearGradient>

          <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF3E0" />
            <stop offset="100%" stopColor="#FFE0B2" />
          </linearGradient>

          <filter id="heroShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="-2" dy="4" stdDeviation="6" floodColor="#2C1810" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Soft atmospheric glow */}
        <ellipse cx="220" cy="210" rx="160" ry="150" fill="url(#heroAura)" />

        {/* ==================== FIGURE 1: Community Organizer (Tall male, Slate Teal) ==================== */}
        <g id="organizer-figure">
          {/* Torso - Peeking from right edge */}
          <path
            d="M200 170 C175 180 155 210 148 250 C144 285 146 335 150 380 L280 380 C276 330 270 270 260 210 C252 185 225 162 200 170 Z"
            fill="url(#heroTealTop)"
          />

          {/* Neck */}
          <path d="M196 142 L220 142 L222 174 L194 174 Z" fill="#B87D58" />

          {/* Head & Ear */}
          <ellipse cx="208" cy="125" rx="22" ry="26" fill="#CFA07E" />
          <ellipse cx="186" cy="127" rx="4" ry="7" fill="#B87D58" />

          {/* Hair (textured cropped short hair) */}
          <path
            d="M208 98 C185 98 180 114 182 130 C187 132 192 127 194 120 C198 112 210 110 222 114 C230 118 232 126 236 128 C238 118 234 98 208 98 Z"
            fill="#24140D"
          />

          {/* Left Arm / Shoulder reaching slightly inward toward portal content */}
          <path
            d="M152 230 C138 245 125 268 116 295 C124 300 134 298 142 290 C148 270 156 250 164 235 Z"
            fill="#CFA07E"
          />
          <path
            d="M165 215 C150 228 138 248 130 270 C138 278 150 274 158 260 C166 245 174 230 180 220 Z"
            fill="url(#heroTealTop)"
          />
        </g>

        {/* ==================== FIGURE 2: Civic Advocate (Foreground Female with GAD Record Folder) ==================== */}
        <g id="advocate-figure" filter="url(#heroShadow)">
          {/* Torso (Warm Terracotta / Amber) */}
          <path
            d="M210 230 C185 240 162 270 156 315 C152 345 152 368 154 380 L320 380 C316 340 310 295 295 250 C280 225 240 218 210 230 Z"
            fill="url(#heroAmberTop)"
          />

          {/* Neck */}
          <path d="M228 190 L248 190 L250 232 L224 232 Z" fill="#C88E6D" />

          {/* Head */}
          <ellipse cx="238" cy="172" rx="20" ry="24" fill="#DFA381" />

          {/* Hair (Flowing wavy chestnut curls) */}
          <path
            d="M238 145 C215 145 205 165 206 190 C206 220 212 250 218 270 C223 272 230 268 232 260 C226 235 224 205 228 185 C235 186 244 187 248 192 C252 210 250 240 255 264 C257 268 266 268 268 262 C273 238 274 205 270 182 C268 162 260 145 238 145 Z"
            fill="#3D2216"
          />
          <path
            d="M234 148 C222 152 216 164 218 180 C224 168 236 160 248 162 C258 164 262 172 264 182 C265 170 260 156 250 150 C244 146 238 147 234 148 Z"
            fill="#543120"
          />

          {/* Left Arm holding GAD transparency folder/tablet */}
          <path
            d="M172 290 C154 305 138 322 126 345 C132 352 144 352 152 342 C162 325 174 310 188 298 Z"
            fill="#DFA381"
          />
          <path
            d="M188 270 C172 284 158 300 148 320 C156 328 168 325 178 310 C186 298 196 286 204 276 Z"
            fill="url(#heroAmberTop)"
          />

          {/* GAD Transparency Folder / Citizen Records */}
          <g transform="rotate(-12 135 320)">
            <rect x="95" y="290" width="60" height="74" rx="4" fill="url(#folderGradient)" stroke="#D96E43" strokeWidth="1.5" />
            {/* Header tab */}
            <rect x="95" y="290" width="28" height="8" rx="2" fill="#D96E43" />
            {/* Document lines representing sex-disaggregated data */}
            <line x1="105" y1="310" x2="145" y2="310" stroke="#B24C27" strokeWidth="2" strokeLinecap="round" />
            <line x1="105" y1="320" x2="140" y2="320" stroke="#C85A32" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="105" y1="330" x2="132" y2="330" stroke="#C85A32" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="105" y1="340" x2="142" y2="340" stroke="#C85A32" strokeWidth="1.5" strokeLinecap="round" />
            {/* Mini GAD seal/stamp badge */}
            <circle cx="140" cy="350" r="5" fill="#E07A28" fillOpacity="0.25" stroke="#E07A28" strokeWidth="1" />
          </g>

          {/* Hand clasping the folder */}
          <ellipse cx="148" cy="342" rx="7" ry="10" fill="#DFA381" transform="rotate(-20 148 342)" />
        </g>

        {/* Grounding baseline curve */}
        <path d="M120 378 L340 378" stroke="#2C1810" strokeOpacity="0.1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
