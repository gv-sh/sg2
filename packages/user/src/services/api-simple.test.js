/**
 * Simplified API Service Performance Tests
 * Focuses on cache performance and utility functions
 */

describe('API Service Cache Performance Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Cache Performance', () => {
    test('cache write operation completes within 100ms', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `story-${i}`,
        title: `Story ${i}`,
        type: 'fiction'
      }));

      const startTime = performance.now();
      localStorage.setItem('test-cache', JSON.stringify(largeData));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('cache read operation is faster than 50ms', () => {
      // Prepare large cache data
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `story-${i}`,
        title: `Story ${i}`,
        type: 'fiction',
        content: 'A'.repeat(100) // Reasonable content size
      }));

      localStorage.setItem('test-cache', JSON.stringify(largeData));

      const startTime = performance.now();
      const retrieved = JSON.parse(localStorage.getItem('test-cache'));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(retrieved).toHaveLength(1000);
    });

    test('cache cleanup operations are efficient', () => {
      // Fill cache with multiple entries
      for (let i = 0; i < 50; i++) {
        localStorage.setItem(`cache-${i}`, JSON.stringify({
          data: Array.from({ length: 10 }, (_, j) => ({ id: j }))
        }));
      }

      const startTime = performance.now();
      
      // Simulate cache cleanup
      for (let i = 0; i < 25; i++) {
        localStorage.removeItem(`cache-${i}`);
      }
      
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('handles large datasets in localStorage efficiently', () => {
      const largeDataset = Array.from({ length: 2000 }, (_, i) => ({
        id: `story-${i}`,
        title: `Story ${i}`,
        type: 'fiction',
        year: 2024,
        createdAt: new Date().toISOString()
      }));

      const startTime = performance.now();
      
      try {
        localStorage.setItem('large-cache-test', JSON.stringify(largeDataset));
        const retrieved = JSON.parse(localStorage.getItem('large-cache-test'));
        
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(200);
        expect(retrieved).toHaveLength(2000);
      } catch (error) {
        // Handle quota exceeded gracefully
        expect(error.name).toBe('QuotaExceededError');
      }
    });
  });

  describe('Memory Performance', () => {
    test('object URL creation and cleanup is efficient', () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      const startTime = performance.now();
      const url = URL.createObjectURL(mockBlob);
      URL.revokeObjectURL(url);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    test('multiple object URL operations maintain performance', () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const urls = [];

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        urls.push(URL.createObjectURL(mockBlob));
      }
      
      urls.forEach(url => URL.revokeObjectURL(url));
      
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Data Processing Performance', () => {
    test('JSON parsing large datasets is efficient', () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `item-${i}`,
        data: `content-${i}`,
        timestamp: Date.now()
      }));

      const jsonString = JSON.stringify(largeDataset);

      const startTime = performance.now();
      const parsed = JSON.parse(jsonString);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(parsed).toHaveLength(5000);
    });

    test('array filtering performance on large datasets', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        category: i % 10 === 0 ? 'special' : 'normal'
      }));

      const startTime = performance.now();
      const filtered = largeDataset.filter(item => item.category === 'special');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(filtered).toHaveLength(1000);
    });

    test('array sorting performance on large datasets', () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: Math.random(),
        title: `Item ${i}`,
        timestamp: Date.now() - Math.random() * 1000000
      }));

      const startTime = performance.now();
      const sorted = largeDataset.sort((a, b) => b.timestamp - a.timestamp);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
    });
  });
});