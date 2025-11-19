import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * Skeleton placeholder for StoryCard component
 * Shows animated placeholders while content is loading
 */
const StoryCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="w-full h-48 rounded-none" />

      <CardContent className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Metadata skeleton */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryCardSkeleton;