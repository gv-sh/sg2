// Shared UI Components
export { Alert, AlertTitle, AlertDescription } from './alert'
export { Badge, badgeVariants } from './badge'
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
export { Button, buttonVariants } from './button'
export { Input } from './input'
export { Checkbox } from './checkbox'

// Admin UI Components
export { default as Navbar } from './Navbar.js'
export { Button as FormButton, Input as FormInput, Select, Textarea } from './form-controls.js'
export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './table.js'
export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog.js'
export { PaginationControls } from './pagination.js'
export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from './navigation-menu.js'

// User UI Components
export { default as GalaxyParticles } from './GalaxyParticles.jsx'
export { default as LazyImage } from './LazyImage.jsx'
export { default as Shaders } from './Shaders.jsx'
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion.jsx'
export { Select as UserSelect } from './select.jsx'
export { Skeleton } from './skeleton.jsx'
export { Slider } from './slider.jsx'
export { Switch } from './switch.jsx'
export { Tooltip } from './tooltip.jsx'

// Re-export types for convenience
export type { ButtonProps } from './button'
export type { InputProps } from './input'
export type { CheckboxProps } from './checkbox'
export type { AlertProps, AlertVariant } from './alert'
export type { BadgeProps } from './badge'