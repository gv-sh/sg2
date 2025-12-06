/**
 * CarouselPreview - Two-step Instagram sharing component
 * 1. Generate and preview carousel images in modal
 * 2. Share to Instagram after user confirmation
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { Instagram, Loader2, Check, AlertTriangle, Eye, X, ChevronLeft, ChevronRight, Maximize2, Edit3 } from 'lucide-react';
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFullSize, setShowFullSize] = useState(false);
  const [fullSizeSlide, setFullSizeSlide] = useState(0);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  // Initialize edited caption when preview data changes
  React.useEffect(() => {
    if (previewData?.caption && !editedCaption) {
      setEditedCaption(previewData.caption);
    }
  }, [previewData, editedCaption]);

  const slideCount = previewData?.previewUrls?.length || 0;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slideCount);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const openFullSize = (slideIndex) => {
    setFullSizeSlide(slideIndex);
    setShowFullSize(true);
  };

  const nextFullSizeSlide = () => {
    setFullSizeSlide((prev) => (prev + 1) % slideCount);
  };

  const prevFullSizeSlide = () => {
    setFullSizeSlide((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleEditCaption = () => {
    setEditingCaption(true);
  };

  const saveCaption = () => {
    setEditingCaption(false);
    // Here you could also update the preview data or send to backend
  };

  const cancelEditCaption = () => {
    setEditingCaption(false);
    setEditedCaption(previewData?.caption || '');
  };

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

  // Keyboard navigation support (after all functions are declared)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (showFullSize) {
        // Full size mode navigation
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            prevFullSizeSlide();
            break;
          case 'ArrowRight':
            e.preventDefault();
            nextFullSizeSlide();
            break;
          case 'Escape':
            e.preventDefault();
            setShowFullSize(false);
            break;
        }
      } else {
        // Regular modal navigation
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            prevSlide();
            break;
          case 'ArrowRight':
            e.preventDefault();
            nextSlide();
            break;
          case 'Enter':
          case ' ':
            if (e.target.tagName !== 'TEXTAREA' && !editingCaption) {
              e.preventDefault();
              openFullSize(currentSlide);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showFullSize, currentSlide, fullSizeSlide, editingCaption, slideCount]);

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

        <div className="space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Main Carousel View */}
          {previewData && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-foreground">
                    Carousel Preview ({previewData.slideCount} slides)
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{currentSlide + 1} / {slideCount}</span>
                  </div>
                </div>
                
                {/* Large Preview with Navigation */}
                <div className="relative">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border">
                    {previewData.previewUrls[currentSlide] && (
                      <img
                        src={previewData.previewUrls[currentSlide]}
                        alt={`Slide ${currentSlide + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
                        onClick={() => openFullSize(currentSlide)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                        }}
                      />
                    )}
                    
                    {/* Navigation Arrows */}
                    {slideCount > 1 && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    
                    {/* Full Size Button */}
                    <button
                      onClick={() => openFullSize(currentSlide)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Slide Indicators */}
                  {slideCount > 1 && (
                    <div className="flex justify-center space-x-2 mt-4">
                      {previewData.previewUrls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Thumbnail Strip */}
                <div className="mt-4">
                  <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                    {previewData.previewUrls.map((url, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square border-2 rounded-md overflow-hidden cursor-pointer transition-all ${
                          index === currentSlide ? 'border-primary' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setCurrentSlide(index)}
                      >
                        <img
                          src={url}
                          alt={`Slide ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caption Section with Editing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-foreground">Caption Preview</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={editingCaption ? saveCaption : handleEditCaption}
                    className="h-8"
                  >
                    {editingCaption ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
                
                {editingCaption ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      className="w-full h-40 p-3 border rounded-md bg-background resize-none text-sm"
                      placeholder="Edit your Instagram caption..."
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{editedCaption.length} / 2200 characters</span>
                      <div className="space-x-2">
                        <button
                          onClick={cancelEditCaption}
                          className="text-destructive hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 bg-muted/30 max-h-40 overflow-y-auto">
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {editedCaption || previewData.caption}
                    </div>
                  </div>
                )}
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
                    <span className="text-blue-600">
                      Post ID: {shareResult.postId} created successfully
                    </span>
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
      
      {/* Full Size Image Overlay */}
      {showFullSize && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Navigation Arrows for Full Size */}
            {slideCount > 1 && (
              <>
                <button
                  onClick={prevFullSizeSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={nextFullSizeSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            
            {/* Full Size Image */}
            <img
              src={previewData?.previewUrls[fullSizeSlide]}
              alt={`Slide ${fullSizeSlide + 1} - Full Size`}
              className="max-w-full max-h-full object-contain"
              onClick={() => setShowFullSize(false)}
            />
            
            {/* Slide Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {fullSizeSlide + 1} / {slideCount}
            </div>
          </div>
        </div>
      )}
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');

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
      setLoadingProgress(0);
      setGenerationStep('Analyzing story content...');

      // Simulate progress updates during generation
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 80) return prev + Math.random() * 15;
          return prev;
        });
      }, 300);

      const stepTimeout1 = setTimeout(() => setGenerationStep('Generating slide templates...'), 1000);
      const stepTimeout2 = setTimeout(() => setGenerationStep('Creating carousel images...'), 3000);
      const stepTimeout3 = setTimeout(() => setGenerationStep('Optimizing for Instagram...'), 5000);

      // Call Instagram preview API
      const response = await axios.post('/api/instagram/preview', {
        storyId: story.id
      });

      clearInterval(progressInterval);
      clearTimeout(stepTimeout1);
      clearTimeout(stepTimeout2);
      clearTimeout(stepTimeout3);

      if (response.data.success) {
        setLoadingProgress(100);
        setGenerationStep('Preview ready!');
        
        // Small delay to show completion
        setTimeout(() => {
          setPreviewData(response.data.data);
          setPreviewState('preview');
          setShowModal(true); // Open modal when preview is ready
        }, 500);
      } else {
        throw new Error(response.data.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Instagram preview error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate preview');
      setPreviewState('error');
      setLoadingProgress(0);
      setGenerationStep('');
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
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>{generationStep || 'Generating carousel images...'}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span>{Math.round(loadingProgress)}% complete</span>
                <span className="text-amber-600">Please don't close this page</span>
              </div>
            </div>
          </div>
        )}

        {previewState === 'ready' && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>Generate preview to see how your story will look on Instagram</span>
            </div>
          </div>
        )}

        {previewState === 'error' && error && (
          <Alert variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{error}</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleGeneratePreview}
                    className="text-xs underline hover:no-underline"
                  >
                    Try Again
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setPreviewState('ready');
                      setError(null);
                    }}
                    className="text-xs underline hover:no-underline"
                  >
                    Reset
                  </button>
                </div>
              </div>
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