// src/pages/StoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StoryViewer from '../components/stories/StoryViewer';
import GenerationControls from '../components/generation/GenerationControls';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { generateContent } from '../services/api';

const StoryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');
  
  const [activeStory, setActiveStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch story data on mount
  useEffect(() => {
    const loadStory = async () => {
      if (!storyId) {
        setError('No story ID provided');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to get from localStorage first (for now, until API endpoint is available)
        const cachedStoriesJSON = localStorage.getItem('specgen-cached-stories');
        if (cachedStoriesJSON) {
          const cachedStories = JSON.parse(cachedStoriesJSON);
          const story = cachedStories.find(s => s.id === storyId);
          
          if (story) {
            setActiveStory(story);
            setLoading(false);
            return;
          }
        }
        
        // If not in cache, we could fetch from API
        // For now, show error
        setError('Story not found');
      } catch (err) {
        console.error('Error loading story:', err);
        setError('Failed to load story');
      } finally {
        setLoading(false);
      }
    };
    
    loadStory();
  }, [storyId]);
  
  const handleBackToLibrary = () => {
    navigate('/library');
  };
  
  const handleCreateNew = () => {
    navigate('/parameters');
  };
  
  const handleRegenerateStory = async () => {
    if (!activeStory || loading) return;
    
    try {
      setLoading(true);
      
      // Get the original parameter values from the story
      const parameterValues = activeStory.parameterValues;
      const categoryIds = Object.keys(parameterValues);
      
      // Make the API call to regenerate
      const response = await generateContent(
        parameterValues,
        categoryIds,
        'combined',
        activeStory.year,
        activeStory.title
      );
      
      if (response.success) {
        // Update story with new content
        const updatedStory = {
          ...activeStory,
          content: response.content,
          imageData: response.imageData?.startsWith('data:image')
            ? response.imageData
            : response.imageData ? `data:image/png;base64,${response.imageData}` : null,
          updatedAt: new Date().toISOString()
        };
        
        setActiveStory(updatedStory);
        
        // Update in cached stories
        const cachedStoriesJSON = localStorage.getItem('specgen-cached-stories');
        if (cachedStoriesJSON) {
          const cachedStories = JSON.parse(cachedStoriesJSON);
          const updatedStories = cachedStories.map(story => 
            story.id === storyId ? updatedStory : story
          );
          
          localStorage.setItem('specgen-cached-stories', JSON.stringify(updatedStories));
          localStorage.setItem('specgen-cached-timestamp', Date.now().toString());
        }
      } else {
        setError(response.error || 'Regeneration failed');
      }
    } catch (err) {
      console.error('Error regenerating story:', err);
      setError(err.message || 'Failed to regenerate content');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
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
  
  if (error || !activeStory) {
    return (
      <div className="bg-card rounded-md h-full overflow-auto">
        <GenerationControls
          onBackToLibrary={handleBackToLibrary}
          storyTitle="Error"
        />
        <div className="flex items-center justify-center h-[calc(100%-4rem)]">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load story</h3>
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error || 'Story not found'}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-md h-full overflow-auto">
      <GenerationControls
        activeStory={activeStory}
        onBackToLibrary={handleBackToLibrary}
        storyTitle={activeStory.title}
      />
      <StoryViewer
        story={activeStory}
        onBackToLibrary={handleBackToLibrary}
        onRegenerateStory={handleRegenerateStory}
        onCreateNew={handleCreateNew}
        loading={loading}
      />
    </div>
  );
};

export default StoryPage;


