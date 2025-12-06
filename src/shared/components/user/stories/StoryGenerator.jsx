// src/components/stories/StoryGenerator.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Instagram, FileText, Image, Share2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert.tsx';
import InstagramHandleDialog from './InstagramHandleDialog.jsx';
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

  // Define steps for visual indicator
  const steps = [
    { id: 'story', label: 'Story Generation', icon: FileText },
    { id: 'images', label: 'Creating Images', icon: Image },
    { id: 'posting', label: 'Posting to Instagram', icon: Share2 },
    { id: 'complete', label: 'Complete', icon: CheckCircle }
  ];

  // Automatic Instagram posting when story is ready
  const startInstagramFlow = async (story) => {
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

      // Show handle dialog after a brief delay
      setTimeout(() => {
        setShowHandleDialog(true);
      }, 1500);

    } catch (error) {
      console.error('Instagram posting error:', error);
      setInstagramError(error.message);
      setInstagramState('error');
      setPhase('complete');
      setCurrentStep(3);
      setStatusMessage('Instagram posting failed');
      setProgress(100);
      
      // Still call completion to show the story
      setTimeout(() => {
        if (onGenerationComplete) onGenerationComplete();
      }, 2000);
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
    } else if (story && instagramState === 'idle') {
      // Story completed, prepare for Instagram flow
      setProgress(50);
      setStatusMessage('Story generated! Starting Instagram posting...');
      
      // Start Instagram flow after a brief delay
      setTimeout(() => {
        startInstagramFlow(story);
      }, 1000);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [loading, story, instagramState, showRecoveryBanner]);

  // Handle Instagram handle dialog completion
  const handleHandleComplete = (result) => {
    console.log('Instagram handle completed:', result);
    setShowHandleDialog(false);
    
    // Notify parent and navigate to story view
    if (onInstagramShareComplete) {
      onInstagramShareComplete({
        postId: instagramPostId,
        handleSubmitted: true
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

  // Step indicator component
  const StepIndicator = () => (
    <div className="max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          let status = 'pending'; // pending, active, completed, error
          
          if (index < currentStep) {
            status = 'completed';
          } else if (index === currentStep) {
            status = instagramState === 'error' && step.id === 'posting' ? 'error' : 'active';
          }

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle with LED */}
              <div className="flex flex-col items-center">
                <div className={`
                  relative w-12 h-12 rounded-full border-2 flex items-center justify-center
                  ${status === 'completed' 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : status === 'active' 
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse' 
                    : status === 'error'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                  }
                `}>
                  <Icon className="h-5 w-5" />
                  
                  {/* LED indicator */}
                  <div className={`
                    absolute -top-1 -right-1 w-3 h-3 rounded-full
                    ${status === 'completed' 
                      ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                      : status === 'active' 
                      ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' 
                      : status === 'error'
                      ? 'bg-red-400 shadow-lg shadow-red-400/50'
                      : 'bg-gray-300'
                    }
                  `} />
                </div>
                
                {/* Step Label */}
                <div className={`
                  mt-2 text-xs text-center font-medium
                  ${status === 'active' ? 'text-blue-600' : 
                    status === 'completed' ? 'text-green-600' :
                    status === 'error' ? 'text-red-600' : 'text-gray-500'
                  }
                `}>
                  {step.label}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4
                  ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
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