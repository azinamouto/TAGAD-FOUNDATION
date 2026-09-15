import React from 'react';

interface CommunityUnityIllustrationProps {
  className?: string;
  role?: string;
  'aria-label'?: string;
}

/**
 * CommunityUnityIllustration
 * 
 * Clean, modern SVG vector illustration depicting a diverse group of people embracing
 * and standing closely together, symbolizing community, gender equality, and social unity.
 * 
 * Palette: Warm earthy tones (chestnut, terracotta, burnt orange, warm ochre, camel, deep slate).
 * Style: Clean, rounded vector silhouettes, editorial flat design, fully scalable vector graphic.
 */
export const CommunityUnityIllustration: React.FC<CommunityUnityIllustrationProps> = ({
  className = 'w-full h-auto',
  role = 'img',
  'aria-label': ariaLabel = 'Illustration of a diverse community embracing together in unity and solidarity',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 380"
      fill="none"
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      <defs>
        {/* Soft warm ambient glow behind community */}
        <radialGradient id="communityWarmAura" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#E07A28" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#C85A32" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#935F3C" stopOpacity="0" />
        </radialGradient>

        {/* Warm gradients for garments & shading */}
        <linearGradient id="commP1Top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D96E43" />
          <stop offset="100%" stopColor="#B24C27" />
        </linearGradient>

        <linearGradient id="commP2Top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3D6878" />
          <stop offset="50%" stopColor="#2C4E5B" />
          <stop offset="100%" stopColor="#1E3842" />
        </linearGradient>

        <linearGradient id="commP3Top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2A554" />
          <stop offset="100%" stopColor="#D97E2B" />
        </linearGradient>

        <linearGradient id="commP4Top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C44D34" />
          <stop offset="100%" stopColor="#96331E" />
        </linearGradient>

        <linearGradient id="commP5Top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E88C5D" />
          <stop offset="100%" stopColor="#BC5C30" />
        </linearGradient>
      </defs>

      {/* Background Warm Glow */}
      <ellipse cx="300" cy="230" rx="270" ry="140" fill="url(#communityWarmAura)" />

      {/* ==================== FIGURE 1 (Far Left - Woman with long hair & terracotta top) ==================== */}
      <g id="comm-fig-1">
        {/* Legs / Pants */}
        <path d="M72 295 C75 320 78 355 80 375 L116 375 C114 350 112 325 110 295 Z" fill="#362820" />
        <path d="M112 295 C114 322 116 350 118 375 L150 375 C146 345 142 320 138 295 Z" fill="#2B1F19" />

        {/* Left Arm (draped down / resting) */}
        <path d="M58 200 C50 225 52 260 56 295 C62 297 74 295 78 290 C76 258 74 225 80 205 Z" fill="#DFA381" />
        <path d="M54 185 C50 208 52 230 56 248 C68 250 82 245 84 235 C80 215 78 195 82 182 Z" fill="url(#commP1Top)" />

        {/* Torso */}
        <path d="M78 180 C88 175 125 174 142 185 C146 220 144 265 138 298 C116 304 94 302 74 296 C72 260 72 215 78 180 Z" fill="url(#commP1Top)" />

        {/* Neck */}
        <path d="M102 150 L120 150 L122 180 L98 180 Z" fill="#C88E6D" />

        {/* Head Base */}
        <ellipse cx="110" cy="136" rx="20" ry="24" fill="#DFA381" />

        {/* Hair (Lush warm espresso curls flowing down back) */}
        <path d="M110 108 C88 108 80 128 80 150 C80 182 86 215 92 236 C96 238 104 235 106 228 C100 200 98 170 102 148 C108 148 116 150 120 155 C124 172 122 205 126 230 C128 235 136 236 138 230 C144 205 146 168 142 146 C140 125 132 108 110 108 Z" fill="#3D2216" />
        <path d="M106 112 C95 116 90 128 92 145 C98 132 110 124 122 125 C132 126 136 134 138 145 C139 132 134 118 124 112 C118 109 112 110 106 112 Z" fill="#543120" />

        {/* Right Arm embracing Figure 2 */}
        <path d="M136 195 C148 202 165 210 185 218 C192 222 195 230 190 236 C182 242 174 238 165 232 C148 222 136 212 130 205 Z" fill="#DFA381" />
        <path d="M134 186 C148 192 162 198 174 205 C170 216 162 220 150 216 C140 210 132 202 128 196 Z" fill="url(#commP1Top)" />
      </g>

      {/* ==================== FIGURE 2 (Tall Male - Navy/Teal shirt, embracing Left & Center) ==================== */}
      <g id="comm-fig-2">
        {/* Legs / Pants */}
        <path d="M166 300 C168 325 170 355 170 375 L202 375 C200 352 198 326 196 300 Z" fill="#8C5336" />
        <path d="M200 300 C202 325 204 350 206 375 L238 375 C236 350 232 325 228 300 Z" fill="#78442A" />

        {/* Torso */}
        <path d="M152 165 C172 156 218 155 240 165 C246 208 244 260 236 302 C208 308 178 306 156 300 C150 258 148 206 152 165 Z" fill="url(#commP2Top)" />

        {/* Neck */}
        <path d="M186 130 L206 130 L208 162 L184 162 Z" fill="#B87D58" />

        {/* Head */}
        <ellipse cx="196" cy="118" rx="20" ry="23" fill="#CFA07E" />

        {/* Hair (Short cropped modern textured cut) */}
        <path d="M196 95 C178 95 174 108 174 122 C178 124 182 120 184 114 C188 108 198 104 208 108 C216 112 216 118 220 120 C222 114 220 95 196 95 Z" fill="#24140D" />

        {/* Left Arm over Figure 1's back */}
        <path d="M154 172 C135 180 115 192 98 206 C92 212 94 222 102 225 C110 226 118 220 126 212 C140 200 152 190 162 184 Z" fill="#CFA07E" />
        <path d="M160 166 C144 174 130 182 120 192 C124 202 134 205 146 198 C156 190 166 182 172 176 Z" fill="url(#commP2Top)" />

        {/* Right Arm draped over Figure 3's shoulder */}
        <path d="M236 172 C255 180 280 190 305 198 C314 200 318 208 314 216 C308 222 300 220 290 216 C268 208 248 198 232 188 Z" fill="#CFA07E" />
        <path d="M232 166 C250 172 268 180 280 188 C276 198 268 202 254 196 C242 190 232 182 226 176 Z" fill="url(#commP2Top)" />
      </g>

      {/* ==================== FIGURE 3 (Center - Petite/Youth in Golden Amber Top) ==================== */}
      <g id="comm-fig-3">
        {/* Legs / Pants */}
        <path d="M260 305 C262 328 264 354 264 375 L292 375 C292 354 290 328 288 305 Z" fill="#3D4B54" />
        <path d="M292 305 C294 328 296 354 296 375 L324 375 C322 354 318 328 316 305 Z" fill="#2F3B43" />

        {/* Torso */}
        <path d="M250 195 C265 186 312 186 328 195 C332 230 330 270 324 306 C304 312 274 312 254 306 C248 270 246 230 250 195 Z" fill="url(#commP3Top)" />

        {/* Neck */}
        <path d="M280 168 L298 168 L300 196 L278 196 Z" fill="#D49970" />

        {/* Head */}
        <ellipse cx="289" cy="155" rx="18" ry="21" fill="#E8B590" />

        {/* Hair (Shoulder-length rich mahogany straight hair) */}
        <path d="M289 130 C270 130 264 148 264 170 C264 196 268 218 272 235 C276 237 282 234 284 228 C280 206 280 184 282 165 C286 166 292 166 296 165 C298 184 298 206 294 228 C296 234 302 237 306 235 C310 218 314 196 314 170 C314 148 308 130 289 130 Z" fill="#351B12" />
        <path d="M285 133 C275 137 270 148 272 162 C278 152 288 146 298 147 C306 148 310 154 312 162 C312 150 306 138 296 134 C292 132 288 132 285 133 Z" fill="#4D281C" />

        {/* Arms Embracing Neighbors (Inner hug) */}
        <path d="M252 205 C238 214 224 224 212 235 C208 240 212 248 218 248 C226 246 236 238 246 230 C254 222 260 216 264 210 Z" fill="#E8B590" />
        <path d="M326 205 C340 214 354 224 366 235 C370 240 366 248 360 248 C352 246 342 238 332 230 C324 222 318 216 314 210 Z" fill="#E8B590" />
      </g>

      {/* ==================== FIGURE 4 (Tall Broad Male - Deep Terracotta / Rust Red) ==================== */}
      <g id="comm-fig-4">
        {/* Legs / Pants */}
        <path d="M358 300 C360 325 362 352 362 375 L394 375 C394 352 392 325 390 300 Z" fill="#263238" />
        <path d="M394 300 C396 325 398 352 400 375 L432 375 C428 352 424 325 420 300 Z" fill="#1C252A" />

        {/* Torso */}
        <path d="M346 168 C370 158 418 158 440 168 C446 210 444 260 436 302 C406 308 376 308 352 302 C344 260 342 210 346 168 Z" fill="url(#commP4Top)" />

        {/* Neck */}
        <path d="M382 134 L404 134 L406 166 L380 166 Z" fill="#BA7F5A" />

        {/* Head */}
        <ellipse cx="393" cy="122" rx="21" ry="24" fill="#D39770" />

        {/* Hair (Textured wavy dark brown hair) */}
        <path d="M393 98 C373 98 368 112 368 128 C374 130 380 125 382 118 C388 110 398 108 408 112 C416 116 418 124 422 126 C425 118 420 98 393 98 Z" fill="#241711" />

        {/* Left Arm around Figure 3's shoulder */}
        <path d="M350 178 C330 186 305 196 280 205 C272 208 270 216 274 222 C280 228 290 225 300 220 C320 212 340 202 356 194 Z" fill="#D39770" />
        <path d="M354 170 C336 178 318 186 308 194 C312 204 320 208 334 202 C346 196 356 188 362 180 Z" fill="url(#commP4Top)" />

        {/* Right Arm around Figure 5 */}
        <path d="M434 176 C455 185 476 196 496 208 C504 212 506 220 500 226 C492 232 484 228 474 222 C454 212 436 202 422 192 Z" fill="#D39770" />
        <path d="M430 168 C446 176 462 184 472 192 C468 204 458 206 446 200 C436 194 428 186 422 178 Z" fill="url(#commP4Top)" />
      </g>

      {/* ==================== FIGURE 5 (Far Right - Woman with wavy auburn hair & warm clay top) ==================== */}
      <g id="comm-fig-5">
        {/* Legs / Pants */}
        <path d="M458 296 C456 322 454 350 452 375 L484 375 C486 350 488 322 490 296 Z" fill="#4A3B32" />
        <path d="M492 296 C490 322 488 350 486 375 L518 375 C520 350 522 322 524 296 Z" fill="#3B2E26" />

        {/* Right Arm (resting/draped down) */}
        <path d="M526 205 C532 230 530 265 526 295 C520 297 508 295 504 290 C506 258 508 225 504 205 Z" fill="#E2A988" />
        <path d="M530 188 C534 210 532 232 528 250 C516 252 502 246 500 236 C504 216 506 196 502 184 Z" fill="url(#commP5Top)" />

        {/* Torso */}
        <path d="M448 182 C466 174 504 175 514 185 C520 220 520 265 516 298 C496 304 474 302 454 296 C448 260 446 218 448 182 Z" fill="url(#commP5Top)" />

        {/* Neck */}
        <path d="M472 152 L490 152 L492 182 L468 182 Z" fill="#C8906E" />

        {/* Head */}
        <ellipse cx="481" cy="138" rx="20" ry="24" fill="#E2A988" />

        {/* Hair (Lush flowing warm auburn / deep copper waves) */}
        <path d="M481 110 C503 110 511 130 511 152 C511 184 505 218 499 238 C495 240 487 236 485 230 C491 202 493 172 489 150 C483 150 475 152 471 156 C467 174 469 206 465 232 C463 236 455 238 453 232 C447 206 445 170 449 148 C451 126 459 110 481 110 Z" fill="#422217" />
        <path d="M485 114 C496 118 501 130 499 147 C493 134 481 126 469 127 C459 128 455 136 453 147 C452 134 457 120 467 114 C473 111 479 112 485 114 Z" fill="#5E3322" />

        {/* Left Arm embracing Figure 4 */}
        <path d="M454 198 C442 205 425 214 405 222 C398 226 395 234 400 240 C408 246 416 242 425 236 C442 226 454 216 460 208 Z" fill="#E2A988" />
        <path d="M456 188 C442 194 428 200 416 208 C420 218 428 222 440 218 C450 212 458 204 462 198 Z" fill="url(#commP5Top)" />
      </g>

      {/* Grounding subtle baseline */}
      <path d="M50 375 L550 375" stroke="#2C1810" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
