import * as React from "react"
import { useState } from "react";
import { cn } from "../../lib/utils"

const Accordion = React.forwardRef(({ className, children, type = "multiple", defaultValue, collapsible = true, ...props }, ref) => {
  const [openItems, setOpenItems] = useState(defaultValue ? 
    (Array.isArray(defaultValue) ? defaultValue : [defaultValue]) 
    : []);

  const onToggle = (itemValue) => {
    if (type === "single") {
      setOpenItems(openItems.includes(itemValue) ? [] : [itemValue]);
    } else {
      setOpenItems(
        openItems.includes(itemValue)
          ? openItems.filter(v => v !== itemValue)
          : [...openItems, itemValue]
      );
    }
  };

  // Clone children with additional props
  const accordionContext = {
    openItems,
    onToggle,
    type
  };

  return (
    <div
      ref={ref}
      className={cn("divide-y divide-border rounded-md", className)}
      {...props}
    >
      <AccordionContext.Provider value={accordionContext}>
        {children}
      </AccordionContext.Provider>
    </div>
  );
});

Accordion.displayName = "Accordion";

// Create context for accordion state
const AccordionContext = React.createContext({
  openItems: [],
  onToggle: () => {},
  type: "multiple"
});

const useAccordionContext = () => React.useContext(AccordionContext);

const AccordionItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);
  
  return (
    <div
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "border-b border-border",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, 'data-value': value });
        }
        return child;
      })}
    </div>
  );
});

AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef(({ className, children, isOpen, 'data-value': value, ...props }, ref) => {
  const { onToggle } = useAccordionContext();
  
  return (
    <button
      ref={ref}
      onClick={() => onToggle(value)}
      className={cn(
        "flex w-full items-center justify-between py-3 px-4 font-medium transition-all hover:underline",
        className
      )}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
});

AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef(({ className, children, isOpen, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{ margin: 0, padding: 0 }}
      className={cn(
        "grid grid-rows-[0fr] transition-all duration-200",
        isOpen && "grid-rows-[1fr]",
        className
      )}
      {...props}
    >
      <div className="overflow-hidden">
        {isOpen && <div className="pb-2 pt-0 px-4">{children}</div>}
      </div>
    </div>
  );
});

AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };