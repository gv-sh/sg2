import * as React from "react"
import { cn } from "../../lib/utils"

export type AlertVariant = "default" | "destructive" | "info" | "success" | "warning"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  onDismiss?: () => void
  isToast?: boolean
  toastId?: string
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, onDismiss, isToast = false, toastId, ...props }, ref) => {
    const variantStyles: Record<AlertVariant, string> = {
      default: "bg-muted border-border text-foreground",
      destructive: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900 dark:border-red-700 dark:text-red-100",
      info: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-100",
      success: "bg-green-100 border-green-300 text-green-900 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
      warning: "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-900"
    }

    const toastStyles = isToast ? "w-96 max-w-[calc(100vw-2rem)] animate-in slide-in-from-right-full duration-300" : "relative w-full"
    
    return (
      <div
        ref={ref}
        role="alert"
        data-toast-id={toastId}
        className={cn(
          "rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
          toastStyles,
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
        {onDismiss && (
          <button
            type="button"
            className="absolute top-4 right-4 inline-flex h-4 w-4 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={onDismiss}
            aria-label="Close"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 text-subheading", className)}
    {...props}
  >
    {children}
  </h5>
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-body-small", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }