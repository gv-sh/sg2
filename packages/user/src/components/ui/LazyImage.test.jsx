import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyImage from './LazyImage';

// Performance testing utilities
const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
};

describe('LazyImage Component', () => {
  const mockSrc = 'https://example.com/test-image.jpg';
  const mockAlt = 'Test image';
  const mockFallbackSrc = 'https://example.com/fallback.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('renders skeleton initially before intersection', () => {
      render(<LazyImage src={mockSrc} alt={mockAlt} />);
      
      // Should show skeleton, not actual image
      expect(screen.queryByAltText(mockAlt)).not.toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    test('loads image after intersection observer triggers', async () => {
      const onLoad = jest.fn();
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          onLoad={onLoad}
        />
      );

      // Wait for intersection observer to trigger
      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      // Simulate image load
      const img = screen.getByAltText(mockAlt);
      act(() => {
        img.dispatchEvent(new Event('load'));
      });

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled();
      });
    });

    test('handles image loading errors with fallback', async () => {
      const onError = jest.fn();
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          fallbackSrc={mockFallbackSrc}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      
      // Simulate image error
      act(() => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(img.src).toBe(mockFallbackSrc);
      });
    });

    test('shows error state when both main and fallback images fail', async () => {
      const onError = jest.fn();
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          fallbackSrc={mockFallbackSrc}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      
      // Simulate first error (should try fallback)
      act(() => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(img.src).toBe(mockFallbackSrc);
      });

      // Simulate fallback error
      act(() => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    test('skeleton renders within 100ms', () => {
      const { duration } = measurePerformance('skeleton-render', () => {
        return render(<LazyImage src={mockSrc} alt={mockAlt} />);
      });

      expect(duration).toBeLessThan(100);
    });

    test('intersection observer setup is efficient', () => {
      const { duration } = measurePerformance('intersection-setup', () => {
        return render(<LazyImage src={mockSrc} alt={mockAlt} />);
      });

      // Should be very fast to set up
      expect(duration).toBeLessThan(50);
    });

    test('image transition completes smoothly', async () => {
      const onLoad = jest.fn();
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          onLoad={onLoad}
        />
      );

      const startTime = performance.now();

      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      
      // Simulate image load
      act(() => {
        img.dispatchEvent(new Event('load'));
      });

      // Simulate transition end
      act(() => {
        img.dispatchEvent(new Event('transitionend', { 
          bubbles: true,
          propertyName: 'opacity'
        }));
      });

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Complete loading cycle should be reasonable
      expect(totalTime).toBeLessThan(1000);
    });

    test('handles multiple rapid re-renders efficiently', () => {
      const { rerender } = render(<LazyImage src={mockSrc} alt={mockAlt} />);

      const { duration } = measurePerformance('multiple-rerenders', () => {
        for (let i = 0; i < 10; i++) {
          rerender(<LazyImage src={`${mockSrc}?v=${i}`} alt={mockAlt} />);
        }
      });

      // Multiple re-renders should still be fast
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory Management', () => {
    test('properly cleans up intersection observer on unmount', () => {
      const { unmount } = render(<LazyImage src={mockSrc} alt={mockAlt} />);
      
      const observerInstance = document.querySelector('img')?.intersectionObserver;
      const disconnectSpy = jest.spyOn(IntersectionObserver.prototype, 'disconnect');
      
      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    test('removes event listeners on cleanup', async () => {
      const { unmount } = render(<LazyImage src={mockSrc} alt={mockAlt} />);

      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      const removeEventListenerSpy = jest.spyOn(img, 'removeEventListener');

      // Simulate load with transition
      act(() => {
        img.dispatchEvent(new Event('load'));
        img.dispatchEvent(new Event('transitionend', { 
          bubbles: true,
          propertyName: 'opacity'
        }));
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'transitionend', 
        expect.any(Function)
      );
    });
  });

  describe('Accessibility', () => {
    test('maintains proper alt text throughout loading states', async () => {
      render(<LazyImage src={mockSrc} alt={mockAlt} />);

      // During skeleton phase
      const skeletonDiv = document.querySelector('.animate-pulse');
      expect(skeletonDiv).toHaveAttribute('aria-label', mockAlt);

      // After intersection
      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      expect(img).toHaveAttribute('alt', mockAlt);
    });

    test('provides loading state for screen readers', () => {
      render(<LazyImage src={mockSrc} alt={mockAlt} />);

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toHaveAttribute('role', 'img');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Custom Styling', () => {
    test('applies custom className to image', async () => {
      const customClass = 'custom-image-class';
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          className={customClass}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
      });

      const img = screen.getByAltText(mockAlt);
      expect(img).toHaveClass(customClass);
    });

    test('applies custom skeleton className', () => {
      const skeletonClass = 'custom-skeleton-class';
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          skeletonClassName={skeletonClass}
        />
      );

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass(skeletonClass);
    });

    test('forwards additional props to image element', async () => {
      const dataTestId = 'test-image';
      render(
        <LazyImage 
          src={mockSrc} 
          alt={mockAlt} 
          data-testid={dataTestId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(dataTestId)).toBeInTheDocument();
      });
    });
  });
});