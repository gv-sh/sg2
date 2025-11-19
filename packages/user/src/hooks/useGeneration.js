// src/hooks/useGeneration.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { generateContent, fetchPreviousGenerations } from '../services/api';
import { generateRandomYear } from '../utils/parameterUtils';

export const useGeneration = (
  selectedParameters,
  setSelectedParameters,
  setGenerationInProgress
) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [storyTitle, setStoryTitle] = useState("Untitled Story");
  const [storyYear, setStoryYear] = useState(generateRandomYear());
  const [highlightedStoryId] = useState(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [lastGeneratedStoryId, setLastGeneratedStoryId] = useState(null);

  // Ref to prevent double loading
  const storiesLoaded = useRef(false);

  // Load stories from API or storage
  const loadStories = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Try API first
      const response = await fetchPreviousGenerations();

      if (response.success && response.data) {
        setStories(response.data);
        setError(null);
        
        // Store minimal data in cache to avoid quota issues
        try {
          // Limit to 5 stories, strip large data
          const minimalStories = response.data.slice(0, 5).map(story => ({
            id: story.id,
            title: story.title,
            createdAt: story.createdAt,
            year: story.year,
            // Store parameterValues for regeneration
            parameterValues: story.parameterValues,
            // Exclude content and imageData
            isMinimal: true
          }));
          
          localStorage.setItem('specgen-cached-stories', JSON.stringify(minimalStories));
          localStorage.setItem('specgen-cached-timestamp', Date.now().toString());
        } catch (storageError) {
          console.warn('Storage error:', storageError.message);
          // Clear other caches to make room
          localStorage.removeItem('specgen-history');
        }
      } else {
        throw new Error(response.error || 'Failed to load stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      
      // Try localStorage fallback
      try {
        const cachedStoriesJSON = localStorage.getItem('specgen-cached-stories');
        if (cachedStoriesJSON) {
          const cachedStories = JSON.parse(cachedStoriesJSON);
          if (cachedStories && cachedStories.length > 0) {
            // Add placeholder content for minimal stories
            const displayStories = cachedStories.map(story => {
              if (story.isMinimal) {
                return {
                  ...story,
                  content: "Content unavailable in offline mode. Please reconnect to view full content.",
                  imageData: null
                };
              }
              return story;
            });
            
            setStories(displayStories);
            setError(null);
            setLoading(false);
            return;
          }
        }
      } catch (cacheErr) {
        console.error('Cache error:', cacheErr);
      }
      
      setError('Failed to load story library. Storage quota may be exceeded.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load stories only once when component mounts
  useEffect(() => {
    if (!storiesLoaded.current) {
      loadStories();
      storiesLoaded.current = true;
    }
  }, [loadStories]);

  // Handle generation with proper parameter handling
  const handleGeneration = useCallback(async (providedParameters = null, yearOverride = null) => {
    if (loading) return null;

    let newStoryId = null;
    setError(null);
    setGeneratedContent(null);
    setLastGeneratedStoryId(null);
    
    // Use the provided year if available, otherwise use state
    const yearToUse = yearOverride !== null ? yearOverride : storyYear;

    // Handle both array and object formats for parameters
    const paramsToUse = providedParameters || selectedParameters;
    let parameterValues = {};

    // Check parameter type and format appropriately
    if (Array.isArray(paramsToUse)) {
      // Format is array of parameter objects - check for missing values
      const missingValueParams = paramsToUse.filter(p => p.value === undefined || p.value === null);
      if (missingValueParams.length > 0) {
        setError(`Please set values for all selected parameters.`);
        return null;
      }
      
      // Format for API
      paramsToUse.forEach(param => {
        if (!parameterValues[param.categoryId]) {
          parameterValues[param.categoryId] = {};
        }
        parameterValues[param.categoryId][param.id] = param.value;
      });
    } else if (typeof paramsToUse === 'object' && paramsToUse !== null) {
      // Format is already the nested object structure
      parameterValues = paramsToUse;
    } else {
      setError('Invalid parameter format');
      return null;
    }

    try {
      setLoading(true);

      // Make API call
      const response = await generateContent(
        parameterValues,
        Object.keys(parameterValues),
        'combined',
        yearToUse,
        null
      );

      if (response.success) {
        if (response.content) {
          setGeneratedContent(response.content);

          // Extract title
          let extractedTitle = "Untitled Story";
          const contentLines = response.content.split('\n');
          for (const line of contentLines) {
            if (line.trim().startsWith('**Title:')) {
              extractedTitle = line.trim().replace(/\*\*/g, '').replace('Title:', '').trim();
              break;
            }
          }
          setStoryTitle(response.title || extractedTitle);
        }

        // Create story object
        const newStory = response.generatedStory || {
          id: `story-${Date.now()}`,
          title: response.title || storyTitle || "Untitled Story",
          createdAt: new Date().toISOString(),
          content: response.content,
          imageData: response.imageData?.startsWith('data:image')
            ? response.imageData
            : response.imageData ? `data:image/png;base64,${response.imageData}` : null,
          parameterValues,
          metadata: response.metadata,
          year: response.year || yearToUse
        };

        newStoryId = newStory.id;
        setLastGeneratedStoryId(newStoryId);
        setActiveStory(newStory);

        // Update stories array with minimal cache
        try {
          const updatedStories = [newStory, ...stories];
          setStories(updatedStories);
          
          // Create minimal version for storage
          const minimalStories = updatedStories.slice(0, 5).map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            year: s.year,
            parameterValues: s.parameterValues,
            isMinimal: true
          }));
          
          localStorage.setItem('specgen-cached-stories', JSON.stringify(minimalStories));
          localStorage.setItem('specgen-cached-timestamp', Date.now().toString());
        } catch (storageError) {
          console.warn('Storage error during cache update:', storageError.message);
        }
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate content');
    } finally {
      setLoading(false);
      setGenerationInProgress(false);
      sessionStorage.removeItem('specgen-auto-generate');
      sessionStorage.removeItem('specgen-generating');
      return newStoryId;
    }
  }, [storyYear, storyTitle, selectedParameters, setGenerationInProgress, loading, stories]);

  // Handle regeneration of a story
  const regenerateStory = useCallback(async (storyToRegenerate) => {
    if (!storyToRegenerate || loading) return null;
    
    try {
      setLoading(true);
      setGenerationInProgress(true); // Set generation in progress to show loading UI
      
      // Use the parameterValues directly - they're already in the right format
      const parameterValues = storyToRegenerate.parameterValues;
      
      // Set year to match original story
      const yearToUse = storyToRegenerate.year || storyYear;
      setStoryYear(yearToUse);
      
      // Store the story ID we're regenerating for navigation after completion
      sessionStorage.setItem('specgen-regenerating-story-id', storyToRegenerate.id);
      
      // Generate with existing parameters
      const response = await generateContent(
        parameterValues,
        Object.keys(parameterValues),
        'combined',
        yearToUse,
        storyToRegenerate.title
      );
      
      if (response.success) {
        // Update story with new content and update title if provided in response
        const updatedStory = {
          ...storyToRegenerate,
          content: response.content,
          // Update title if a new one is provided in the response
          title: response.title || storyToRegenerate.title,
          imageData: response.imageData?.startsWith('data:image')
            ? response.imageData
            : response.imageData ? `data:image/png;base64,${response.imageData}` : null,
          updatedAt: new Date().toISOString()
        };
        
        setActiveStory(updatedStory);
        
        // Update in stories array
        const updatedStories = stories.map(story => 
          story.id === storyToRegenerate.id ? updatedStory : story
        );
        setStories(updatedStories);
        
        // Update cache
        try {
          const minimalStories = updatedStories.slice(0, 5).map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            year: s.year,
            parameterValues: s.parameterValues,
            isMinimal: true
          }));
          
          localStorage.setItem('specgen-cached-stories', JSON.stringify(minimalStories));
          localStorage.setItem('specgen-cached-timestamp', Date.now().toString());
        } catch (storageError) {
          console.warn('Storage error during regeneration:', storageError.message);
        }
        
        return updatedStory.id;
      } else {
        setError(response.error || 'Regeneration failed');
        return null;
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err.message || 'Failed to regenerate content');
      return null;
    } finally {
      setLoading(false);
      setGenerationInProgress(false);
    }
  }, [loading, stories, storyYear, setGenerationInProgress]);

  // Handle auto-generation logic
  useEffect(() => {
    if (window.location.pathname !== '/generating') return;

    const autoGenerate = sessionStorage.getItem('specgen-auto-generate');
    const isGenerating = sessionStorage.getItem('specgen-generating');

    if (autoGenerate === 'true' && !isGenerating && !loading) {
      sessionStorage.setItem('specgen-generating', 'true');

      try {
        const paramsString = sessionStorage.getItem('specgen-parameters');
        if (paramsString) {
          const parsedParams = JSON.parse(paramsString);
          const yearString = sessionStorage.getItem('specgen-story-year');
          const yearToUse = yearString ? parseInt(yearString, 10) : storyYear;
          
          if (yearString) {
            setStoryYear(parseInt(yearString, 10));
          }

          if (parsedParams.length > 0 || (typeof parsedParams === 'object' && Object.keys(parsedParams).length > 0)) {
            setShowRecoveryBanner(true);
            setGenerationInProgress(true);
            
            // We need to delay the generation slightly to allow storyYear state to update
            setTimeout(() => {
              // Pass the year directly to handleGeneration
              handleGeneration(parsedParams, yearToUse);
            }, 50);
          }
        }
      } catch (error) {
        console.error('Auto-generation error:', error);
        sessionStorage.removeItem('specgen-parameters');
        sessionStorage.removeItem('specgen-auto-generate');
        sessionStorage.removeItem('specgen-generating');
        setGenerationInProgress(false);
      }
    }
  }, [handleGeneration, loading, setGenerationInProgress, storyYear]);

  return {
    loading,
    error,
    generatedContent,
    stories,
    setStories,
    activeStory,
    setActiveStory,
    storyTitle,
    storyYear,
    setStoryYear,
    highlightedStoryId,
    showRecoveryBanner,
    lastGeneratedStoryId,
    handleGeneration,
    regenerateStory,
    loadStories
  };
};
