import * as React from "react"
import { cn } from "../../lib/utils"

const Slider = React.forwardRef(({ 
  className, 
  min = 0, 
  max = 100, 
  step = 1, 
  value, 
  onValueChange, 
  ...props 
}, ref) => {
  const currentValue = Array.isArray(value) 
    ? value[0] 
    : (value !== undefined ? value : min);

  // Fallback sanitization
  const rawValue = currentValue;
  const sanitizedMin = Number.isFinite(min) ? min : 0;
  let sanitizedMax = Number.isFinite(max) ? max : sanitizedMin + 1;
  if (sanitizedMax <= sanitizedMin) sanitizedMax = sanitizedMin + 1;
  const sanitizedStep = Number.isFinite(step) && step > 0 ? step : 1;
  const sanitizedValue = Math.min(Math.max(rawValue, sanitizedMin), sanitizedMax);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center primary", className)}>
      <input
        type="range"
        ref={ref}
        min={sanitizedMin}
        max={sanitizedMax}
        step={sanitizedStep}
        value={sanitizedValue}
        onChange={handleChange}
        className="w-full"
        disabled={!onValueChange}
        {...props}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }