// src/components/TourHighlight.jsx
import React, { useState, useEffect } from 'react';

const TourHighlight = ({ target, isVisible, type = 'circle' }) => {
  const [position, setPosition] = useState(null);
  const [elementFound, setElementFound] = useState(false);

  useEffect(() => {
    if (!target || !isVisible) {
      setElementFound(false);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        setPosition({
          top: rect.top + scrollTop + rect.height / 2,
          left: rect.left + scrollLeft + rect.width / 2,
          width: rect.width,
          height: rect.height
        });
        setElementFound(true);
      } else {
        setElementFound(false);
      }
    };

    // Initial find
    findElement();

    // Re-find on resize or scroll
    const handleResize = () => findElement();
    const handleScroll = () => findElement();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [target, isVisible]);

  if (!isVisible || !elementFound || !position) {
    return null;
  }

  return (
    <>
      <style>{`
        .tour-center {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 2px solid rgba(255, 255, 255, 0.8);
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        
        .tour-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: hsl(var(--primary) / 0.7);
          border: 2px solid hsl(var(--primary-foreground) / 0.8);
          transform: translate(-50%, -50%) scale(0.2);
          will-change: transform, opacity;
          animation: smooth-ripple 3s ease-out infinite;
        }
        
        .tour-ripple-1 {
          animation-delay: 0s;
        }
        
        .tour-ripple-2 {
          animation-delay: 1.5s;
        }
        
        @keyframes smooth-ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
      
      <div className="tour-highlight-container" style={{ zIndex: 10000 }}>
        {/* Main highlight circle */}
        <div
          className="tour-highlight"
          style={{
            position: 'absolute',
            top: position.top - 12,
            left: position.left - 12,
            width: 24,
            height: 24,
            pointerEvents: 'none'
          }}
        >
          {/* Solid center beacon point */}
          <div className="tour-center" />
          {/* Smooth expanding ripples */}
          <div className="tour-ripple tour-ripple-1" />
          <div className="tour-ripple tour-ripple-2" />
        </div>
      </div>
    </>
  );
};

export default TourHighlight;