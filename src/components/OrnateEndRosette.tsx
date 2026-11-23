import React from 'react';
import { toArabicIndicDigits } from '../utils/tajweed';

interface OrnateEndRosetteProps {
  number: number;
  label?: string;
}

/**
 * Shared ornate Islamic circular rosette marker (۝) used identically
 * at the end of Quran Ayahs and Hadith Arabic texts.
 */
export const OrnateEndRosette: React.FC<OrnateEndRosetteProps> = ({ number, label }) => {
  const arabicDigits = toArabicIndicDigits(number);
  return (
    <span
      className="inline-flex items-center justify-center align-middle mx-2 relative w-9 h-9 select-none"
      aria-label={label ?? `Item ${number}`}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-9 h-9 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="rgba(245, 158, 11, 0.1)"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle
          cx="20"
          cy="20"
          r="13"
          fill="none"
          className="stroke-emerald-600 dark:stroke-emerald-500"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-amber-800 dark:text-amber-200 leading-none pt-0.5">
        {arabicDigits}
      </span>
    </span>
  );
};
