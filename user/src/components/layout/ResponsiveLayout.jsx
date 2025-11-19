// src/components/layout/ResponsiveLayout.jsx
import React from 'react';
import { useScreenSize } from '../../utils/responsiveUtils';
import { cn } from '../../lib/utils';

const ResponsiveLayout = ({ children, className = '' }) => {
  const { isMobile, isTablet } = useScreenSize();
  
  return (
    <div 
      className={cn(
        "grid h-full w-full gap-0", 
        isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-[16rem_16rem_1fr]",
        className
      )}
    >
      {children}
    </div>
  );
};

export const Column = ({ 
  children, 
  className = '',
  mobileOrder,
  position // 'left', 'middle', 'right'
}) => {
  const { isMobile } = useScreenSize();
  
  // Determine corner rounding based on position
  const roundedClasses = position === 'left' 
    ? "rounded-l-md rounded-r-none" 
    : position === 'middle'
      ? "rounded-none"
      : position === 'right'
        ? "rounded-l-none rounded-r-md"
        : "rounded-md"; // Default
  
  // Determine border classes based on position
  const borderClasses = position === 'left' 
    ? "border" 
    : position === 'middle'
      ? "border-t border-b border-r-0" // No left border for middle column
      : position === 'right'
        ? "border" // Full border for right column
        : "border"; // Default
  
  return (
    <div 
      className={cn(
        "bg-card text-card-foreground shadow-sm h-full overflow-hidden",
        roundedClasses,
        borderClasses,
        isMobile && mobileOrder !== undefined ? `order-${mobileOrder}` : "",
        className
      )}
    >
      <div className="h-full pl-4 pr-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveLayout;