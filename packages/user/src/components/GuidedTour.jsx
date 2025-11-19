// src/components/GuidedTour.jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, X, BookOpen, Sparkles, Dices, ZoomIn, Settings2, Layers, Boxes } from 'lucide-react';

const GuidedTour = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Update screen size state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Define tour steps with icons
  const steps = [
    {
      title: "Welcome",
      content: "A space where your choices shape the future. Select world building parameters and the AI will weave them into a speculative story inspired by the world you imagine.",
      position: "center",
      icon: <Sparkles className="h-4 w-4 text-primary" />
    },
    {
      title: "Browse Categories",
      content: "Start by selecting a category from the left panel. Each category contains unique parameters to build your story.",
      position: "left",
      icon: <BookOpen className="h-4 w-4 text-primary" />
    },
    {
      title: "Explore Parameters",
      content: "After choosing a category, explore through the parameters in the middle panel and add the ones you'd like to incorporate into your story.",
      position: "center-left",
      icon: <Layers className="h-4 w-4 text-primary" />
    },
    {
      title: "Multiple Categories",
      content: "You can select parameters from multiple different categories. Simply click on another category to explore its parameters.",
      position: "left",
      icon: <Boxes className="h-4 w-4 text-primary" />
    },
    {
      title: "Configure Parameters",
      content: "Adjust your selected parameters in the right panel to fine-tune how your story will be crafted.",
      position: "center-right",
      icon: <Settings2 className="h-4 w-4 text-primary" />
    },
    {
      title: "Randomize Options",
      content: "Can't decide? Use the randomize buttons to quickly generate parameter values.",
      position: "right",
      icon: <Dices className="h-4 w-4 text-primary" />
    },
    {
      title: "Generate Content",
      content: "Choose the year you want your story to take place in, then click Generate to create a story and visual based on your selected parameters.",
      position: "center",
      icon: <ZoomIn className="h-4 w-4 text-primary" />
    }
  ];
  
  // Reset state when opened
  useEffect(() => {
    setCurrentStep(0);
    setIsVisible(true);
  }, []);
  
  // Handle navigation between steps
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };
  
  // Complete the tour
  const completeTour = () => {
    setIsVisible(false);
    
    // Notify parent component
    if (onClose) onClose();
  };
  
  // Get position classes based on the position string and screen size
  const getPositionClasses = () => {
    // Handle last step (Generate Content) specifically
    if (currentStep === steps.length - 1) {
      return "bottom-24 left-1/2 -translate-x-1/2";
    }
    
    // For mobile devices, position everything at the bottom center
    if (isMobile) {
      return "bottom-24 left-1/2 -translate-x-1/2";
    }
    
    // For tablets, use simpler positioning
    if (isTablet) {
      const tabletPositions = {
        "left": "top-32 left-10",
        "center-left": "top-32 left-1/2 -translate-x-1/2",
        "center-right": "top-32 left-1/2 -translate-x-1/2",
        "right": "top-32 right-10",
        "center": "top-32 left-1/2 -translate-x-1/2",
      };
      return tabletPositions[steps[currentStep].position] || "top-32 left-1/2 -translate-x-1/2";
    }
    
    // For desktop
    const desktopPositions = {
      "left": "top-32 left-[15%]",
      "center-left": "top-32 left-[38%] -translate-x-1/2",
      "center-right": "top-32 left-[62%] -translate-x-1/2",
      "right": "top-32 left-[85%] -translate-x-1/2",
      "center": "top-32 left-1/2 -translate-x-1/2",
    };
    
    return desktopPositions[steps[currentStep].position] || "top-32 left-1/2 -translate-x-1/2";
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 z-50 pointer-events-auto">
      <div
        className={`absolute pointer-events-auto ${getPositionClasses()}`}
      >
        <div className="bg-card rounded-lg shadow-lg border border-primary/20 w-72 p-5 animate-in fade-in duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {steps[currentStep].icon}
              <h3 className="text-base font-semibold text-foreground">{steps[currentStep].title}</h3>
            </div>
            <button 
              onClick={completeTour}
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            {steps[currentStep].content}
          </p>
          
          <div className="flex flex-col space-y-4">
            <div className="flex justify-center space-x-1.5">
              {steps.map((_, index) => (
                <div 
                  key={index}
                  className={`h-1.5 w-5 rounded-full ${index === currentStep ? 'bg-primary' : 'bg-primary/20'}`}
                />
              ))}
            </div>
            
            <button
              onClick={nextStep}
              className="w-full text-sm bg-primary text-primary-foreground py-3 rounded-md flex items-center justify-center font-medium hover:bg-primary/90 transition-colors"
            >
              {currentStep < steps.length - 1 ? (
                <>Next <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;