import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import LibraryPage from '../pages/LibraryPage';
import * as api from '../services/api';

// Mock API
jest.mock('../services/api');

// Mock router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock components to focus on integration performance
jest.mock('../components/generation/GenerationControls', () => {
  return function MockGenerationControls(props) {
    return <div data-testid="generation-controls">{props.storyTitle}</div>;
  };
});

describe('Progressive Loading Integration Performance Tests', () => {
  const mockStories = Array.from({ length: 50 }, (_, i) => ({
    id: `story-${i}`,
    title: `Story ${i}`,
    type: i % 3 === 0 ? 'fiction' : 'story',
    year: 2024 - (i % 5),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    hasImage: i % 2 === 0
  }));

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 50,
    totalPages: 3,
    hasNext: true,
    hasPrev: false
  };

  const mockApiResponse = {
    success: true,
    data: mockStories.slice(0, 20),
    pagination: mockPagination
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    api.fetchContentSummary.mockResolvedValue(mockApiResponse);
  });

  const renderLibraryPageWithPerformanceMonitoring = async () => {
    const startTime = performance.now();
    
    const result = render(
      <BrowserRouter>
        <LibraryPage />
      </BrowserRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('generation-controls')).toBeInTheDocument();
    });

    const initialRenderTime = performance.now() - startTime;
    
    return { ...result, initialRenderTime };
  };

  describe('End-to-End Loading Performance', () => {
    test('complete loading cycle meets performance benchmarks', async () => {
      const { initialRenderTime } = await renderLibraryPageWithPerformanceMonitoring();

      // Initial render should be fast (skeleton)
      expect(initialRenderTime).toBeLessThan(100);

      const contentLoadStart = performance.now();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      }, { timeout: 1000 });

      const contentLoadTime = performance.now() - contentLoadStart;

      // Content loading should meet benchmark
      expect(contentLoadTime).toBeLessThan(500);

      // Verify all expected stories are loaded
      expect(screen.getByText('Story 0')).toBeInTheDocument();
      expect(screen.getByText('Story 19')).toBeInTheDocument();
    });

    test('progressive loading with cache performance', async () => {
      // First load - populate cache
      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      // Verify cache was populated
      const cachedData = localStorage.getItem('specgen-stories-summary-cache');
      expect(cachedData).toBeTruthy();

      // Second load - from cache
      const { unmount } = screen.debug ? { unmount: jest.fn() } : await renderLibraryPageWithPerformanceMonitoring();
      unmount?.();

      const cacheLoadStart = performance.now();
      
      render(
        <BrowserRouter>
          <LibraryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const cacheLoadTime = performance.now() - cacheLoadStart;

      // Cache loading should be very fast
      expect(cacheLoadTime).toBeLessThan(200);
    });

    test('pagination performance in full user workflow', async () => {
      const page2Response = {
        success: true,
        data: mockStories.slice(20, 40),
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        }
      };

      api.fetchContentSummary
        .mockResolvedValueOnce(mockApiResponse)
        .mockResolvedValueOnce(page2Response);

      await renderLibraryPageWithPerformanceMonitoring();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      // Test pagination performance
      const paginationStart = performance.now();
      
      const loadMoreButton = screen.getByText(/load more/i);
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Story 20')).toBeInTheDocument();
      });

      const paginationTime = performance.now() - paginationStart;

      expect(paginationTime).toBeLessThan(300);
      
      // Verify both pages are loaded
      expect(screen.getByText('Story 0')).toBeInTheDocument();
      expect(screen.getByText('Story 20')).toBeInTheDocument();
    });
  });

  describe('Interaction Performance', () => {
    test('search filtering performance with large dataset', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `story-${i}`,
        title: `Searchable Story ${i}`,
        content: `Content with keyword-${i % 10}`,
        type: 'fiction',
        year: 2024,
        createdAt: new Date().toISOString(),
        hasImage: true
      }));

      const largeResponse = {
        success: true,
        data: largeDataset,
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      api.fetchContentSummary.mockResolvedValue(largeResponse);

      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Searchable Story 0')).toBeInTheDocument();
      });

      // Test search performance
      const searchInput = screen.getByPlaceholderText(/search/i);
      
      const searchStart = performance.now();
      fireEvent.change(searchInput, { target: { value: 'keyword-5' } });
      
      // Wait for filtering to complete
      await waitFor(() => {
        expect(screen.queryByText('Searchable Story 0')).not.toBeInTheDocument();
      });

      const searchTime = performance.now() - searchStart;

      // Search filtering should be fast even with large datasets
      expect(searchTime).toBeLessThan(200);
    });

    test('story card interaction performance', async () => {
      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      // Test story card click performance
      const interactionStart = performance.now();
      
      const firstStoryCard = screen.getByText('Story 0').closest('div');
      fireEvent.click(firstStoryCard);

      const interactionTime = performance.now() - interactionStart;

      expect(interactionTime).toBeLessThan(50);
      expect(mockNavigate).toHaveBeenCalledWith('/story?id=story-0');
    });

    test('create new story button performance', async () => {
      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText(/create new story/i)).toBeInTheDocument();
      });

      const interactionStart = performance.now();
      
      const createButton = screen.getByText(/create new story/i);
      fireEvent.click(createButton);

      const interactionTime = performance.now() - interactionStart;

      expect(interactionTime).toBeLessThan(50);
      expect(mockNavigate).toHaveBeenCalledWith('/parameters');
    });
  });

  describe('Error Recovery Performance', () => {
    test('API failure recovery performance', async () => {
      // Setup cache with fallback data
      const fallbackData = {
        data: mockStories.slice(0, 5),
        pagination: { page: 1, total: 5 },
        timestamp: Date.now()
      };
      localStorage.setItem('specgen-stories-summary-cache', JSON.stringify(fallbackData));

      api.fetchContentSummary.mockRejectedValue(new Error('API Error'));

      const recoveryStart = performance.now();
      
      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const recoveryTime = performance.now() - recoveryStart;

      // Recovery should be fast with cache fallback
      expect(recoveryTime).toBeLessThan(300);
      expect(screen.getByText(/using cached data/i)).toBeInTheDocument();
    });

    test('retry mechanism performance', async () => {
      api.fetchContentSummary
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(mockApiResponse);

      await renderLibraryPageWithPerformanceMonitoring();

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      const retryStart = performance.now();
      
      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const retryTime = performance.now() - retryStart;

      expect(retryTime).toBeLessThan(500);
    });
  });

  describe('Memory Performance', () => {
    test('component re-rendering efficiency', async () => {
      const { rerender } = await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const rerenderStart = performance.now();

      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <BrowserRouter>
            <LibraryPage key={i} />
          </BrowserRouter>
        );
      }

      const rerenderTime = performance.now() - rerenderStart;

      expect(rerenderTime).toBeLessThan(500);
    });

    test('cleanup performance on unmount', async () => {
      const { unmount } = await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const cleanupStart = performance.now();
      
      act(() => {
        unmount();
      });

      const cleanupTime = performance.now() - cleanupStart;

      expect(cleanupTime).toBeLessThan(100);
    });
  });

  describe('Accessibility Performance', () => {
    test('keyboard navigation performance', async () => {
      await renderLibraryPageWithPerformanceMonitoring();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      const keyboardStart = performance.now();

      // Test tab navigation
      const firstInteractiveElement = screen.getByText(/create new story/i);
      firstInteractiveElement.focus();

      // Simulate tab key navigation
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });

      const keyboardTime = performance.now() - keyboardStart;

      expect(keyboardTime).toBeLessThan(50);
    });

    test('screen reader announcements performance', async () => {
      await renderLibraryPageWithPerformanceMonitoring();

      const announcementStart = performance.now();

      await waitFor(() => {
        expect(screen.getByText('Story 0')).toBeInTheDocument();
      });

      // Check aria-live regions are updated efficiently
      const liveRegions = document.querySelectorAll('[aria-live]');
      
      const announcementTime = performance.now() - announcementStart;

      expect(announcementTime).toBeLessThan(100);
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });
});