import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage component with Intersection Observer for viewport detection
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} props.className - CSS class name
 * @param {string} props.skeletonClassName - CSS class for skeleton placeholder
 * @param {Function} props.onLoad - Callback when image loads
 * @param {Function} props.onError - Callback when image fails to load
 * @param {string} props.fallbackSrc - Fallback image source
 * @param {Object} props.style - Inline styles
 */
const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  skeletonClassName,
  onLoad,
  onError,
  fallbackSrc,
  style = {},
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for viewport detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setCurrentSrc(src);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    // Call onLoad after opacity transition completes
    const imgEl = e.target;
    const handleTransitionEnd = (event) => {
      if (event.propertyName === 'opacity') {
        onLoad?.();
        imgEl.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
    imgEl.addEventListener('transitionend', handleTransitionEnd);
  };

  const handleError = () => {
    if (!isError && fallbackSrc && currentSrc !== fallbackSrc) {
      // Try fallback image
      setCurrentSrc(fallbackSrc);
    } else {
      setIsError(true);
      onError?.();
    }
  };

  // Skeleton placeholder
  const Skeleton = () => (
    <div 
      className={`animate-pulse bg-gray-200 ${skeletonClassName || 'lazy-image-skeleton'}`}
      style={{ ...style }}
      aria-label={alt}
      role="img"
      aria-busy="true"
    />
  );

  // Error placeholder
  const ErrorPlaceholder = () => (
    <div 
      className={`bg-gray-100 flex items-center justify-center ${className}`}
      style={{ ...style }}
    >
      <div className="text-gray-400 text-center p-4">
        <div className="text-2xl mb-2">📷</div>
        <div className="text-sm">Image unavailable</div>
      </div>
    </div>
  );

  return (
    <div ref={imgRef} className="relative">
      {!isVisible || (!isLoaded && !isError) ? (
        <Skeleton />
      ) : isError ? (
        <ErrorPlaceholder />
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={className}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;