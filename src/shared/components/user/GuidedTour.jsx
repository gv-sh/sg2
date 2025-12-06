// src/components/GuidedTour.jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, X, BookOpen, Sparkles, Dices, ZoomIn, Settings2, Layers, Boxes } from 'lucide-react';
import TourHighlight from './TourHighlight.jsx';

const GuidedTour = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  
  // Define tour steps with icons and targets
  const steps = [
    {
      title: "Welcome",
      content: "A space where your choices shape the future. Select world building parameters and the AI will weave them into a speculative story inspired by the world you imagine.",
      position: "center",
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      target: null // No highlight for welcome step
    },
    {
      title: "Browse Categories",
      content: "Start by selecting a category from the left panel. Each category contains unique parameters to build your story.",
      position: "left",
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      target: '[data-tour="categories-panel"]' // Left panel
    },
    {
      title: "Explore Parameters",
      content: "After choosing a category, explore through the parameters in the middle panel and add the ones you'd like to incorporate into your story.",
      position: "center-left",
      icon: <Layers className="h-4 w-4 text-primary" />,
      target: '[data-tour="parameters-panel"]' // Middle panel
    },
    {
      title: "Multiple Categories",
      content: "You can select parameters from multiple different categories. Simply click on another category to explore its parameters.",
      position: "left",
      icon: <Boxes className="h-4 w-4 text-primary" />,
      target: '[data-tour="categories-panel"]' // Left panel again
    },
    {
      title: "Configure Parameters",
      content: "Adjust your selected parameters in the right panel to fine-tune how your story will be crafted.",
      position: "center-right",
      icon: <Settings2 className="h-4 w-4 text-primary" />,
      target: '[data-tour="selected-parameters-panel"]' // Right panel
    },
    {
      title: "Randomize Options",
      content: "Can't decide? Use the randomize buttons to quickly generate parameter values.",
      position: "right",
      icon: <Dices className="h-4 w-4 text-primary" />,
      target: '[data-tour="selected-parameters-panel"]' // Right panel
    },
    {
      title: "Generate Content",
      content: "Choose the year you want your story to take place in, then click Generate to create a story and visual based on your selected parameters.",
      position: "center",
      icon: <ZoomIn className="h-4 w-4 text-primary" />,
      target: '[data-tour="generate-button"]' // Generate button specifically
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
  
  
  if (!isVisible) {
    return null;
  }
  

  return (
    <>
      {/* Tour highlight overlay */}
      <TourHighlight 
        target={steps[currentStep].target} 
        isVisible={isVisible}
      />
      
      {/* Tour modal */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4" style={{zIndex: 9999}}>
        <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md p-6 opacity-100 transition-all duration-300 transform scale-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {steps[currentStep].icon}
            <h3 className="text-base font-semibold text-foreground">{steps[currentStep].title}</h3>
          </div>
          <button 
            onClick={completeTour}
            className="text-muted-foreground hover:text-foreground p-1 rounded-sm transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {steps[currentStep].content}
        </p>
        
        <div className="space-y-4">
          <div className="flex justify-center space-x-1.5">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`h-1.5 w-5 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={nextStep}
            className="w-full bg-primary text-primary-foreground py-3 rounded-md flex items-center justify-center font-medium hover:bg-primary/90 transition-colors"
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
    </>
  );
};

export default GuidedTour;