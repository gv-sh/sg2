import { useState, useEffect } from 'react';

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  xs: 0,     // Extra small devices (portrait phones)
  sm: 576,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 992,   // Large devices (desktops)
  xl: 1200,  // Extra large devices (large desktops)
  xxl: 1400  // Extra extra large devices
};

/**
 * Hook to detect current screen size and responsive breakpoint
 * @returns {Object} Current screen information including width, breakpoint, and boolean flags
 */
export const useScreenSize = () => {
  // Initialize with a reasonable default for SSR
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const calculateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine current breakpoint
      let breakpoint = 'xs';
      
      if (width >= breakpoints.xxl) breakpoint = 'xxl';
      else if (width >= breakpoints.xl) breakpoint = 'xl';
      else if (width >= breakpoints.lg) breakpoint = 'lg';
      else if (width >= breakpoints.md) breakpoint = 'md';
      else if (width >= breakpoints.sm) breakpoint = 'sm';
      
      // Determine device type
      const isMobile = width < breakpoints.md;
      const isTablet = width >= breakpoints.md && width < breakpoints.lg;
      const isDesktop = width >= breakpoints.lg;
      
      setScreenSize({
        width,
        height,
        breakpoint,
        isMobile,
        isTablet,
        isDesktop
      });
    };
    
    // Calculate on mount and when window is resized
    calculateScreenSize();
    
    const debouncedResize = debounce(calculateScreenSize, 100);
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);
  
  return screenSize;
};

/**
 * Simple debounce function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Get tailwind classes for different screen sizes
 * @param {Object} options - Classes for different breakpoints
 * @returns {string} Combined responsive classes
 */
export const responsiveClasses = (options) => {
  const { xs, sm, md, lg, xl, xxl } = options;
  const classes = [];
  
  if (xs) classes.push(xs);
  if (sm) classes.push(`sm:${sm}`);
  if (md) classes.push(`md:${md}`);
  if (lg) classes.push(`lg:${lg}`);
  if (xl) classes.push(`xl:${xl}`);
  if (xxl) classes.push(`xxl:${xxl}`);
  
  return classes.join(' ');
};
