import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Generic skeleton component for loading states
 * Provides a flexible, reusable skeleton placeholder
 */
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};

export { Skeleton };
