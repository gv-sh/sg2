/**
 * InstagramShareButton - Button to share story as Instagram carousel
 * Only appears for first-time generation and before sharing
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { Instagram, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert.tsx';
import axios from 'axios';

const InstagramShareButton = ({ 
  story, 
  onShareComplete, 
  disabled = false,
  size = "sm" 
}) => {
  const [shareState, setShareState] = useState('ready'); // ready, sharing, success, error
  const [error, setError] = useState(null);
  const [shareResult, setShareResult] = useState(null);

  // Don't show if story was already shared
  if (story?.metadata?.instagram?.shared) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Check className="h-4 w-4 mr-2 text-green-500" />
        Shared to Instagram
      </div>
    );
  }

  const handleShare = async () => {
    if (!story?.id || shareState === 'sharing') return;

    try {
      setShareState('sharing');
      setError(null);

      // Call Instagram share API
      const response = await axios.post('/api/instagram/share', {
        storyId: story.id
      });

      if (response.data.success) {
        setShareResult(response.data.data);
        setShareState('success');
        
        // Notify parent component
        if (onShareComplete) {
          onShareComplete({
            postId: response.data.data.postId,
            carouselUrl: response.data.data.carouselUrl,
            slideCount: response.data.data.slideCount
          });
        }
      } else {
        throw new Error(response.data.message || 'Failed to share to Instagram');
      }
    } catch (err) {
      console.error('Instagram share error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to share to Instagram');
      setShareState('error');
    }
  };

  const getButtonContent = () => {
    switch (shareState) {
      case 'sharing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating carousel...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Shared successfully!
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Retry share
          </>
        );
      default:
        return (
          <>
            <Instagram className="h-4 w-4 mr-2" />
            Share to Instagram
          </>
        );
    }
  };

  const getButtonVariant = () => {
    switch (shareState) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant={getButtonVariant()}
        size={size}
        onClick={handleShare}
        disabled={disabled || shareState === 'sharing' || shareState === 'success'}
        className={shareState === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
      >
        {getButtonContent()}
      </Button>

      {shareState === 'sharing' && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>Generating carousel images...</span>
          </div>
          <div className="mt-1 text-amber-600">
            This may take 30-60 seconds. Please don't close this page.
          </div>
        </div>
      )}

      {shareState === 'success' && shareResult && (
        <div className="text-xs text-green-600">
          <div className="font-medium">Instagram carousel created!</div>
          <div className="mt-1">
            {shareResult.slideCount} slides • Post ID: {shareResult.postId}
          </div>
          {shareResult.carouselUrl && (
            <div className="mt-1">
              <a 
                href={shareResult.carouselUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View on Instagram →
              </a>
            </div>
          )}
        </div>
      )}

      {shareState === 'error' && error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {shareState === 'ready' && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <span>✨</span>
            <span>One-time sharing opportunity for this story</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramShareButton;