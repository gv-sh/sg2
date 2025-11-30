/**
 * Performance testing utilities for measuring and validating UI performance
 */

/**
 * Performance benchmark thresholds (in milliseconds)
 */
export const PERFORMANCE_BENCHMARKS = {
  INITIAL_RENDER: 100,
  SKELETON_DISPLAY: 50,
  DATA_LOADING: 500,
  SEARCH_FILTERING: 200,
  IMAGE_LAZY_LOADING: 50,
  CACHE_OPERATIONS: 100,
  NAVIGATION: 50,
  USER_INTERACTION: 50,
  ERROR_RECOVERY: 300,
  COMPONENT_CLEANUP: 100,
  PAGINATION: 300,
  LARGE_DATASET: 1000,
  MEMORY_OPERATIONS: 200
};

/**
 * Measures the performance of a synchronous operation
 * @param {string} name - Name of the operation for logging
 * @param {Function} operation - Function to measure
 * @returns {Object} Result with duration and return value
 */
export const measureSyncPerformance = (name, operation) => {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  return {
    name,
    duration,
    result,
    benchmark: getBenchmarkForOperation(name),
    passed: duration < getBenchmarkForOperation(name)
  };
};

/**
 * Measures the performance of an asynchronous operation
 * @param {string} name - Name of the operation for logging
 * @param {Function} operation - Async function to measure
 * @returns {Promise<Object>} Result with duration and return value
 */
export const measureAsyncPerformance = async (name, operation) => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  return {
    name,
    duration,
    result,
    benchmark: getBenchmarkForOperation(name),
    passed: duration < getBenchmarkForOperation(name)
  };
};

/**
 * Creates a performance observer for monitoring specific metrics
 * @param {string} entryType - Type of performance entries to observe
 * @param {Function} callback - Callback for handling entries
 * @returns {PerformanceObserver} Observer instance
 */
export const createPerformanceObserver = (entryType, callback) => {
  if (typeof PerformanceObserver === 'undefined') {
    console.warn('PerformanceObserver not supported');
    return null;
  }

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    callback(entries);
  });

  observer.observe({ entryTypes: [entryType] });
  return observer;
};

/**
 * Measures memory usage if available
 * @returns {Object} Memory usage information
 */
export const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };
  }
  
  return {
    message: 'Memory measurement not available in this environment'
  };
};

/**
 * Measures React component render performance
 * @param {Function} renderFunction - Function that renders the component
 * @returns {Promise<Object>} Render performance metrics
 */
export const measureReactRenderPerformance = async (renderFunction) => {
  const startTime = performance.now();
  
  const renderResult = renderFunction();
  
  // Wait for the next tick to ensure render is complete
  await new Promise(resolve => setTimeout(resolve, 0));
  
  const endTime = performance.now();
  
  return {
    renderTime: endTime - startTime,
    passed: (endTime - startTime) < PERFORMANCE_BENCHMARKS.INITIAL_RENDER,
    renderResult
  };
};

/**
 * Measures cache operation performance
 * @param {string} operation - 'read' or 'write'
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (for write operations)
 * @returns {Object} Cache performance metrics
 */
export const measureCachePerformance = (operation, key, data = null) => {
  const startTime = performance.now();
  
  let result;
  if (operation === 'write') {
    localStorage.setItem(key, JSON.stringify(data));
    result = 'write_success';
  } else if (operation === 'read') {
    result = localStorage.getItem(key);
    if (result) {
      result = JSON.parse(result);
    }
  } else if (operation === 'clear') {
    localStorage.removeItem(key);
    result = 'clear_success';
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  return {
    operation,
    key,
    duration,
    result,
    passed: duration < PERFORMANCE_BENCHMARKS.CACHE_OPERATIONS
  };
};

/**
 * Creates a performance test suite runner
 * @param {Array} tests - Array of test objects with name and function
 * @returns {Promise<Object>} Test results summary
 */
export const runPerformanceTestSuite = async (tests) => {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await measureAsyncPerformance(test.name, test.fn);
      results.push(result);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
        console.warn(`Performance test failed: ${test.name} took ${result.duration}ms (benchmark: ${result.benchmark}ms)`);
      }
    } catch (error) {
      failed++;
      results.push({
        name: test.name,
        error: error.message,
        passed: false
      });
    }
  }

  return {
    total: tests.length,
    passed,
    failed,
    results,
    summary: `${passed}/${tests.length} performance tests passed`
  };
};

/**
 * Validates component performance against benchmarks
 * @param {Object} metrics - Performance metrics to validate
 * @returns {Object} Validation results
 */
export const validatePerformanceBenchmarks = (metrics) => {
  const validations = {};
  
  Object.entries(metrics).forEach(([key, value]) => {
    const benchmark = getBenchmarkForOperation(key);
    validations[key] = {
      value,
      benchmark,
      passed: value < benchmark,
      status: value < benchmark ? 'PASS' : 'FAIL'
    };
  });

  const totalTests = Object.keys(validations).length;
  const passedTests = Object.values(validations).filter(v => v.passed).length;

  return {
    validations,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
    }
  };
};

/**
 * Creates performance markers for detailed timing analysis
 * @param {string} name - Marker name
 * @param {string} type - 'start' or 'end'
 */
export const createPerformanceMarker = (name, type = 'start') => {
  const markerName = `${name}-${type}`;
  
  if (performance.mark) {
    performance.mark(markerName);
  }
  
  return {
    name: markerName,
    timestamp: performance.now()
  };
};

/**
 * Measures time between two performance markers
 * @param {string} startMarker - Start marker name
 * @param {string} endMarker - End marker name
 * @returns {number} Duration in milliseconds
 */
export const measureBetweenMarkers = (startMarker, endMarker) => {
  if (performance.measure && performance.getEntriesByName) {
    try {
      performance.measure('duration', startMarker, endMarker);
      const measures = performance.getEntriesByName('duration');
      return measures[measures.length - 1]?.duration || 0;
    } catch (error) {
      console.warn('Failed to measure between markers:', error);
      return 0;
    }
  }
  
  return 0;
};

/**
 * Gets the benchmark threshold for a specific operation
 * @param {string} operationName - Name of the operation
 * @returns {number} Benchmark threshold in milliseconds
 */
const getBenchmarkForOperation = (operationName) => {
  const upperCaseName = operationName.toUpperCase().replace(/[^A-Z_]/g, '_');
  return PERFORMANCE_BENCHMARKS[upperCaseName] || PERFORMANCE_BENCHMARKS.USER_INTERACTION;
};

/**
 * Simulates heavy load for stress testing
 * @param {number} iterations - Number of iterations to perform
 * @param {Function} operation - Operation to repeat
 * @returns {Object} Load test results
 */
export const simulateHeavyLoad = async (iterations, operation) => {
  const results = [];
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = performance.now();
    await operation(i);
    const iterationEnd = performance.now();
    
    results.push({
      iteration: i,
      duration: iterationEnd - iterationStart
    });
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.duration));
  const minTime = Math.min(...results.map(r => r.duration));
  
  return {
    iterations,
    totalTime,
    averageTime,
    maxTime,
    minTime,
    results,
    summary: `${iterations} iterations completed in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(2)}ms)`
  };
};

/**
 * Memory leak detection helper
 * @param {Function} operation - Operation to test for leaks
 * @param {number} iterations - Number of iterations
 * @returns {Object} Memory analysis results
 */
export const detectMemoryLeaks = async (operation, iterations = 10) => {
  const memorySnapshots = [];
  
  // Take initial snapshot
  memorySnapshots.push(measureMemoryUsage());
  
  for (let i = 0; i < iterations; i++) {
    await operation(i);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    memorySnapshots.push(measureMemoryUsage());
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const initialMemory = memorySnapshots[0].usedJSHeapSize || 0;
  const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreasePercentage = ((memoryIncrease / initialMemory) * 100);
  
  return {
    iterations,
    initialMemory,
    finalMemory,
    memoryIncrease,
    memoryIncreasePercentage: memoryIncreasePercentage.toFixed(2),
    snapshots: memorySnapshots,
    potentialLeak: memoryIncreasePercentage > 20, // Flag if memory increased by more than 20%
    summary: `Memory usage ${memoryIncrease > 0 ? 'increased' : 'decreased'} by ${Math.abs(memoryIncrease)} bytes (${Math.abs(memoryIncreasePercentage).toFixed(2)}%)`
  };
};