// src/pages/LibraryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StoryLibrary from '../components/stories/StoryLibrary';
import LibrarySkeleton from '../components/stories/LibrarySkeleton';
import GenerationControls from '../components/generation/GenerationControls';
import { fetchContentSummary } from '../services/api';

const LibraryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [stories, setStories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [highlightedStoryId, setHighlightedStoryId] = useState(null);

  // Fetch stories on mount
  useEffect(() => {
    loadStories(true);
  }, []);

  // Load stories from API with enhanced caching and progressive loading
  const loadStories = async (isInitial = false, page = 1, options = {}) => {
    if (isInitial) {
      setIsInitialLoad(true);
    }
    
    setLoading(true);
    if (isInitial) {
      setError(null);
    }

    try {
      // Check localStorage for cached data on initial load
      if (isInitial) {
        const cacheKey = 'specgen-stories-summary-cache';
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem('specgen-stories-cache-timestamp');
        const now = Date.now();
        const cacheAge = cachedTimestamp ? now - parseInt(cachedTimestamp, 10) : Infinity;
        const cacheValid = cacheAge < 30 * 60 * 1000; // 30 minutes cache validity

        if (cachedData && cacheValid) {
          try {
            const parsed = JSON.parse(cachedData);
            setStories(parsed.data || []);
            setPagination(parsed.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
            setLoading(false);
            setIsInitialLoad(false);
            return;
          } catch (parseError) {
            console.warn('Failed to parse cached data:', parseError);
          }
        }
      }

      // Fetch from API using new summary endpoint
      const params = {
        page,
        limit: pagination?.limit || 20,
        ...options.filters
      };

      const response = await fetchContentSummary(params);

      if (response.success && response.data) {
        if (page === 1) {
          // Replace stories for first page
          setStories(response.data);
        } else {
          // Append stories for additional pages
          setStories(prev => [...prev, ...response.data]);
        }
        
        setPagination(response.pagination);
        setError(null);

        // Update cache for initial load
        if (isInitial) {
          const cacheData = {
            data: response.data,
            pagination: response.pagination,
            timestamp: Date.now()
          };
          localStorage.setItem('specgen-stories-summary-cache', JSON.stringify(cacheData));
          localStorage.setItem('specgen-stories-cache-timestamp', Date.now().toString());
        }
      } else {
        throw new Error(response.error || 'Failed to load stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);

      // Fallback to cache on initial load only
      if (isInitial) {
        const cachedData = localStorage.getItem('specgen-stories-summary-cache');
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            setStories(parsed.data || []);
            setPagination(parsed.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
            setError('Using cached data. Please check your connection.');
            setLoading(false);
            setIsInitialLoad(false);
            return;
          } catch (parseError) {
            console.error('Failed to parse fallback cache:', parseError);
          }
        }
      }

      setError('Failed to load your story library');
    } finally {
      setLoading(false);
      if (isInitial) {
        setIsInitialLoad(false);
      }
    }
  };

  // Handle navigation to story page
  const handleStorySelect = (story) => {
    if (story && story.id) {
      navigate(`/story?id=${story.id}`);
    }
  };

  // Handle navigation to creation page
  const handleCreateNew = () => {
    navigate('/parameters');
  };

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    loadStories(true);
  }, []);

  // Handle load more (pagination)
  const handleLoadMore = useCallback(() => {
    if (pagination.hasNext && !loading) {
      loadStories(false, pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, loading]);

  // Show skeleton during initial load
  if (isInitialLoad && loading) {
    return (
      <div className="bg-card rounded-md border shadow-sm h-full overflow-auto">
        <GenerationControls
          onBackToLibrary={() => {}}
          storyTitle="Story Library"
        />
        <LibrarySkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md border shadow-sm h-full overflow-auto">
      <GenerationControls
        onBackToLibrary={() => {}}
        storyTitle="Story Library"
      />
      <StoryLibrary
        stories={stories}
        onStorySelect={handleStorySelect}
        onCreateNew={handleCreateNew}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        highlightedStoryId={highlightedStoryId}
        loading={loading}
        isInitialLoad={isInitialLoad}
        error={error}
        pagination={pagination}
      />
    </div>
  );
};

export default LibraryPage;