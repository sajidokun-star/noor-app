import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

interface IOSSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  testId?: string;
  disabled?: boolean;
}

/**
 * Authentic iOS toggle switch (51x31px pill, #34C759 ON track, #E9E9EA / #39393D OFF track, sliding 27px thumb).
 */
export const IOSSwitch: React.FC<IOSSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  testId,
  disabled = false,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    data-testid={testId}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center shrink-0 w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'bg-[#34C759]' : 'bg-[#E9E9EA] dark:bg-[#39393D]'}`}
  >
    <span
      className={`pointer-events-none inline-block w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.22)] transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        checked ? 'translate-x-[20px]' : 'translate-x-0'
      }`}
    />
  </button>
);

interface IOSSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * iOS Inset Grouped Settings section with uppercase muted header, rounded-2xl grouped card, and optional helper footer.
 */
export const IOSSection: React.FC<IOSSectionProps> = ({
  title,
  footer,
  children,
  className = '',
}) => (
  <section className={`space-y-2 ${className}`}>
    {title && (
      <h2 className="px-4 text-[12px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
    )}
    <div className="rounded-2xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] overflow-hidden divide-y divide-stone-200/70 dark:divide-white/[0.08] shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
      {children}
    </div>
    {footer && (
      <p className="px-4 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        {footer}
      </p>
    )}
  </section>
);

interface IOSRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: React.ReactNode;
  value?: string;
  chevron?: boolean;
  selected?: boolean;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  testId?: string;
  destructive?: boolean;
}

/**
 * Authentic iOS Settings row with colorful rounded-square icon container, hairline separators, and >=48px touch target.
 */
export const IOSRow: React.FC<IOSRowProps> = ({
  icon,
  iconBg = 'bg-emerald-500',
  title,
  subtitle,
  value,
  chevron = false,
  selected = false,
  rightElement,
  onClick,
  testId,
  destructive = false,
}) => {
  const inner = (
    <>
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <span
            className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-white shrink-0 shadow-xs ${iconBg}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1 py-0.5">
          <p
            className={`text-[15px] font-medium leading-snug truncate ${
              destructive
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <span className="text-[14px] text-zinc-500 dark:text-zinc-400 font-tabular">
            {value}
          </span>
        )}
        {selected && (
          <Check className="w-4 h-4 text-[#007AFF] dark:text-emerald-400" aria-hidden="true" />
        )}
        {rightElement}
        {chevron && (
          <ChevronRight
            className="w-4 h-4 text-zinc-400 dark:text-zinc-500"
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="w-full min-h-[50px] px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:bg-black/[0.06] dark:active:bg-white/[0.07] transition-colors"
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
      className="w-full min-h-[50px] px-4 py-2.5 flex items-center justify-between gap-3"
    >
      {inner}
    </div>
  );
};
