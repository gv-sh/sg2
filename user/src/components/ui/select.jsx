// src/components/ui/select.jsx
import * as React from "react"
import { cn } from "../../lib/utils"

const Select = React.forwardRef(({ className, ...props }, ref) => (
  <select
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-9",
      className
    )}
    ref={ref}
    {...props}
  />
))
Select.displayName = "Select"

const SelectGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1", className)}
    {...props}
  />
))
SelectGroup.displayName = "SelectGroup"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectOption = React.forwardRef(({ className, ...props }, ref) => (
  <option
    ref={ref}
    className={cn("text-sm", className)}
    {...props}
  />
))
SelectOption.displayName = "SelectOption"

// Custom Select components to match Shadcn/ui style
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm", className)}
    {...props}
  />
))
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-input bg-popover text-popover-foreground shadow-md",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default border border-input select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
SelectItem.displayName = "SelectItem"

export { 
  Select, 
  SelectGroup, 
  SelectLabel, 
  SelectOption,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
}