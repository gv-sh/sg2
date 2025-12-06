// src/components/stories/StoryGenerator.jsx
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, Instagram } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert.tsx';
import InstagramHandleDialog from './InstagramHandleDialog.jsx';
import { fetchSettings } from '../../../../user/services/api.js';
import axios from 'axios';

const StoryGenerator = ({
  loading,
  error,
  showRecoveryBanner,
  onGenerationComplete,
  story,
  onInstagramShareComplete
}) => {
  // Multi-phase progress tracking
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('story'); // 'story', 'images', 'posting', 'complete'
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0=story, 1=images, 2=posting, 3=complete
  
  // Instagram flow state
  const [instagramState, setInstagramState] = useState('idle'); // 'idle', 'generating', 'posting', 'posted', 'error'
  const [instagramPostId, setInstagramPostId] = useState(null);
  const [showHandleDialog, setShowHandleDialog] = useState(false);
  const [instagramError, setInstagramError] = useState(null);
  const [imageProgress, setImageProgress] = useState('');
  const [waitingForHandle, setWaitingForHandle] = useState(false);
  const waitingForHandleRef = useRef(false);

  // Settings state
  const [instagramEnabled, setInstagramEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Define steps for simple visual indicator (dynamic based on Instagram setting)
  const getSteps = () => {
    const baseSteps = [{ id: 'story', label: 'Story Generation' }];
    
    if (instagramEnabled) {
      baseSteps.push(
        { id: 'images', label: 'Creating Images' },
        { id: 'posting', label: 'Posting to Instagram' }
      );
    }
    
    baseSteps.push({ id: 'complete', label: 'Complete' });
    return baseSteps;
  };

  const steps = getSteps();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetchSettings();
        if (response.success && response.data) {
          setInstagramEnabled(response.data['instagram.enabled'] ?? true);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Default to enabled if we can't load settings
        setInstagramEnabled(true);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Automatic Instagram posting when story is ready
  const startInstagramFlow = async (story) => {
    // Check if Instagram is enabled before starting
    if (!instagramEnabled) {
      console.log('Instagram sharing is disabled, skipping Instagram flow');
      setProgress(100);
      setPhase('complete');
      setCurrentStep(steps.length - 1);
      setStatusMessage('Story generation complete');
      
      // Notify parent that Instagram is "completed" (skipped)
      if (onInstagramShareComplete) {
        onInstagramShareComplete({
          instagramDisabled: true,
          handleSubmitted: false
        });
      }
      
      // Complete the generation flow
      if (onGenerationComplete) onGenerationComplete();
      return;
    }

    try {
      // Phase 1: Start image generation
      setInstagramState('generating');
      setPhase('images');
      setCurrentStep(1);
      setStatusMessage('Creating Instagram carousel images...');
      setInstagramError(null);
      setProgress(50);

      console.log('Starting Instagram flow for story:', story.id);

      // Generate Instagram preview/images
      const previewResponse = await axios.post('/api/instagram/preview', {
        storyId: story.id
      });

      console.log('Preview response:', previewResponse.data);

      if (!previewResponse.data.success) {
        throw new Error(previewResponse.data.message || 'Failed to generate Instagram images');
      }

      // Phase 2: Images complete, start posting
      setProgress(80);
      setInstagramState('posting');
      setPhase('posting');
      setCurrentStep(2);
      setStatusMessage('Posting to Instagram...');
      
      console.log('Starting Instagram share...');

      const shareResponse = await axios.post('/api/instagram/share', {
        storyId: story.id
      });

      console.log('Share response:', shareResponse.data);

      if (!shareResponse.data.success) {
        throw new Error(shareResponse.data.message || 'Failed to post to Instagram');
      }

      // Phase 3: Success!
      setProgress(100);
      setInstagramState('posted');
      setPhase('complete');
      setCurrentStep(3);
      setStatusMessage('Posted to Instagram successfully!');
      setInstagramPostId(shareResponse.data.data.postId);

      // Store Instagram sharing results in story metadata (but don't complete yet)
      if (story) {
        const instagramResult = {
          shared: true,
          postId: shareResponse.data.data.postId,
          carouselUrl: shareResponse.data.data.carouselUrl || null,
          slideCount: shareResponse.data.data.slideCount || 1,
          sharedAt: new Date().toISOString(),
          platform: 'instagram'
        };
        
        // Update story metadata to include Instagram sharing info
        story.metadata = {
          ...story.metadata,
          instagram: instagramResult
        };
        
        // Don't call onInstagramShareComplete yet - wait for handle dialog completion
      }

      // Mark that we're waiting for handle input
      setWaitingForHandle(true);
      waitingForHandleRef.current = true;
      
      // Show handle dialog after a brief delay
      setTimeout(() => {
        setShowHandleDialog(true);
      }, 1500);
      
      // Fallback: If dialog doesn't complete within 30 seconds, auto-complete without handle
      setTimeout(() => {
        if (waitingForHandleRef.current) {
          console.warn('Instagram handle dialog timeout, auto-completing without handle');
          waitingForHandleRef.current = false;
          setWaitingForHandle(false);
          handleHandleComplete({ skipped: true, handle: null, commentId: null });
        }
      }, 30000);

    } catch (error) {
      console.error('Instagram posting error:', error);
      
      // Check for rate limiting and provide appropriate messaging
      let errorMessage = error.message || 'Instagram posting failed';
      let userMessage = '';
      let isRateLimited = false;
      
      if (error.response?.status === 429 || error.message?.includes('rate limit') || error.message?.includes('request limit')) {
        isRateLimited = true;
        userMessage = 'Instagram posting limit reached. Your story is ready, but Instagram posting will need to wait. You can share manually.';
        errorMessage = 'Rate Limited';
      } else if (error.response?.data?.errorType === 'RATE_LIMITED') {
        isRateLimited = true;
        userMessage = error.response.data.userMessage || 'Instagram posting limit reached. Please try again later.';
        errorMessage = 'Rate Limited';
      } else if (error.response?.data?.errorType === 'AUTH_ERROR') {
        userMessage = 'Instagram authentication issue. Please contact support.';
        errorMessage = 'Authentication Error';
      }
      
      setInstagramError(userMessage || errorMessage);
      setInstagramState('error');
      setPhase('complete');
      setCurrentStep(3);
      setStatusMessage(isRateLimited ? 'Story ready - Instagram posting limited' : 'Instagram posting failed');
      setProgress(100);
      
      // For any Instagram error, complete the flow and show the story
      // The user should still see their generated story even if Instagram fails
      setTimeout(() => {
        if (onInstagramShareComplete) {
          // Call completion with error information
          onInstagramShareComplete({
            rateLimited: isRateLimited,
            instagramFailed: !isRateLimited,
            error: userMessage || errorMessage,
            handleSubmitted: false
          });
        }
        if (onGenerationComplete) onGenerationComplete();
      }, 1500);
    }
  };

  // Main progress tracking effect
  useEffect(() => {
    let progressInterval = null;

    if (loading) {
      // Story generation phase (0-50%)
      setPhase('story');
      setCurrentStep(0);
      setStatusMessage(showRecoveryBanner 
        ? "Resuming story generation..." 
        : "Generating your story...");
      
      // Realistic progress during story generation
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 48));
      }, 800);
    } else if (story && instagramState === 'idle' && settingsLoaded) {
      // Story completed, prepare for next phase
      setProgress(50);
      
      if (instagramEnabled) {
        setStatusMessage('Story generated! Starting Instagram posting...');
        // Start Instagram flow after a brief delay
        setTimeout(() => {
          startInstagramFlow(story);
        }, 1000);
      } else {
        setStatusMessage('Story generation complete');
        // Skip Instagram and complete immediately
        setTimeout(() => {
          startInstagramFlow(story); // This will handle the disabled case
        }, 1000);
      }
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [loading, story, instagramState, showRecoveryBanner, settingsLoaded, instagramEnabled]);

  // Handle Instagram handle dialog completion
  const handleHandleComplete = (result) => {
    console.log('Instagram handle completed:', result);
    setShowHandleDialog(false);
    setWaitingForHandle(false);
    waitingForHandleRef.current = false;
    
    // Update story metadata with handle information
    if (story && story.metadata?.instagram) {
      story.metadata.instagram = {
        ...story.metadata.instagram,
        handleSubmitted: !result.skipped,
        handle: result.handle || null,
        commentId: result.commentId || null,
        handleSubmittedAt: result.skipped ? null : new Date().toISOString()
      };
    }
    
    // Notify parent that Instagram flow is fully complete
    if (onInstagramShareComplete) {
      onInstagramShareComplete({
        shared: true,
        postId: instagramPostId,
        handleSubmitted: !result.skipped,
        handle: result.handle || null,
        commentId: result.commentId || null,
        carouselUrl: story?.metadata?.instagram?.carouselUrl || null,
        slideCount: story?.metadata?.instagram?.slideCount || 1,
        sharedAt: story?.metadata?.instagram?.sharedAt,
        platform: 'instagram',
        instagramData: story?.metadata?.instagram
      });
    }
    
    // Complete the generation flow
    if (onGenerationComplete) onGenerationComplete();
  };

  // Get appropriate status icon based on phase
  const getStatusIcon = () => {
    if (phase === 'images' || phase === 'posting') {
      return <Instagram className="h-10 w-10 text-primary animate-pulse mx-auto mb-4" />;
    }
    return <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />;
  };

  // Get appropriate phase title
  const getPhaseTitle = () => {
    switch (phase) {
      case 'images': return 'Creating Instagram Post';
      case 'posting': return 'Posting to Instagram';
      case 'complete': return instagramState === 'posted' ? 'Posted Successfully!' : 'Generation Complete';
      default: return 'Generating your story';
    }
  };

  // Simple step indicator component
  const StepIndicator = () => (
    <div className="max-w-md mx-auto mb-8">
      <div className="flex items-center justify-center space-x-2">
        {steps.map((step, index) => {
          let status = 'pending'; // pending, active, completed, error
          
          if (index < currentStep) {
            status = 'completed';
          } else if (index === currentStep) {
            status = instagramState === 'error' && step.id === 'posting' ? 'error' : 'active';
          }

          return (
            <div key={step.id} className="flex items-center">
              {/* Simple progress dot */}
              <div className={`
                w-3 h-3 rounded-full transition-colors
                ${status === 'completed' 
                  ? 'bg-green-500' 
                  : status === 'active' 
                  ? 'bg-blue-500 animate-pulse' 
                  : status === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-300'
                }
              `} />
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`
                  w-8 h-px mx-2
                  ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Current step label */}
      <div className="text-center mt-3">
        <div className={`
          text-sm font-medium
          ${currentStep < steps.length ? (
            instagramState === 'error' && steps[currentStep]?.id === 'posting' 
              ? 'text-red-600' 
              : 'text-blue-600'
          ) : 'text-green-600'}
        `}>
          {currentStep < steps.length ? steps[currentStep].label : 'Complete'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container max-w-6xl mx-auto h-full">
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Step Indicator */}
          <StepIndicator />
          
          {/* Main Content */}
          <div className="text-center">
            {getStatusIcon()}
            <h3 className="text-lg font-medium mb-2">{getPhaseTitle()}</h3>
            <p className="text-muted-foreground mb-4">
              {statusMessage || (showRecoveryBanner
                ? "Resuming generation after navigation..."
                : "This may take a few moments...")}
            </p>

          {/* Progress bar */}
          <div className="w-64 bg-muted rounded-full h-2.5 mb-4 mx-auto">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Warning message - show different message based on phase */}
          <div className="text-sm text-amber-600 dark:text-amber-400 mt-6 mb-4 max-w-md mx-auto p-3 border border-amber-200 dark:border-amber-900 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 inline-block mr-2" />
            {phase === 'story' 
              ? "Please stay on this page while the content is generating. This usually takes around 30–45 seconds."
              : phase === 'images'
              ? "Creating Instagram carousel images. This may take a moment..."
              : phase === 'posting'
              ? "Posting to Instagram. Please don't close this page..."
              : "Process complete!"}
          </div>

          {/* Instagram success message */}
          {instagramState === 'posted' && !showHandleDialog && (
            <div className="text-sm text-green-600 dark:text-green-400 mt-4 mb-4 max-w-md mx-auto p-3 border border-green-200 dark:border-green-900 rounded-md bg-green-50 dark:bg-green-950/30">
              <Instagram className="h-4 w-4 inline-block mr-2" />
              Successfully posted to Instagram! Adding your handle...
            </div>
          )}

          {/* Instagram error message */}
          {instagramError && (
            <Alert className="mt-4 max-w-md mx-auto" variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>Instagram Error: {instagramError}</AlertDescription>
            </Alert>
          )}

          {/* Error message if any */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          </div>
        </div>
      </div>

      {/* Instagram Handle Dialog */}
      <InstagramHandleDialog
        isOpen={showHandleDialog}
        onClose={() => setShowHandleDialog(false)}
        postId={instagramPostId}
        onComplete={handleHandleComplete}
      />
    </div>
  );
};

export default StoryGenerator;