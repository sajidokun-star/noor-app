import React from 'react';
import type { Language } from '../types/islamic';
import { formatNum } from '../utils/i18n';

export type TimerColonSize = 'sm' | 'md' | 'lg';

interface TimerColonProps {
  size?: TimerColonSize;
  className?: string;
}

/**
 * Pure CSS circular double-dot colon separator so mobile/Bengali fonts never render square/box colons.
 */
export const TimerColon: React.FC<TimerColonProps> = ({ size = 'sm', className = '' }) => {
  const dotClass =
    size === 'lg'
      ? 'w-1.5 h-1.5'
      : size === 'md'
      ? 'w-1 h-1'
      : 'w-[3px] h-[3px]';

  const gapAndMargin =
    size === 'lg'
      ? 'gap-1.5 mx-1.5'
      : size === 'md'
      ? 'gap-1 mx-1'
      : 'gap-[3px] mx-[3px]';

  return (
    <span
      className={`inline-flex flex-col items-center justify-center self-center -translate-y-[0.05em] ${gapAndMargin} ${className}`.trim()}
    >
      <span className="sr-only">:</span>
      <span
        className={`${dotClass} rounded-full bg-current block shrink-0`}
        aria-hidden="true"
      />
      <span
        className={`${dotClass} rounded-full bg-current block shrink-0`}
        aria-hidden="true"
      />
    </span>
  );
};

interface SpacedTimeProps {
  /** Raw or preformatted time/countdown string (e.g. "00:39:11" or "5:11 PM") */
  value: string;
  /** Optional language to localize digits via formatNum */
  lang?: Language;
  /** Dot scale: 'lg' for hero countdowns, 'md' for prominent clocks, 'sm' for inline/table times */
  colonSize?: TimerColonSize;
  className?: string;
}

/**
 * Renders timers, clocks, and time readouts with tabular numerals, tracking-wider (0.06em),
 * generous line-height, and circular CSS double-dot colons (<TimerColon />).
 */
export const SpacedTime: React.FC<SpacedTimeProps> = ({
  value,
  lang,
  colonSize = 'sm',
  className = '',
}) => {
  const formatted = lang ? formatNum(lang, value) : value;
  const parts = formatted.split(':');

  return (
    <span className={`font-timer tracking-wider inline-flex items-center ${className}`.trim()}>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <TimerColon size={colonSize} />}
          <span>{part}</span>
        </React.Fragment>
      ))}
    </span>
  );
};
