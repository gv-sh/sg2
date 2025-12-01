import * as React from "react"
import { cn } from "../../lib/utils"

const Alert = React.forwardRef(({ className, variant = "default", children, onDismiss, ...props }, ref) => {
  const variantStyles = {
    default: "bg-muted border-border text-foreground",
    destructive: "bg-destructive/15 text-destructive border-destructive/50",
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-800/50 dark:text-blue-400",
    success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-800/50 dark:text-green-400",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/20 dark:border-yellow-800/50 dark:text-yellow-400"
  }
  
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
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
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h5>
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }