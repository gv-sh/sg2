// src/components/ui/select.jsx
import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

// Context for Select state management
const SelectContext = React.createContext()

// Main Select component
const Select = ({ value, onValueChange, children, ...props }) => {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || '')
  const selectRef = React.useRef(null)

  // Update internal value when prop changes
  React.useEffect(() => {
    setSelectedValue(value || '')
  }, [value])

  // Handle value selection
  const handleValueChange = (newValue) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const contextValue = {
    open,
    setOpen,
    selectedValue,
    handleValueChange
  }

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={selectRef} className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

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

// Functional Select components
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  const handleClick = () => {
    context?.setOpen(!context.open)
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", context?.open && "rotate-180")} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, className, ...props }) => {
  const context = React.useContext(SelectContext)
  
  return (
    <div
      className={cn("text-sm", className)}
      {...props}
    >
      {context?.selectedValue || placeholder}
    </div>
  )
}
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  if (!context?.open) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-input bg-popover text-popover-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  const handleClick = () => {
    context?.handleValueChange(value)
  }

  const isSelected = context?.selectedValue === value
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent focus:bg-accent",
        isSelected && "bg-accent",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
})
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