# Performance Testing Suite

This directory contains comprehensive performance tests for the progressive loading and lazy image functionality implemented in the SpecGen user interface.

## Overview

The performance testing suite validates that the UI meets established performance benchmarks across different scenarios and use cases. These tests ensure that the progressive loading features deliver optimal user experience without introducing performance regressions.

## Test Structure

### 1. Component Performance Tests

#### LazyImage Component (`src/components/ui/LazyImage.test.jsx`)
Tests the performance of the lazy loading image component:

- **Basic Functionality**: Intersection observer setup, image loading, error handling
- **Performance Benchmarks**: 
  - Skeleton render: < 100ms
  - Intersection setup: < 50ms
  - Image transition: < 1000ms total cycle
  - Multiple re-renders: < 200ms for 10 iterations
- **Memory Management**: Proper cleanup of observers and event listeners
- **Accessibility**: Screen reader compatibility and keyboard navigation

#### LibraryPage Component (`src/pages/LibraryPage.test.jsx`)
Tests the performance of the story library with progressive loading:

- **Initial Loading**: Skeleton UI display within 100ms
- **Cache Performance**: Cache reads < 50ms, API fallback when expired
- **API Response**: Response handling within 500ms benchmark
- **Pagination**: Load more functionality < 300ms
- **Navigation**: Story selection and creation < 50ms
- **Large Datasets**: Handle 100+ stories efficiently (< 1000ms)

### 2. Service Performance Tests

#### API Service (`src/services/api-simple.test.js` & `src/services/api-mock.test.js`)
Tests the performance of API calls and caching:

- **Cache Operations**: localStorage read/write operations < 100ms  
- **Memory Management**: Object URL creation/cleanup for images
- **Mock Performance**: Function mocking and setup efficiency
- **Concurrent Requests**: Multiple simultaneous calls < 200ms
- **Error Handling**: Timeout and network error recovery
- **Large Responses**: Processing 1000+ records < 100ms

### 3. Integration Performance Tests

#### End-to-End Performance (`src/__tests__/performance-integration.test.jsx`)
Comprehensive integration tests covering complete user workflows:

- **Complete Loading Cycle**: Initial render to content display
- **Cache Integration**: First load vs. cached load performance
- **User Interactions**: Search, pagination, navigation
- **Error Recovery**: API failures with cache fallback
- **Memory Performance**: Component lifecycle and cleanup
- **Accessibility**: Keyboard navigation and screen reader performance

## Performance Benchmarks

The following benchmarks are established for optimal user experience:

|Operation | Benchmark | Test Coverage |
|-----------|-----------|---------------|
| Initial render | < 100ms | ✅ All components |
| Skeleton display | < 50ms | ✅ LazyImage, LibraryPage |
| Data loading | < 500ms | ✅ API responses |
| Search filtering | < 200ms | ✅ Large datasets |
| Image lazy loading | < 50ms | ✅ Intersection detection |
| Cache operations | < 100ms | ✅ Read/write/cleanup |
| Navigation | < 50ms | ✅ Route changes |
| User interaction | < 50ms | ✅ Clicks, inputs |
| Error recovery | < 300ms | ✅ Cache fallback |
| Component cleanup | < 100ms | ✅ Memory management |
| Pagination | < 300ms | ✅ Load more |
| Large datasets | < 1000ms | ✅ 1000+ items |

## Utilities

### Performance Test Utils (`src/utils/performance-test-utils.js`)
Comprehensive utilities for performance measurement and validation:

- **Measurement Functions**: Sync and async operation timing
- **Cache Testing**: localStorage performance validation
- **Memory Analysis**: Memory usage and leak detection
- **Benchmark Validation**: Automated performance threshold checking
- **Load Testing**: Heavy load simulation and stress testing
- **Performance Markers**: Detailed timing analysis with markers

## Running Tests

### Individual Test Suites
```bash
# Run LazyImage performance tests
npm test LazyImage.test.jsx

# Run LibraryPage performance tests
npm test LibraryPage.test.jsx

# Run API service cache performance tests
npm test api-simple.test.js

# Run API service mock performance tests
npm test api-mock.test.js

# Run integration performance tests
npm test performance-integration.test.jsx
```

### Complete Performance Suite
```bash
# Run all performance tests
npm test -- --testNamePattern="performance|Performance"

# Run with coverage
npm test -- --coverage --testNamePattern="performance|Performance"

# Run in watch mode for development
npm test -- --watch --testNamePattern="performance|Performance"
```

### Performance Benchmarking
```bash
# Run tests with detailed performance output
npm test -- --verbose --testNamePattern="performance|Performance"
```

## Interpreting Results

### Success Criteria
- ✅ **PASS**: All operations complete within benchmark thresholds
- ✅ **Memory**: No significant memory leaks detected
- ✅ **Accessibility**: Screen reader and keyboard navigation maintain performance
- ✅ **Error Recovery**: Graceful degradation maintains usability

### Failure Investigation
When tests fail, check:

1. **Performance Regressions**: Compare timing against benchmarks
2. **Memory Leaks**: Review cleanup in component unmount
3. **Cache Issues**: Verify localStorage operations
4. **API Changes**: Ensure response format compatibility
5. **Browser Environment**: Consider test environment limitations

## Continuous Integration

### Performance Monitoring
These tests are designed to be integrated into CI/CD pipelines to:

- **Prevent Regressions**: Catch performance issues before deployment
- **Validate Optimizations**: Confirm performance improvements
- **Monitor Trends**: Track performance metrics over time
- **Environment Testing**: Validate across different browser environments

### CI Configuration
```yaml
# Example GitHub Actions configuration
- name: Run Performance Tests
  run: |
    npm test -- --testNamePattern="performance|Performance" --passWithNoTests
    npm run test:performance:report
```

## Browser Compatibility

Tests are designed to work across modern browsers with appropriate polyfills for:

- **Intersection Observer**: Polyfilled for older browsers
- **Performance API**: Graceful degradation when unavailable
- **LocalStorage**: Alternative storage strategies when limited
- **Object URLs**: Memory management across browser implementations

## Best Practices

### Writing Performance Tests
1. **Isolate Operations**: Test specific functionality in isolation
2. **Use Realistic Data**: Test with representative data sizes
3. **Mock External Dependencies**: Control API response timing
4. **Measure Multiple Runs**: Account for variance in timing
5. **Clean Up Resources**: Prevent test interference

### Maintaining Tests
1. **Update Benchmarks**: Adjust thresholds as features evolve
2. **Review Regularly**: Ensure tests remain relevant
3. **Monitor Trends**: Track performance changes over time
4. **Document Changes**: Explain benchmark adjustments

## Troubleshooting

### Common Issues

#### Tests Timing Out
- Increase timeout values for complex operations
- Check for async operations that aren't properly awaited
- Verify mock implementations aren't causing delays

#### Inconsistent Results
- Account for browser environment differences
- Use performance markers for more precise timing
- Consider test isolation and cleanup

#### Memory Test Failures
- Ensure proper component unmounting
- Verify event listener cleanup
- Check for retained references in closures

### Performance Optimization Tips
1. **Lazy Loading**: Implement intersection observer efficiently
2. **Caching Strategy**: Balance cache size with performance
3. **Component Architecture**: Minimize unnecessary re-renders
4. **Memory Management**: Clean up resources promptly
5. **Error Boundaries**: Prevent performance impact from errors

## Contributing

When adding new performance tests:

1. Follow existing test patterns and naming conventions
2. Include appropriate benchmarks and validation
3. Document test purpose and success criteria
4. Consider edge cases and error scenarios
5. Ensure tests are deterministic and reliable

For questions or improvements to the performance testing suite, please refer to the project's contribution guidelines.