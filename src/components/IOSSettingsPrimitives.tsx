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
    className={`group relative inline-flex items-center shrink-0 w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'bg-[#34C759]' : 'bg-[#E9E9EA] dark:bg-[#39393D]'}`}
  >
    {/* Spring thumb: overshoots slightly and stretches while pressed, like the native iOS switch */}
    <span
      className={`noor-switch-thumb pointer-events-none inline-block h-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25),0_1px_1px_rgba(0,0,0,0.16)] transform transition-[transform,width] duration-[380ms] ease-[cubic-bezier(0.34,1.45,0.64,1)] w-[27px] group-active:w-[33px] ${
        checked ? 'translate-x-[20px] group-active:translate-x-[14px]' : 'translate-x-0'
      }`}
    />
  </button>
);

interface IOSSegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface IOSSegmentedProps<T extends string> {
  value: T;
  options: IOSSegmentedOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  testId?: string;
}

/**
 * iOS-style segmented control with a sliding spring thumb.
 */
export function IOSSegmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  testId,
}: IOSSegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className="noor-seg relative grid p-[2px] rounded-[10px] bg-black/[0.06] dark:bg-white/10"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="noor-seg-thumb absolute top-[2px] bottom-[2px] left-[2px] rounded-[8px] bg-white dark:bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.08)] transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.35,0.64,1)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={testId ? `${testId}-${option.value}` : undefined}
            onClick={() => onChange(option.value)}
            className={`${
              selected ? 'noor-seg-active text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
            } relative z-10 min-h-[32px] px-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-emerald-500`}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
