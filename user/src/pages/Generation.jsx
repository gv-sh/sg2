// src/pages/Generation.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import StoryLibrary from '../components/stories/StoryLibrary';
import StoryViewer from '../components/stories/StoryViewer';
import StoryGenerator from '../components/stories/StoryGenerator';
import GenerationControls from '../components/generation/GenerationControls';
import { useGeneration } from '../hooks/useGeneration';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// Separate view components
const GeneratingView = ({ loading, error, showRecoveryBanner, onGenerationComplete, handleBackToLibrary }) => (
  <>
    <GenerationControls
      activeStory={null}
      onBackToLibrary={handleBackToLibrary}
      storyTitle="Generating..."
    />
    <StoryGenerator
      loading={loading}
      error={error}
      showRecoveryBanner={showRecoveryBanner}
      onGenerationComplete={onGenerationComplete}
    />
  </>
);

const StoryView = ({ 
  activeStory, 
  generatedContent, 
  storyTitle, 
  handleBackToLibrary, 
  regenerateStory,
  handleCreateNew, 
  loading 
}) => (
  <>
    <GenerationControls
      activeStory={activeStory}
      generatedContent={generatedContent}
      onBackToLibrary={handleBackToLibrary}
      storyTitle={activeStory?.title || storyTitle}
    />
    <StoryViewer
      story={activeStory}
      onBackToLibrary={handleBackToLibrary}
      onRegenerateStory={() => regenerateStory(activeStory)}
      onCreateNew={handleCreateNew}
      loading={loading}
    />
  </>
);

const LibraryView = ({ stories, setActiveStory, handleCreateNew, highlightedStoryId, loading, error, storyTitle }) => (
  <>
    <GenerationControls
      onBackToLibrary={() => {}}
      storyTitle={storyTitle}
    />
    <StoryLibrary
      stories={stories}
      onStorySelect={setActiveStory}
      onCreateNew={handleCreateNew}
      highlightedStoryId={highlightedStoryId}
      loading={loading}
      error={error}
    />
  </>
);

const Generation = ({
  setGeneratedContent,
  generatedContent,
  selectedParameters,
  setSelectedParameters,
  generationInProgress,
  setGenerationInProgress,
  viewMode = null
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');

  const {
    loading,
    error,
    stories,
    activeStory,
    setActiveStory,
    storyTitle,
    showRecoveryBanner,
    highlightedStoryId,
    regenerateStory
  } = useGeneration(
    selectedParameters,
    setSelectedParameters,
    setGenerationInProgress
  );

  const handleCreateNew = () => {
    setSelectedParameters([]);
    navigate('/parameters');
  };
  
  const handleBackToLibrary = () => {
    setActiveStory(null);
    setGeneratedContent(null);
    // Clear URL parameters to prevent re-loading the story
    navigate('/library', { replace: true });
  };
  
  // Use URL parameters to set the active story if on story page
  useEffect(() => {
    const determineMode = async () => {
      if (viewMode === 'story' || location.pathname === '/story') {
        if (storyId && !activeStory) {
          // Find the story in the stories array
          const story = stories.find(s => s.id === storyId);
          if (story) {
            setActiveStory(story);
          }
        }
      } else if (location.pathname === '/library') {
        // Ensure we're in library mode when on library path
        if (activeStory) {
          setActiveStory(null);
        }
      }
    };
    
    if (stories.length > 0) {
      determineMode();
    }
  }, [viewMode, location.pathname, storyId, stories, activeStory, setActiveStory]);

  // Watch for generation completion
  useEffect(() => {
    // If we just completed generation and have an active story but still on generating route
    if (!loading && activeStory && (location.pathname === '/generating' || viewMode === 'generating')) {
      // Check if we're regenerating a story
      const regeneratingStoryId = sessionStorage.getItem('specgen-regenerating-story-id');
      
      if (regeneratingStoryId && regeneratingStoryId === activeStory.id) {
        // Clear the regenerating flag
        sessionStorage.removeItem('specgen-regenerating-story-id');
      }
      
      // Navigate to story page instead of library
      navigate(`/story?id=${activeStory.id}`);
    }
  }, [loading, activeStory, location.pathname, navigate, viewMode]);

  // Handle generation completion
  const onGenerationComplete = () => {
    setGenerationInProgress(false);
    // The navigate happens in the useEffect above when loading completes
  };

  // Determine which view to show
  const determineViewMode = () => {
    if (viewMode === 'generating' || generationInProgress || location.pathname === '/generating') {
      return 'generating';
    }
    
    if (viewMode === 'story' || location.pathname === '/story') {
      return 'story';
    }
    
    if (activeStory) {
      return 'story';
    }
    
    return 'library';
  };
  
  const currentViewMode = determineViewMode();

  if (currentViewMode === 'generating') {
    return (
      <div className="bg-card rounded-md h-full overflow-auto">
        <GeneratingView
          loading={loading}
          error={error}
          showRecoveryBanner={showRecoveryBanner}
          onGenerationComplete={onGenerationComplete}
          handleBackToLibrary={handleBackToLibrary}
        />
      </div>
    );
  }

  if (currentViewMode === 'story') {
    // If we're in story mode but don't have an active story and are still loading
    if (!activeStory && loading) {
    return (
    <div className="bg-card rounded-md h-full overflow-auto">
    <GenerationControls
    onBackToLibrary={handleBackToLibrary}
    storyTitle="Loading story..."
    />
    <div className="flex items-center justify-center h-[calc(100%-4rem)]">
    <div className="text-center">
    <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
    <h3 className="text-lg font-medium mb-2">Loading story</h3>
    <p className="text-muted-foreground">Please wait...</p>
    </div>
    </div>
    </div>
    );
    }
    
    // If we're in story mode but don't have an active story and aren't loading
    if (!activeStory && !loading) {
      return (
        <div className="bg-card rounded-md h-full overflow-auto">
          <GenerationControls
            onBackToLibrary={handleBackToLibrary}
            storyTitle="Error"
          />
          <div className="flex items-center justify-center h-[calc(100%-4rem)]">
            <div className="text-center max-w-md">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Story not found</h3>
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  {error || `Could not find story with ID: ${storyId || 'unknown'}`}
                </AlertDescription>
              </Alert>
              <div className="mt-6">
                <button 
                  onClick={handleBackToLibrary}
                  className="text-primary hover:underline"
                >
                  Return to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-card rounded-md h-full overflow-auto">
        <StoryView
          activeStory={activeStory}
          generatedContent={generatedContent}
          storyTitle={storyTitle}
          handleBackToLibrary={handleBackToLibrary}
          regenerateStory={regenerateStory}
          handleCreateNew={handleCreateNew}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md h-full overflow-auto">
      <LibraryView
        stories={stories}
        setActiveStory={(story) => {
          setActiveStory(story);
          navigate(`/story?id=${story.id}`);
        }}
        handleCreateNew={handleCreateNew}
        highlightedStoryId={highlightedStoryId}
        loading={loading}
        error={error}
        storyTitle="Story Library"
      />
    </div>
  );
};

export default Generation;