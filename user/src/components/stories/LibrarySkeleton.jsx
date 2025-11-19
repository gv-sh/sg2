import React from 'react';
import StoryCardSkeleton from './StoryCardSkeleton';
import { Skeleton } from '../ui/skeleton';

/**
 * Skeleton placeholder for the entire library page
 * @param {Object} props - Component props
 * @param {number} props.count - Number of skeleton cards to show
 */
const LibrarySkeleton = ({ count = 6 }) => {
  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filter skeleton */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }, (_, i) => (
          <StoryCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-center items-center gap-2 mt-8">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
};

export default LibrarySkeleton;