// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { act } from '@testing-library/react';

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
    // Simulate intersection immediately for testing - use setTimeout to ensure it's async
    setTimeout(() => {
      if (this.observing.has(target)) {
        act(() => {
          this.callback([{
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now()
          }]);
        });
      }
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

// Suppress expected warnings in tests
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('React Router Future Flag Warning') ||
      message.includes('v7_startTransition') ||
      message.includes('v7_relativeSplatPath') ||
      message.includes('Failed to parse cached data') ||
      message.includes('Failed to parse fallback cache')
    )) {
      return; // Suppress expected warnings
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('Error fetching stories')
    )) {
      return; // Suppress expected errors in tests
    }
    originalError.apply(console, args);
  };

  console.log = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('Using API URL')
    )) {
      return; // Suppress API URL logs in tests
    }
    originalLog.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});