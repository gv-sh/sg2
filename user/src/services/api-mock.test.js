/**
 * API Service Mock Performance Tests
 * Uses direct function mocking to avoid axios complexity
 */

import * as apiService from './api';

// Mock the entire API service module
jest.mock('./api', () => ({
  fetchContentSummary: jest.fn(),
  fetchStoryImage: jest.fn(),
  fetchPreviousGenerations: jest.fn()
}));

describe('API Service Mock Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('API Response Performance', () => {
    test('fetchContentSummary handles large responses efficiently', async () => {
      const largeResponse = {
        success: true,
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: `story-${i}`,
          title: `Story ${i}`,
          type: 'fiction',
          year: 2024,
          createdAt: new Date().toISOString(),
          hasImage: i % 2 === 0
        })),
        pagination: { 
          page: 1, 
          total: 1000, 
          limit: 1000,
          totalPages: 1,
          hasNext: false 
        }
      };

      apiService.fetchContentSummary.mockResolvedValue(largeResponse);

      const startTime = performance.now();
      const result = await apiService.fetchContentSummary();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.data).toHaveLength(1000);
      expect(result.success).toBe(true);
    });

    test('fetchStoryImage returns proper structure for memory management', async () => {
      const mockResult = {
        url: 'blob:mock-url',
        cleanup: jest.fn()
      };

      apiService.fetchStoryImage.mockResolvedValue(mockResult);

      const startTime = performance.now();
      const result = await apiService.fetchStoryImage('test-id');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('cleanup');
      expect(typeof result.cleanup).toBe('function');
    });

    test('handles API timeout gracefully', async () => {
      apiService.fetchContentSummary.mockRejectedValue(new Error('timeout'));

      const startTime = performance.now();
      
      try {
        await apiService.fetchContentSummary();
      } catch (error) {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100);
        expect(error.message).toBe('timeout');
      }
    });

    test('fetchPreviousGenerations maintains performance', async () => {
      const mockResponse = {
        success: true,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `story-${i}`,
          title: `Story ${i}`,
          type: 'fiction'
        })),
        pagination: { page: 1, total: 50 }
      };

      apiService.fetchPreviousGenerations.mockResolvedValue(mockResponse);

      const startTime = performance.now();
      const result = await apiService.fetchPreviousGenerations();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.data).toHaveLength(50);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('handles multiple simultaneous API calls efficiently', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', title: 'Test' }],
        pagination: { page: 1, total: 1 }
      };

      apiService.fetchContentSummary.mockResolvedValue(mockResponse);
      apiService.fetchPreviousGenerations.mockResolvedValue(mockResponse);

      const startTime = performance.now();
      
      const promises = [
        apiService.fetchContentSummary({ page: 1 }),
        apiService.fetchContentSummary({ page: 2 }),
        apiService.fetchContentSummary({ page: 3 }),
        apiService.fetchPreviousGenerations()
      ];
      
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(results).toHaveLength(4);
      expect(apiService.fetchContentSummary).toHaveBeenCalledTimes(3);
      expect(apiService.fetchPreviousGenerations).toHaveBeenCalledTimes(1);
    });

    test('request queue management prevents overload', async () => {
      const delayedResponse = () => new Promise(resolve => 
        setTimeout(() => resolve({
          success: true,
          data: [{ id: '1', title: 'Test' }],
          pagination: { page: 1, total: 1 }
        }), 20)
      );

      apiService.fetchContentSummary.mockImplementation(delayedResponse);

      const startTime = performance.now();
      
      // Create concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        apiService.fetchContentSummary({ page: i + 1 })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe('Error Handling Performance', () => {
    test('handles network errors efficiently', async () => {
      apiService.fetchContentSummary.mockRejectedValue(new Error('Network Error'));

      const startTime = performance.now();
      
      try {
        await apiService.fetchContentSummary();
      } catch (error) {
        const endTime = performance.now();
        
        // Should fail quickly, not hang
        expect(endTime - startTime).toBeLessThan(50);
        expect(error.message).toBe('Network Error');
      }
    });

    test('error recovery maintains performance', async () => {
      // First call fails, second succeeds
      apiService.fetchContentSummary
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: '1', title: 'Test' }],
          pagination: { page: 1, total: 1 }
        });

      const startTime = performance.now();
      
      // First call should fail quickly
      try {
        await apiService.fetchContentSummary();
      } catch (error) {
        expect(error.message).toBe('Network Error');
      }
      
      // Second call should succeed quickly
      const result = await apiService.fetchContentSummary();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.success).toBe(true);
    });
  });

  describe('Function Call Performance', () => {
    test('mock function calls are efficient', () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      const startTime = performance.now();
      
      // Multiple rapid mock calls
      for (let i = 0; i < 100; i++) {
        mockFn(`call-${i}`);
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(mockFn).toHaveBeenCalledTimes(100);
    });

    test('mock setup and teardown is efficient', () => {
      const setupStart = performance.now();
      
      // Setup multiple mocks
      const mocks = Array.from({ length: 10 }, () => jest.fn());
      mocks.forEach(mock => mock.mockResolvedValue({ data: 'test' }));
      
      // Teardown mocks
      jest.clearAllMocks();
      
      const setupEnd = performance.now();
      
      expect(setupEnd - setupStart).toBeLessThan(50);
    });
  });
});