import { forwardRef, InputHTMLAttributes } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  onValueChange?: (value: number[]) => void;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className = '', min = 0, max = 100, step = 1, value, onValueChange, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={`
        w-full h-2 bg-[var(--surface-soft)] rounded-lg appearance-none cursor-pointer
        accent-[var(--accent)]
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
        [&::-moz-range-thumb]:bg-[var(--accent)] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer
        [&::-moz-range-thumb]:border-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      {...props}
    />
  )
);

Slider.displayName = 'Slider';

export { Slider };
