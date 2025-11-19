// src/components/ui/tooltip.jsx
import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  className = '',
  delay = 300 // Optional delay before showing tooltip
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimer, setShowTimer] = useState(null);
  const [hideTimer, setHideTimer] = useState(null);
  
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 translate-y-2 mt-2',
    left: 'right-full top-1/2 transform -translate-x-2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform translate-x-2 -translate-y-1/2 ml-2',
  };
  
  const handleMouseEnter = () => {
    // Clear any existing hide timer
    if (hideTimer) {
      clearTimeout(hideTimer);
      setHideTimer(null);
    }
    
    // Set a delay before showing the tooltip
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    setShowTimer(timer);
  };
  
  const handleMouseLeave = () => {
    // Clear any existing show timer
    if (showTimer) {
      clearTimeout(showTimer);
      setShowTimer(null);
    }
    
    // Set a delay before hiding the tooltip
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 100);
    
    setHideTimer(timer);
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="inline-block">
        {children}
      </div>
      
      {isVisible && content && (
        <div 
          className={cn(
            `absolute z-50 px-3 py-2 text-xs rounded-md shadow-lg 
            bg-foreground text-background 
            max-w-xs w-max whitespace-normal 
            pointer-events-none transition-all duration-200 
            opacity-90`,
            positions[position],
            className
          )}
          role="tooltip"
        >
          {content}
          <div 
            className={`
              absolute w-2 h-2 bg-foreground transform rotate-45
              ${position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1' : ''}
              ${position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1' : ''}
              ${position === 'left' ? 'right-0 top-1/2 translate-x-1 -translate-y-1/2' : ''}
              ${position === 'right' ? 'left-0 top-1/2 -translate-x-1 -translate-y-1/2' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
};