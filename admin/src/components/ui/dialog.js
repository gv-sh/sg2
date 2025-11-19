import * as React from "react"
import { cn } from "../../lib/utils"

const Dialog = ({ children, isOpen, onDismiss }) => {
  const handleEscapeKey = React.useCallback((event) => {
    if (event.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);
  
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen, handleEscapeKey]);

  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fadeIn"
      onClick={onDismiss}
    >
      <div 
        className="fixed z-50 w-full max-w-md p-4 md:w-full" 
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-2xl",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  >
    {children}
  </p>
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}