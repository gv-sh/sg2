import * as React from "react"
import { cn } from "../../lib/utils"

// HelperText Component
const HelperText = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
HelperText.displayName = "HelperText"

// FormField Component - Wrapper for label, input, and helper text
const FormField = React.forwardRef(({
  label,
  helper,
  error,
  required,
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props}>
    {label && (
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
    )}
    {children}
    {helper && !error && <HelperText>{helper}</HelperText>}
    {error && <HelperText className="text-destructive">{error}</HelperText>}
  </div>
))
FormField.displayName = "FormField"

export { FormField, HelperText }
