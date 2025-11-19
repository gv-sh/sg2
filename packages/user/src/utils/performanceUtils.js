/**
 * Utility functions for performance optimization
 */

/**
 * Debounce function to limit how often a function can be called
 * Useful for expensive operations like search or filtering
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} - The debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit the rate at which a function can fire
 * Useful for scroll events and other high-frequency events
 * 
 * @param {Function} func - The function to throttle
 * @param {number} limit - The throttle limit in milliseconds
 * @returns {Function} - The throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  
  return function throttledFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Memoize function results for performance
 * Useful for expensive calculations that might be called with the same arguments
 * 
 * @param {Function} func - The function to memoize
 * @returns {Function} - The memoized function
 */
export const memoize = (func) => {
  const cache = new Map();
  
  return function memoizedFunction(...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * Simple cache for API responses
 */
class APICache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  /**
   * Get a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {any} - The cached value or undefined if not in cache
   */
  get(key) {
    // Check if the key exists and hasn't expired
    if (this.cache.has(key)) {
      const { value, expiry } = this.cache.get(key);
      
      if (!expiry || expiry > Date.now()) {
        return value;
      } else {
        // Remove expired entries
        this.cache.delete(key);
      }
    }
    
    return undefined;
  }
  
  /**
   * Set a value in the cache
   * 
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    // If cache is full, remove the oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    // Calculate expiry time if ttl is provided
    const expiry = ttl ? Date.now() + ttl : null;
    
    // Store the value with its expiry time
    this.cache.set(key, { value, expiry });
  }
  
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
}

// Export a singleton instance of the cache
export const apiCache = new APICache();
