import React from 'react';
import talibonMark from '../../resources/talibon-municipal-hall.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const titleSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={talibonMark} alt="Municipality of Talibon" className={`${iconSizes[size]} object-contain shrink-0`} width={48} height={48} />
      <div className="flex flex-col">
        <span className={`${titleSizes[size]} text-foreground dark:text-foreground tracking-tight leading-none`}>
          TAGAD
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-muted-foreground dark:text-muted-foreground leading-tight mt-0.5 whitespace-nowrap">
            Municipality of Talibon
          </span>
        )}
      </div>
    </div>
  );
};
