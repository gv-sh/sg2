import * as React from "react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onChange, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={onChange}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground",
        className
      )}
      {...props}
    />
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }