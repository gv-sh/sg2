// src/services/api.js
import axios from 'axios';
import config from '../config';
import { apiCache } from '../utils/performanceUtils';

// Use environment variable for API URL with fallback to config
const API_BASE_URL = `${config.API_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetches all categories from the API
 * @returns {Promise<Object>} Promise resolving to response data
 */
export const fetchCategories = async () => {
  try {
    // Check if we have a cached version first
    const cacheKey = 'categories';
    const cachedData = apiCache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, make the API call
    const response = await api.get('/categories');

    // Cache the response (valid for 5 minutes)
    apiCache.set(cacheKey, response.data, 5 * 60 * 1000);

    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Fetches parameters for a specific category
 * @param {string} categoryId - ID of the category to fetch parameters for
 * @returns {Promise<Object>} Promise resolving to response data
 */
export const fetchParameters = async (categoryId) => {
  try {
    // Check if we have a cached version first
    const cacheKey = `parameters_${categoryId}`;
    const cachedData = apiCache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, make the API call
    const response = await api.get(`/parameters?categoryId=${categoryId}`);

    // Cache the response (valid for 5 minutes)
    apiCache.set(cacheKey, response.data, 5 * 60 * 1000);

    return response.data;
  } catch (error) {
    console.error(`Error fetching parameters for category ${categoryId}:`, error);
    throw error;
  }
};

/**
 * Generate content based on selected parameters
 * @param {Object} parameterValues - Object with category IDs and their parameter values
 * @param {Array} categoryIds - Array of selected category IDs
 * @param {string} contentType - Type of content to generate ('fiction', 'image', or 'combined')
 * @returns {Promise<Object>} Generated content response
 */
export const generateContent = async (parameterValues, categoryIds, contentType = 'combined', year = null, title = null) => {
  try {
    // Create a unique ID for the generation request
    const requestId = `request-${Date.now()}`;

    // Validate inputs
    if (!parameterValues || Object.keys(parameterValues).length === 0) {
      return {
        success: false,
        error: 'No parameters provided for generation'
      };
    }

    const payload = {
      parameterValues,
      contentType
    };

    // Add year to payload if provided
    if (year) {
      payload.year = parseInt(year, 10);
    }

    // Add title to payload if provided
    if (title) {
      payload.title = title;
    }

    // Make the API call
    const response = await api.post('/generate', payload);
    
    // Create story object
    const newStory = {
      id: requestId,
      title: response.data.title || title || "Untitled Story",
      createdAt: new Date().toISOString(),
      content: response.data.content,
      imageData: response.data.imageData ? `data:image/png;base64,${response.data.imageData}` : null,
      parameterValues,
      metadata: response.data.metadata,
      year: response.data.year || year || null
    };

    // Save to local storage if needed
    saveToGenerationHistory(newStory);
        
    return {
      ...response.data,
      success: true,
      generatedStory: newStory
    };
  } catch (error) {
    console.error('Content generation error:', error);
    
    // Handle errors appropriately
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || `Server error: ${error.response.status}`
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'No response from server. Please check your connection.'
      };
    } else {
      return {
        success: false,
        error: error.message || 'Failed to generate content. Please try again.'
      };
    }
  }
};

/**
 * Save generation to local storage history
 * @param {Object} generation - Generation data to save
 */
const saveToGenerationHistory = (generation) => {
  try {
    // Get existing history
    const historyJSON = localStorage.getItem('specgen-history');
    let history = historyJSON ? JSON.parse(historyJSON) : [];

    // Add new generation at the beginning
    history = [generation, ...history];

    // Limit to 50 stories to prevent excessive clearing
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    // Remove imageData to save space
    history = history.map(story => ({
      ...story,
      // Only store a reference to image, not the full base64 data
      imageData: story.imageData ? 'stored-externally' : null
    }));

    // Try to save, but catch quota errors
    try {
      localStorage.setItem('specgen-history', JSON.stringify(history));
    } catch (storageError) {
      if (storageError.name === 'QuotaExceededError') {
        // Clear older items and try again with fewer items
        localStorage.removeItem('specgen-cached-stories');
        const originalLength = history.length;
        history = history.slice(0, 25); // Keep 25 instead of 5
        
        try {
          localStorage.setItem('specgen-history', JSON.stringify(history));
          console.warn(`Storage quota exceeded. Reduced story library from ${originalLength} to ${history.length} stories.`);
          
          // Emit a custom event to notify UI components
          window.dispatchEvent(new CustomEvent('storageQuotaExceeded', {
            detail: { 
              removedCount: originalLength - history.length,
              remainingCount: history.length 
            }
          }));
        } catch (retryError) {
          console.error('Failed to save stories even after reducing size:', retryError);
          // Emit error event for UI to handle
          window.dispatchEvent(new CustomEvent('storageSaveFailed', {
            detail: { error: retryError.message }
          }));
        }
      }
    }
  } catch (error) {
    console.error('Error saving to generation history:', error);
  }
};

/**
 * Fetch content summary without images for fast loading
 * @param {Object} params - Query parameters (page, limit, type, year, etc.)
 * @returns {Promise<Object>} Promise resolving to content summaries with pagination
 */
export const fetchContentSummary = async (params = {}) => {
  try {
    const cacheKey = `content-summary-${JSON.stringify(params)}`;
    const cachedData = apiCache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await api.get('/content/summary', { params });

    // Cache the response (valid for 10 minutes for summaries)
    apiCache.set(cacheKey, response.data, 10 * 60 * 1000);

    return response.data;
  } catch (error) {
    console.error('Error fetching content summary:', error);
    throw error;
  }
};

/**
 * Fetch image for a specific story
 * @param {string} storyId - Story ID
 * @returns {Promise<{url: string, cleanup: function}>} - Object with image URL and cleanup function
 */
export const fetchStoryImage = async (storyId) => {
  try {
    const response = await api.get(`/content/${storyId}/image`, {
      responseType: 'blob'
    });
    
    // Convert blob to object URL for efficient memory usage
    const url = URL.createObjectURL(response.data);
    
    // Return URL with cleanup function to prevent memory leaks
    return {
      url,
      cleanup: () => URL.revokeObjectURL(url)
    };
  } catch (error) {
    console.error(`Error fetching image for story ${storyId}:`, error);
    throw error;
  }
};

/**
 * Fetch previous generations from history (legacy function - now uses summary endpoint)
 * @param {Object} filters - Optional filters for stories
 * @returns {Promise<Object>} Promise resolving to previous generations
 */
export const fetchPreviousGenerations = async (filters = {}) => {
  try {
    // Convert old filter format to new API parameters
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 20
    };

    if (filters.year) {
      params.year = parseInt(filters.year, 10);
    }

    if (filters.type) {
      params.type = filters.type;
    }

    // Use the new summary endpoint for better performance
    const response = await fetchContentSummary(params);

    if (response && response.success) {
      let stories = response.data || [];

      // Apply client-side search filter if provided (server doesn't support search yet)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        stories = stories.filter(item =>
          (item.title && item.title.toLowerCase().includes(searchTerm))
        );
      }

      // Sort by created date (newest first by default)
      if (filters.sort === 'oldest') {
        stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else {
        stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      return {
        success: true,
        data: stories,
        pagination: response.pagination
      };
    }

    // Fallback to local storage if API fails or returns no data
    return fallbackToLocalStorage(filters);
  } catch (error) {
    console.error('Error fetching stories from API:', error);
    // Fallback to localStorage if API fails
    return fallbackToLocalStorage(filters);
  }
};

// Fallback function for backward compatibility
const fallbackToLocalStorage = (filters = {}) => {
  try {
    const historyJSON = localStorage.getItem('specgen-history');
    const history = historyJSON ? JSON.parse(historyJSON) : [];

    // Process the data to ensure all fields are present
    const processedHistory = history.map(item => ({
      id: item.id || `gen-${Date.now() + Math.random()}`,
      title: item.title || generateTitle(item.content),
      content: item.content || '',
      imageData: normalizeImageData(item.imageData),
      createdAt: item.timestamp || item.createdAt || new Date().toISOString(),
      year: item.year || null,
      parameterValues: item.parameterValues || {},
      metadata: item.metadata || {}
    }));

    // Apply filters
    let filteredHistory = [...processedHistory];

    // Apply the same filters as in the main function
    if (filters.year) {
      filteredHistory = filteredHistory.filter(item =>
        item.year === parseInt(filters.year, 10)
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredHistory = filteredHistory.filter(item =>
        (item.title && item.title.toLowerCase().includes(searchTerm)) ||
        (item.content && item.content.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.sort === 'oldest') {
      filteredHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      filteredHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return {
      success: true,
      data: filteredHistory
    };
  } catch (error) {
    console.error('Error in localStorage fallback:', error);
    return {
      success: false,
      error: 'Failed to fetch stories',
      data: []
    };
  }
};

/**
 * Normalize image data to ensure consistent format
 * @param {string} imageData - Raw or formatted image data
 * @returns {string} Properly formatted image data
 */
const normalizeImageData = (imageData) => {
  if (!imageData) return null;

  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image')) {
      return imageData;
    } else {
      return `data:image/png;base64,${imageData}`;
    }
  }

  return null;
};

/**
 * Generate a title from content
 * @param {string} content - Generated content
 * @returns {string} Generated title
 */
const generateTitle = (content) => {
  if (!content) return 'Untitled Story';

  // Look for **Title:** in the content
  if (content.includes('**Title:')) {
    const titleMatch = content.match(/\*\*Title:(.*?)\*\*/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
  }

  // Take first sentence or first 40 characters
  const firstSentence = content.split(/[.!?]|\n/)[0].trim();
  if (firstSentence.length <= 40) {
    return firstSentence;
  }

  return firstSentence.substring(0, 37) + '...';
};

// Alias for backward compatibility
export const generateFiction = generateContent;

export default api;