import * as React from "react"

import { cn } from "../../lib/utils"

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div className={cn("grid gap-2", className)} ref={ref} {...props} />
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          ref={ref}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {children && <label className="text-sm font-medium leading-none">{children}</label>}
      </div>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }