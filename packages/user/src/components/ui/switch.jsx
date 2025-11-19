import * as React from "react"

import { cn } from "../../lib/utils"

const Switch = React.forwardRef(({ className, checked, onChange, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={onChange}
      className={cn(
        "peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer appearance-none items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      style={{
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="white"/></svg>')`,
        backgroundPosition: checked ? "right 2px center" : "left 2px center",
        backgroundRepeat: "no-repeat",
        transition: "background-position 0.2s ease"
      }}
      ref={ref}
      {...props}
    />
  </div>
))
Switch.displayName = "Switch"

export { Switch }