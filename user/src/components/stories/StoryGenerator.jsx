// src/components/stories/StoryGenerator.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const StoryGenerator = ({
  loading,
  error,
  showRecoveryBanner,
  onGenerationComplete
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval = null;

    if (loading) {
      // Animate progress while loading
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 500);
    } else if (progress < 100) {
      // Complete progress when loading ends
      setProgress(100);
      
      // Signal completion after a brief delay to show 100%
      setTimeout(() => {
        if (onGenerationComplete) onGenerationComplete();
      }, 500);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [loading, progress, onGenerationComplete]);

  return (
    <div className="container max-w-6xl mx-auto h-full">
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Generating your story</h3>
          <p className="text-muted-foreground mb-4">
            {showRecoveryBanner
              ? "Resuming generation after navigation..."
              : "This may take a few moments..."}
          </p>

          {/* Progress bar */}
          <div className="w-64 bg-muted rounded-full h-2.5 mb-4 mx-auto">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Warning message */}
          <div className="text-sm text-amber-600 dark:text-amber-400 mt-6 mb-4 max-w-md mx-auto p-3 border border-amber-200 dark:border-amber-900 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 inline-block mr-2" />
            Please stay on this page while the content is generating. This usually takes around 30–45 seconds.
          </div>

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
  );
};

export default StoryGenerator;