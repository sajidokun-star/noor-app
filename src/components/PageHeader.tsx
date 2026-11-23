import React from 'react';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import type { Language } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { t } from '../utils/i18n';

interface PageHeaderProps {
  lang: Language;
  title: string;
  subtitle?: string;
  onNavigate: (route: AppRoute) => void;
  showAllToolsLink?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  lang,
  title,
  subtitle,
  onNavigate,
  showAllToolsLink = true,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors min-h-[36px]"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {t(lang, 'Home', 'হোম')}
        </button>
        {showAllToolsLink && (
          <>
            <span className="text-zinc-400 dark:text-zinc-600 text-xs" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => onNavigate('tools')}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors min-h-[36px]"
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, 'All Tools', 'সকল টুলস')}
            </button>
          </>
        )}
      </div>
      <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
    </div>
  </div>
);
