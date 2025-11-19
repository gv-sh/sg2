import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import LibraryPage from './LibraryPage';
import * as api from '../services/api';

// Mock the API module
jest.mock('../services/api', () => ({
  fetchContentSummary: jest.fn()
}));

// Mock GenerationControls component
jest.mock('../components/generation/GenerationControls', () => {
  return function MockGenerationControls(props) {
    return <div data-testid="generation-controls">{props.storyTitle}</div>;
  };
});

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Test data
const mockStories = [
  {
    id: '1',
    title: 'Test Story 1',
    type: 'fiction',
    year: 2024,
    createdAt: '2024-01-01T10:00:00Z',
    hasImage: true
  },
  {
    id: '2',
    title: 'Test Story 2',
    type: 'story',
    year: 2023,
    createdAt: '2024-01-02T10:00:00Z',
    hasImage: false
  }
];

const mockPagination = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
};

const mockApiResponse = {
  success: true,
  data: mockStories,
  pagination: mockPagination
};

// Performance measurement utility
const measureRenderTime = async (component) => {
  const startTime = performance.now();
  const result = render(component);
  await waitFor(() => {
    expect(screen.getByTestId('generation-controls')).toBeInTheDocument();
  });
  const endTime = performance.now();
  return { result, duration: endTime - startTime };
};

describe('LibraryPage Progressive Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    api.fetchContentSummary.mockResolvedValue(mockApiResponse);
  });

  const renderLibraryPage = () => {
    return render(
      <BrowserRouter>
        <LibraryPage />
      </BrowserRouter>
    );
  };

  describe('Initial Loading Performance', () => {
    test('shows skeleton UI within 100ms during initial load', async () => {
      const { duration } = await measureRenderTime(
        <BrowserRouter>
          <LibraryPage />
        </BrowserRouter>
      );

      expect(duration).toBeLessThan(100);
      expect(screen.getByTestId('generation-controls')).toBeInTheDocument();
    });

    test('skeleton UI renders before API call completes', () => {
      // Mock a delayed API response
      api.fetchContentSummary.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse), 500))
      );

      renderLibraryPage();

      // Skeleton should be visible immediately
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(screen.queryByText('Test Story 1')).not.toBeInTheDocument();
    });

    test('transitions from skeleton to content smoothly', async () => {
      renderLibraryPage();

      // Initially shows skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      // Skeleton should be gone
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('Cache Performance', () => {
    test('loads from cache within 50ms when available', async () => {
      // Set up cache
      const cacheData = {
        data: mockStories,
        pagination: mockPagination,
        timestamp: Date.now()
      };
      localStorage.setItem('specgen-stories-summary-cache', JSON.stringify(cacheData));
      localStorage.setItem('specgen-stories-cache-timestamp', Date.now().toString());

      const startTime = performance.now();
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(50);
      expect(api.fetchContentSummary).not.toHaveBeenCalled();
    });

    test('falls back to API when cache is expired', async () => {
      // Set up expired cache (older than 30 minutes)
      const expiredTimestamp = Date.now() - (31 * 60 * 1000);
      const cacheData = {
        data: mockStories,
        pagination: mockPagination,
        timestamp: expiredTimestamp
      };
      localStorage.setItem('specgen-stories-summary-cache', JSON.stringify(cacheData));
      localStorage.setItem('specgen-stories-cache-timestamp', expiredTimestamp.toString());

      renderLibraryPage();

      await waitFor(() => {
        expect(api.fetchContentSummary).toHaveBeenCalled();
      });
    });

    test('handles corrupted cache gracefully', async () => {
      // Set up corrupted cache
      localStorage.setItem('specgen-stories-summary-cache', 'invalid-json');
      localStorage.setItem('specgen-stories-cache-timestamp', Date.now().toString());

      renderLibraryPage();

      await waitFor(() => {
        expect(api.fetchContentSummary).toHaveBeenCalled();
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });
    });

    test('updates cache after successful API call', async () => {
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      const cachedData = localStorage.getItem('specgen-stories-summary-cache');
      expect(cachedData).toBeTruthy();
      
      const parsed = JSON.parse(cachedData);
      expect(parsed.data).toEqual(mockStories);
      expect(parsed.pagination).toEqual(mockPagination);
    });
  });

  describe('API Response Performance', () => {
    test('handles API response within 500ms benchmark', async () => {
      const startTime = performance.now();
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Should handle typical response quickly
      expect(responseTime).toBeLessThan(500);
    });

    test('shows error state when API fails', async () => {
      api.fetchContentSummary.mockRejectedValue(new Error('Network error'));

      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    test('retries API call on error', async () => {
      api.fetchContentSummary.mockRejectedValueOnce(new Error('Network error'))
                            .mockResolvedValueOnce(mockApiResponse);

      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      expect(api.fetchContentSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pagination Performance', () => {
    test('load more functionality works efficiently', async () => {
      const page1Response = {
        success: true,
        data: [mockStories[0]],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        }
      };

      const page2Response = {
        success: true,
        data: [mockStories[1]],
        pagination: {
          page: 2,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNext: false,
          hasPrev: true
        }
      };

      api.fetchContentSummary.mockResolvedValueOnce(page1Response)
                            .mockResolvedValueOnce(page2Response);

      renderLibraryPage();

      // Wait for first page
      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      // Load more should be available
      const loadMoreButton = screen.getByText(/load more/i);
      expect(loadMoreButton).toBeInTheDocument();

      const startTime = performance.now();
      fireEvent.click(loadMoreButton);

      // Wait for second page
      await waitFor(() => {
        expect(screen.getByText('Test Story 2')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadMoreTime = endTime - startTime;

      expect(loadMoreTime).toBeLessThan(300);
      expect(api.fetchContentSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Navigation Performance', () => {
    test('story selection navigates efficiently', async () => {
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      const startTime = performance.now();
      const storyCard = screen.getByText('Test Story 1').closest('[role="button"], .cursor-pointer, [onclick]') || 
                       screen.getByText('Test Story 1').closest('div');
      
      fireEvent.click(storyCard);

      const endTime = performance.now();
      const navigationTime = endTime - startTime;

      expect(navigationTime).toBeLessThan(50);
      expect(mockNavigate).toHaveBeenCalledWith('/story?id=1');
    });

    test('create new story navigation is immediate', async () => {
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText(/create new story/i)).toBeInTheDocument();
      });

      const startTime = performance.now();
      const createButton = screen.getByText(/create new story/i);
      fireEvent.click(createButton);

      const endTime = performance.now();
      const navigationTime = endTime - startTime;

      expect(navigationTime).toBeLessThan(50);
      expect(mockNavigate).toHaveBeenCalledWith('/parameters');
    });
  });

  describe('Memory Management', () => {
    test('properly cleans up on unmount', async () => {
      const { unmount } = renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test('handles rapid component updates efficiently', async () => {
      const { rerender } = renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Simulate rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(
          <BrowserRouter>
            <LibraryPage key={i} />
          </BrowserRouter>
        );
      }

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      expect(rerenderTime).toBeLessThan(200);
    });
  });

  describe('Large Dataset Performance', () => {
    test('handles 100+ stories efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `story-${i}`,
        title: `Story ${i}`,
        type: 'fiction',
        year: 2024,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        hasImage: i % 2 === 0
      }));

      const largeResponse = {
        success: true,
        data: largeDataset,
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      api.fetchContentSummary.mockResolvedValue(largeResponse);

      const startTime = performance.now();
      renderLibraryPage();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large datasets reasonably
      expect(renderTime).toBeLessThan(1000);
    });
  });
});