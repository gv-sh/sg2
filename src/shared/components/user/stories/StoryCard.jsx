// src/components/stories/StoryCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '#shared/components/ui';
import { Calendar, BookOpen } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LazyImage } from '#shared/components/ui';
import config from '#user/config';

const StoryCard = ({ story, isHighlighted, onClick }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // Generate image URL from new API endpoint
  const getImageUrl = (story) => {
    // Only exclude if hasImage is explicitly false; allow undefined for backward compatibility
    if (!story || story.hasImage === false || imageError) return null;
    
    // Use thumbnail URL first (new API format)
    if (story.image_thumbnail_url) {
      return story.image_thumbnail_url;
    }
    
    // Fall back to original image URL (new API format)
    if (story.image_original_url) {
      return story.image_original_url;
    }
    
    // Use the imageData URL that was already processed by API service (legacy format)
    return story.imageData || null;
  };

  // Handle title extraction from story
  const getStoryTitle = (story) => {
    if (!story) return "Untitled Story";

    // Use title if available
    if (story.title && story.title !== "Untitled Story") {
      return story.title;
    }

    return "Untitled Story";
  };

  // Handle click with custom handler or default navigation
  const handleClick = () => {
    if (onClick) {
      onClick(story);
    } else {
      navigate(`/story?id=${story.id}`);
    }
  };

  // Get image URL for lazy loading
  const imageUrl = getImageUrl(story);
  const storyTitle = getStoryTitle(story);

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative group",
        isHighlighted ? 'ring-2 ring-primary animate-pulse' : ''
      )}
      onClick={handleClick}
    >
      {/* Image with lazy loading */}
      {imageUrl ? (
        <LazyImage
          src={imageUrl}
          alt={storyTitle}
          className="w-full aspect-[6/4] object-cover"
          skeletonClassName="w-full aspect-[6/4]"
          onError={() => setImageError(true)}
        />
      ) : (
        // Fallback for stories without images
        <div className="w-full aspect-[6/4] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-white opacity-80" />
        </div>
      )}

      <CardContent className="p-5">
        <h3 className="text-xl font-semibold line-clamp-2 mb-2">{storyTitle}</h3>
        
        <div className="flex items-center text-sm text-muted-foreground">
          {story.year && (
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Year {story.year}
            </div>
          )}
        </div>

        {/* Creation date */}
        <div className="text-xs text-muted-foreground mt-2">
          {story.createdAt && new Date(story.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryCard;