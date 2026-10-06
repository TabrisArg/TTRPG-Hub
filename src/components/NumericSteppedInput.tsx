import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumericSteppedInputProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  highlightColor?: 'default' | 'emerald' | 'amber' | 'crimson';
  disabled?: boolean;
}

export const NumericSteppedInput: React.FC<NumericSteppedInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix = '',
  size = 'md',
  ariaLabel = 'Numeric value',
  highlightColor = 'default',
  disabled = false,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const handleAdjust = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    // Allow Shift+Click to adjust by 5x step for rapid adjustments
    const multiplier = e.shiftKey ? 5 : 1;
    const next = clamp(value + delta * multiplier);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(draft, 10);
    if (isNaN(parsed)) {
      setDraft(String(value));
    } else {
      const clamped = clamp(parsed);
      setDraft(String(clamped));
      if (clamped !== value) {
        onChange(clamped);
      }
    }
  };

  const colorClasses = {
    default: 'border-[#232B28] text-[#E2E6E4] focus-within:border-[#16A34A]',
    emerald: 'border-[#16A34A]/50 text-[#4ADE80] focus-within:border-[#16A34A]',
    amber: 'border-[#D97706]/60 text-[#FBBF24] focus-within:border-[#D97706]',
    crimson: 'border-[#DC2626]/70 text-[#F87171] focus-within:border-[#DC2626]',
  }[highlightColor];

  const sizeStyles = {
    sm: {
      wrapper: 'h-8',
      btn: 'w-7 h-full',
      input: 'w-10 text-xs',
      icon: 12,
    },
    md: {
      wrapper: 'h-9',
      btn: 'w-8 h-full',
      input: 'w-12 text-sm',
      icon: 13,
    },
    lg: {
      wrapper: 'h-10',
      btn: 'w-9 h-full',
      input: 'w-14 text-base font-semibold',
      icon: 14,
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center bg-[#0B0E0D] border rounded transition-colors ${colorClasses} ${sizeStyles.wrapper} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
      title="Click -/+ to adjust by 1 (Shift+Click for ±5), or type a specific value"
    >
      <button
        type="button"
        onClick={(e) => handleAdjust(-step, e)}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel}`}
        className={`${sizeStyles.btn} select-none flex items-center justify-center text-[#8C9692] hover:text-[#E2E6E4] hover:bg-[#19201E] active:bg-[#232B28] disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-[#232B28] cursor-pointer`}
      >
        <Minus size={sizeStyles.icon} strokeWidth={2.2} />
      </button>

      <div className="relative flex items-center justify-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={ariaLabel}
          value={draft}
          disabled={disabled}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={handleBlur}
          onChange={handleInputChange}
          className={`${sizeStyles.input} select-text font-mono-tabular text-center bg-transparent focus:outline-none px-1 ${
            suffix ? 'pr-3.5' : ''
          }`}
        />
        {suffix && (
          <span className="pointer-events-none select-none absolute right-1 text-[10px] font-mono-tabular text-[#68736E]">
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => handleAdjust(step, e)}
        disabled={disabled || value >= max}
        aria-label={`Increase ${ariaLabel}`}
        className={`${sizeStyles.btn} select-none flex items-center justify-center text-[#8C9692] hover:text-[#E2E6E4] hover:bg-[#19201E] active:bg-[#232B28] disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-[#232B28] cursor-pointer`}
      >
        <Plus size={sizeStyles.icon} strokeWidth={2.2} />
      </button>
    </div>
  );
};
