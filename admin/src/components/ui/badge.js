import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const variantClassNames = {
    default: "bg-transparent text-primary border-primary/30 hover:bg-primary/5",
    secondary: "bg-transparent text-secondary border-secondary/30 hover:bg-secondary/5",
    destructive: "bg-transparent text-destructive border-destructive/30 hover:bg-destructive/5",
    outline: "bg-transparent text-foreground border-input hover:bg-muted/20",
    success: "bg-transparent text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-950/20",
    warning: "bg-transparent text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800/50 dark:hover:bg-amber-950/20",
    subtle: "bg-transparent text-muted-foreground border-muted/40 hover:bg-muted/10"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors shadow-sm shadow-transparent",
        variantClassNames[variant] || variantClassNames.default,
        className
      )}
      {...props}
    />
  )
}

export { Badge }