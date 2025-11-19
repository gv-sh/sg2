// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Intersection Observer for tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.root = options?.root || null;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = options?.thresholds || [0];
    this.observing = new Set();
  }

  observe(target) {
    this.observing.add(target);
    // Simulate immediate intersection for testing
    setTimeout(() => {
      this.callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now()
      }]);
    }, 0);
  }

  unobserve(target) {
    this.observing.delete(target);
  }

  disconnect() {
    this.observing.clear();
  }

  // Helper method for tests to trigger intersection
  triggerIntersection(target, isIntersecting = true) {
    if (this.observing.has(target)) {
      this.callback([{
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: isIntersecting ? target.getBoundingClientRect() : null,
        rootBounds: null,
        time: Date.now()
      }]);
    }
  }
};

// Mock URL.createObjectURL and revokeObjectURL for tests
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock performance API for benchmarking tests
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
  };
}

// Mock localStorage for caching tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

global.localStorage = localStorageMock;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});