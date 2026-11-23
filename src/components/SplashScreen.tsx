import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { Language } from '../types/islamic';
import { t } from '../utils/i18n';
import { NoorLogo } from './NoorLogo';

interface SplashScreenProps {
  lang: Language;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onFinish }) => {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFinishRef.current();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      data-testid="noor-splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 noor-light-atmosphere dark:bg-black flex flex-col items-center justify-between px-6 py-10 pt-safe pb-safe overflow-hidden"
    >
      {/* Subtle Golden Islamic Geometric Pattern Backdrop */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06] dark:opacity-[0.07]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="noorGeometricGrid"
            width="88"
            height="88"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="22"
              y="22"
              width="44"
              height="44"
              fill="none"
              stroke="#D97706"
              strokeWidth="0.8"
            />
            <rect
              x="22"
              y="22"
              width="44"
              height="44"
              transform="rotate(45 44 44)"
              fill="none"
              stroke="#059669"
              strokeWidth="0.8"
            />
            <circle
              cx="44"
              cy="44"
              r="30"
              fill="none"
              stroke="#D97706"
              strokeWidth="0.5"
              strokeDasharray="3 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#noorGeometricGrid)" />
      </svg>

      {/* Top Bismillah Calligraphy */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 text-center space-y-1.5 max-w-md pt-4"
      >
        <p className="font-quran text-2xl sm:text-3xl text-amber-700 dark:text-amber-300/95">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t(
            lang,
            'In the name of Allah, the Entirely Merciful, the Especially Merciful',
            'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে শুরু করছি'
          )}
        </p>
      </motion.div>

      {/* Center Logo & Shimmering Brand Title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center space-y-4"
      >
        <div className="relative p-4 rounded-full bg-white/90 dark:bg-black backdrop-blur-md border border-emerald-500/30 shadow-[0_8px_36px_rgba(16,185,129,0.14)]">
          <NoorLogo size={88} glow />
        </div>

        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight animate-noor-shimmer">
            Noor
          </h1>
          <p className="text-sm sm:text-base font-medium text-zinc-700 dark:text-zinc-300">
            নূর — All-Rounder Islamic Companion
          </p>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="mt-2 px-4 py-1.5 rounded-full border border-stone-200/80 dark:border-white/10 bg-white/90 dark:bg-black backdrop-blur-md text-[11px] text-zinc-700 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/35 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors"
        >
          {t(lang, 'Enter App', 'প্রবেশ করুন')}
        </button>
      </motion.div>

      {/* Bottom Creator Credit */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15 }}
        className="relative z-10 text-center pb-2"
      >
        <p className="text-xs text-zinc-600 dark:text-zinc-400 tracking-wide">
          Developed &amp; Crafted by{' '}
          <span className="text-amber-700 dark:text-amber-300 font-semibold">Sayed Tahmid Sajid</span>
        </p>
      </motion.div>
    </motion.div>
  );
};
