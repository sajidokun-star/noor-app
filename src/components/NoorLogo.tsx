import React from 'react';
import type { AvatarId } from '../types/islamic';

interface NoorLogoProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

/**
 * Bespoke Islamic Geometric Arch, Crescent Moon, 8-Pointed Star & Glowing Lantern SVG.
 */
export const NoorLogo: React.FC<NoorLogoProps> = ({
  size = 28,
  glow = false,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="noorGoldGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="noorEmeraldGrad" x1="16" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      {glow && (
        <radialGradient id="noorAmbientGlow" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      )}
    </defs>

    {glow && <circle cx="32" cy="32" r="30" fill="url(#noorAmbientGlow)" />}

    {/* Rub el Hizb 8-pointed Islamic Geometric Frame */}
    <rect
      x="13"
      y="13"
      width="38"
      height="38"
      rx="5"
      stroke="url(#noorEmeraldGrad)"
      strokeOpacity="0.7"
      strokeWidth="1.75"
    />
    <rect
      x="13"
      y="13"
      width="38"
      height="38"
      rx="5"
      transform="rotate(45 32 32)"
      stroke="url(#noorGoldGrad)"
      strokeOpacity="0.55"
      strokeWidth="1.5"
    />

    {/* Pointed Mihrab Arch */}
    <path
      d="M21 47V31C21 23.5 26 17.5 32 14.5C38 17.5 43 23.5 43 31V47"
      stroke="url(#noorEmeraldGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Crescent Moon embracing the Lantern Flame */}
    <path
      d="M36.5 23.5C33.2 22.8 29.7 24.1 27.9 27.1C26.1 30.1 26.6 34 29.1 36.4C31.5 38.7 35.2 39.2 38.1 37.6C35.2 38 32.5 36.4 31.3 33.7C30 31 30.7 27.8 33 25.8C34.1 24.8 35.3 24.1 36.5 23.5Z"
      fill="url(#noorGoldGrad)"
    />

    {/* Glowing Lantern Core & Star */}
    <path
      d="M35 26.5L36.1 28.8L38.6 29.1L36.8 30.8L37.2 33.3L35 32.1L32.8 33.3L33.2 30.8L31.4 29.1L33.9 28.8L35 26.5Z"
      fill="#FDE68A"
    />

    {/* Base Threshold Line */}
    <path
      d="M19 47H45"
      stroke="url(#noorGoldGrad)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const UserAvatarBadge: React.FC<{
  avatarId: AvatarId;
  size?: 'sm' | 'md' | 'lg';
}> = ({ avatarId, size = 'md' }) => {
  const dims =
    size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-base';

  const renderGlyph = () => {
    switch (avatarId) {
      case 'lantern':
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2v3M8 7h8l1.5 4.5-1.5 6.5H8L6.5 11.5 8 7Z" className="stroke-amber-400" />
            <circle cx="12" cy="12.5" r="2" className="fill-emerald-400 stroke-emerald-400" />
            <path d="M7 21h10" className="stroke-amber-400" />
          </svg>
        );
      case 'kaaba':
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="5" width="16" height="15" rx="1.5" className="stroke-zinc-700 dark:stroke-zinc-200 fill-zinc-900 dark:fill-black" />
            <path d="M4 9.5h16" className="stroke-amber-400" strokeWidth="2.2" />
            <rect x="13" y="12.5" width="3" height="4.5" className="stroke-amber-300" />
          </svg>
        );
      case 'quran':
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6.5C4 5.4 4.9 4.5 6 4.5h5v15H6c-1.1 0-2 .9-2 2V6.5Zm16 0c0-1.1-.9-2-2-2h-5v15h5c1.1 0 2 .9 2 2V6.5Z" className="stroke-emerald-500 dark:stroke-emerald-400" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="6" y="6" width="12" height="12" className="stroke-emerald-500 dark:stroke-emerald-400" />
            <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" className="stroke-amber-500 dark:stroke-amber-400" />
          </svg>
        );
      case 'dome':
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v2M6 14c0-4 2.7-7 6-9 3.3 2 6 5 6 9H6Z" className="stroke-emerald-500 dark:stroke-emerald-400" />
            <path d="M4 14h16v6H4v-6Z" className="stroke-amber-500 dark:stroke-amber-400" />
          </svg>
        );
      case 'crescent':
      default:
        return (
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none">
            <path
              d="M15.8 5.2A7 7 0 1 0 19 15.8 5.5 5.5 0 0 1 15.8 5.2Z"
              className="fill-amber-500 dark:fill-amber-400"
            />
            <circle cx="16.5" cy="8.5" r="1.3" className="fill-emerald-500 dark:fill-emerald-400" />
          </svg>
        );
    }
  };

  return (
    <span
      className={`${dims} rounded-full bg-white dark:bg-black border border-emerald-500/40 inline-flex items-center justify-center shrink-0 shadow-xs dark:shadow-none`}
      aria-hidden="true"
    >
      {renderGlyph()}
    </span>
  );
};
