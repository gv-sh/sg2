/**
 * CarouselPreview - Two-step Instagram sharing component
 * 1. Generate and preview carousel images in modal
 * 2. Share to Instagram after user confirmation
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { Instagram, Loader2, Check, AlertTriangle, Eye, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert.tsx';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../ui/dialog.js';
import axios from 'axios';

// Modal component for carousel preview
const CarouselPreviewModal = ({ 
  isOpen, 
  onClose, 
  story, 
  onShareComplete,
  previewData,
  onRegeneratePreview 
}) => {
  const [shareState, setShareState] = useState('ready'); // ready, sharing, success, error
  const [error, setError] = useState(null);
  const [shareResult, setShareResult] = useState(null);

  const handleShareToInstagram = async () => {
    if (!story?.id || shareState === 'sharing') return;

    try {
      setShareState('sharing');
      setError(null);

      // Call Instagram share API (uses cached images from preview)
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

        // Close modal after successful share
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to share to Instagram');
      }
    } catch (err) {
      console.error('Instagram share error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to share to Instagram');
      setShareState('error');
    }
  };

  const getShareButtonContent = () => {
    switch (shareState) {
      case 'sharing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Posting to Instagram...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Posted successfully!
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Retry post
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

  const getShareButtonVariant = () => {
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
    <Dialog isOpen={isOpen} onDismiss={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Instagram Carousel Preview</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Preview Images Grid */}
          {previewData && (
            <>
              <div>
                <div className="text-sm font-medium text-foreground mb-3">
                  Carousel Images ({previewData.slideCount} slides)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {previewData.previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square border rounded-md overflow-hidden bg-background">
                      <img
                        src={url}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                        }}
                      />
                      <div className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption Preview */}
              <div>
                <div className="text-sm font-medium text-foreground mb-3">Caption Preview</div>
                <div className="border rounded-md p-3 bg-muted/30 max-h-32 overflow-y-auto">
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {previewData.caption}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {shareState === 'success' && shareResult && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">Instagram post created successfully!</div>
                <div className="mt-1">
                  {shareResult.slideCount} slides • Post ID: {shareResult.postId}
                </div>
                {shareResult.carouselUrl && (
                  <div className="mt-2">
                    <a 
                      href={shareResult.carouselUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View on Instagram →
                    </a>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Sharing Progress */}
          {shareState === 'sharing' && (
            <div className="flex items-center justify-center space-x-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Posting to Instagram...</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={onRegeneratePreview}
            disabled={shareState === 'sharing' || shareState === 'success'}
          >
            <Eye className="h-4 w-4 mr-2" />
            Regenerate Preview
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={shareState === 'sharing'}
            >
              Cancel
            </Button>
            <Button
              variant={getShareButtonVariant()}
              onClick={handleShareToInstagram}
              disabled={shareState === 'sharing' || shareState === 'success'}
              className={shareState === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {getShareButtonContent()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main component - just the button
const CarouselPreview = ({ 
  story, 
  onShareComplete, 
  disabled = false,
  size = "sm" 
}) => {
  const [previewState, setPreviewState] = useState('ready'); // ready, generating, preview, error
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Don't show if story was already shared
  if (story?.metadata?.instagram?.shared) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Check className="h-4 w-4 mr-2 text-green-500" />
        Shared to Instagram
      </div>
    );
  }

  const handleGeneratePreview = async () => {
    if (!story?.id || previewState === 'generating') return;

    try {
      setPreviewState('generating');
      setError(null);

      // Call Instagram preview API
      const response = await axios.post('/api/instagram/preview', {
        storyId: story.id
      });

      if (response.data.success) {
        setPreviewData(response.data.data);
        setPreviewState('preview');
        setShowModal(true); // Open modal when preview is ready
      } else {
        throw new Error(response.data.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Instagram preview error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate preview');
      setPreviewState('error');
    }
  };

  const handleRegeneratePreview = () => {
    setShowModal(false);
    setPreviewState('ready');
    setPreviewData(null);
    handleGeneratePreview();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const getPreviewButtonContent = () => {
    switch (previewState) {
      case 'generating':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating preview...
          </>
        );
      case 'preview':
        return (
          <>
            <Eye className="h-4 w-4 mr-2" />
            View Preview
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Retry preview
          </>
        );
      default:
        return (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Generate Preview
          </>
        );
    }
  };

  const getPreviewButtonVariant = () => {
    switch (previewState) {
      case 'preview':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleButtonClick = () => {
    if (previewState === 'preview') {
      setShowModal(true); // Show modal if preview already exists
    } else {
      handleGeneratePreview(); // Generate preview if it doesn't exist
    }
  };

  return (
    <>
      {/* Simple button interface */}
      <div className="space-y-3">
        <Button
          variant={getPreviewButtonVariant()}
          size={size}
          onClick={handleButtonClick}
          disabled={disabled || previewState === 'generating'}
          className={previewState === 'preview' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          {getPreviewButtonContent()}
        </Button>

        {previewState === 'generating' && (
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

        {previewState === 'ready' && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>✨</span>
              <span>Generate preview to see how your story will look on Instagram</span>
            </div>
          </div>
        )}

        {previewState === 'error' && error && (
          <Alert variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Modal for preview */}
      <CarouselPreviewModal
        isOpen={showModal}
        onClose={handleCloseModal}
        story={story}
        onShareComplete={onShareComplete}
        previewData={previewData}
        onRegeneratePreview={handleRegeneratePreview}
      />
    </>
  );
};

export default CarouselPreview;