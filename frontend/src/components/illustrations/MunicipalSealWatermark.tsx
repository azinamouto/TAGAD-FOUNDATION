import React from 'react';
import talibonMark from '../../resources/talibon-municipal-hall.png';

/** Decorative municipal mark sourced from the official Talibon website. */
export const MunicipalSealWatermark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute pointer-events-none select-none z-0 ${className}`} aria-hidden="true">
    <img src={talibonMark} alt="" className="w-[480px] sm:w-[640px] lg:w-[820px] max-w-none opacity-10" />
  </div>
);
