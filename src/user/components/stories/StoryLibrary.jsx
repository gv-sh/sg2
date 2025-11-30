// src/components/stories/StoryLibrary.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { PlusCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import StoryCard from './StoryCard';
import StoryFilters from './StoryFilters';
import { EmptyLibrary, NoSearchResults } from './EmptyStates';

const StoryLibrary = ({ 
  stories, 
  onStorySelect, 
  onCreateNew,
  onDeleteStory, 
  onLoadMore,
  onRefresh,
  highlightedStoryId,
  loading,
  isInitialLoad,
  error,
  pagination
}) => {
  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [allYears, setAllYears] = useState([]);
  
  // State for storage notifications
  const [storageNotification, setStorageNotification] = useState(null);
  
  // Handle search filter changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle clearing all filters
  const clearFilters = () => {
    setSearchQuery('');
    setYearFilter('');
  };

  // Handle retry loading
  const handleRetry = () => {
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    }
  };
  
  // Extract years from stories
  useEffect(() => {
    const years = new Set();
    stories?.forEach(story => {
      if (story.year) {
        years.add(parseInt(story.year, 10));
      }
    });
    setAllYears([...years].sort((a, b) => a - b));
  }, [stories]);

  // Listen for storage events
  useEffect(() => {
    const handleStorageQuotaExceeded = (event) => {
      const { removedCount, remainingCount } = event.detail;
      setStorageNotification({
        type: 'warning',
        title: 'Storage Limit Reached',
        message: `Removed ${removedCount} older stories. ${remainingCount} stories remain in your library.`,
        action: 'Consider backing up important stories.'
      });
      
      // Auto-hide notification after 10 seconds
      setTimeout(() => setStorageNotification(null), 10000);
    };

    const handleStorageSaveFailed = (event) => {
      setStorageNotification({
        type: 'error',
        title: 'Failed to Save Story',
        message: 'Unable to save your story due to storage limitations.',
        action: 'Try clearing your browser cache or using a different browser.'
      });
      
      // Auto-hide notification after 15 seconds
      setTimeout(() => setStorageNotification(null), 15000);
    };

    window.addEventListener('storageQuotaExceeded', handleStorageQuotaExceeded);
    window.addEventListener('storageSaveFailed', handleStorageSaveFailed);

    return () => {
      window.removeEventListener('storageQuotaExceeded', handleStorageQuotaExceeded);
      window.removeEventListener('storageSaveFailed', handleStorageSaveFailed);
    };
  }, []);
  
  // Filtered stories based on search and year filter
  const filteredStories = useMemo(() => {
    let filtered = [...(stories || [])];
    
    if (yearFilter) {
      filtered = filtered.filter(story => 
        story.year === parseInt(yearFilter, 10) || 
        story.year?.toString() === yearFilter
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(story => 
        story.title?.toLowerCase().includes(query) || 
        story.content?.toLowerCase().includes(query)
      );
    }
    
    if (sortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    
    return filtered;
  }, [stories, yearFilter, searchQuery, sortOrder]);

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Stories</h1>
          <p className="text-muted-foreground">Collection of your generated speculative fiction</p>
        </div>
        
        <Button 
          onClick={onCreateNew}
          className="flex items-center"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Story
        </Button>
      </div>
      
      {/* Loading indicator for stories */}
      {loading && !stories?.length && (
        <div className="my-8">
          <p className="text-center text-sm text-muted-foreground mb-2">Loading your stories...</p>
          <div className="w-full bg-muted rounded-full h-2 mb-4 mx-auto max-w-md">
            <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}
      
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {storageNotification && (
        <Alert className="mb-6" variant={storageNotification.type === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{storageNotification.title}</div>
              <div className="text-sm mt-1">{storageNotification.message}</div>
              {storageNotification.action && (
                <div className="text-sm text-muted-foreground mt-1">{storageNotification.action}</div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setStorageNotification(null)}
              className="ml-4"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {stories && stories.length > 0 && (
        <StoryFilters
          searchQuery={searchQuery}
          yearFilter={yearFilter}
          sortOrder={sortOrder}
          allYears={allYears}
          onSearchChange={handleSearchChange}
          onYearFilterChange={setYearFilter}
          onSortOrderChange={setSortOrder}
          onClearFilters={clearFilters}
        />
      )}
      
      {!loading && (!stories || stories.length === 0) ? (
        <EmptyLibrary onCreateNew={onCreateNew} />
      ) : !loading && filteredStories.length === 0 ? (
        <NoSearchResults onClearFilters={clearFilters} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <StoryCard 
                key={story.id}
                story={story}
                isHighlighted={highlightedStoryId === story.id}
                onClick={() => onStorySelect(story)}
              />
            ))}
          </div>
          
          {/* Pagination and Load More */}
          {pagination && pagination.total > 0 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              {/* Pagination Info */}
              <div className="text-sm text-muted-foreground">
                Showing {stories.length} of {pagination.total} stories
                {pagination.totalPages > 1 && (
                  <span> (Page {pagination.page} of {pagination.totalPages})</span>
                )}
              </div>
              
              {/* Load More Button */}
              {pagination.hasNext && (
                <Button 
                  onClick={onLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Stories
                      <PlusCircle className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StoryLibrary;