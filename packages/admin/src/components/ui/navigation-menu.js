import * as React from "react"
import { cn } from "../../lib/utils"

const NavigationMenu = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <nav
      ref={ref}
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 list-none items-center space-x-1">
        {children}
      </div>
    </nav>
  )
})
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = "NavigationMenuList"

const NavigationMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative", className)} {...props} />
))
NavigationMenuItem.displayName = "NavigationMenuItem"

const NavigationMenuLink = React.forwardRef(
  ({ className, active, children, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
)
NavigationMenuLink.displayName = "NavigationMenuLink"

export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink }