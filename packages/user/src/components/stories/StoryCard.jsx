// src/components/stories/StoryCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Calendar, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import LazyImage from '../ui/LazyImage';
import config from '../../config';

const StoryCard = ({ story, isHighlighted, onClick }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // Generate image URL from new API endpoint
  const getImageUrl = (story) => {
    // Only exclude if hasImage is explicitly false; allow undefined for backward compatibility
    if (!story || story.hasImage === false || imageError) return null;
    return `${config.API_URL}/api/content/${story.id}/image`;
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
          className="w-full h-48 object-cover"
          skeletonClassName="w-full h-48"
          onError={() => setImageError(true)}
        />
      ) : (
        // Fallback for stories without images
        <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-white opacity-80" />
        </div>
      )}

      <CardContent className="p-5">
        <h3 className="text-xl font-semibold line-clamp-2 mb-2">{storyTitle}</h3>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {story.year && (
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Year {story.year}
            </div>
          )}
          
          {/* Story type badge */}
          <div className="flex items-center">
            <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium capitalize">
              {story.type}
            </span>
          </div>
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