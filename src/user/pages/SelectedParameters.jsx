// src/pages/SelectedParameters.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trash2, Folder, Zap, Dices, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '../components/ui/accordion';
import { cn } from '../lib/utils';
import ParameterValueInput from '../components/parameters/ParameterValueInput';
import { randomizeParameterValue } from '../utils/parameterUtils';
import { useNavigate } from 'react-router-dom';

const SelectedParameters = ({
  parameters,
  onRemoveParameter,
  onUpdateParameterValue,
  onNavigateToGenerate,
  onShowTour
}) => {
  const navigate = useNavigate();
  const [randomizing, setRandomizing] = useState(false);
  const [newParameters, setNewParameters] = useState(new Set());
  const [storyYear, setStoryYear] = useState(() => {
    // Generate a random year between 2026 and 2126
    return Math.floor(Math.random() * (2126 - 2026 + 1)) + 2026;
  });

  // Track newly added parameters
  useEffect(() => {
    const handleNewParameter = (prevParams, currentParams) => {
      // Only consider a parameter new if it wasn't in the previous state
      const newIds = currentParams
        .filter(param => !prevParams.some(p => p.id === param.id))
        .map(param => param.id);
      
      if (newIds.length > 0) {
        setNewParameters(prev => new Set([...prev, ...newIds]));
        // Clear the highlight after animation
        setTimeout(() => {
          setNewParameters(prev => {
            const updated = new Set(prev);
            newIds.forEach(id => updated.delete(id));
            return updated;
          });
        }, 1000);
      }
    };

    // Keep track of previous parameters to detect new ones
    const prevParameters = parameters;
    return () => {
      if (parameters !== prevParameters) {
        handleNewParameter(prevParameters, parameters);
      }
    };

    
  }, [parameters]);


  // Function to remove all parameters at once
  const handleRemoveAll = () => {
    // Call onRemoveParameter for each parameter
    [...parameters].forEach(param => {
      onRemoveParameter(param);
    });
  };

  // Group parameters by category with new parameters first inside each category
  const parametersByCategory = useMemo(() => {
    // Step 1: Group parameters by category ID
    const groupedByCategory = {};
    
    parameters.forEach(param => {
      const catId = param.categoryId || 'uncategorized';
      const catName = param.categoryName || 'Uncategorized';
      
      if (!groupedByCategory[catId]) {
        groupedByCategory[catId] = {
          id: catId,
          name: catName,
          newParams: [],
          existingParams: []
        };
      }
      
      // Add to the appropriate array based on whether it's new
      if (newParameters.has(param.id)) {
        groupedByCategory[catId].newParams.push(param);
      } else {
        groupedByCategory[catId].existingParams.push(param);
      }
    });
    
    // Step 2: Create the final structure with new parameters first in each category
    return Object.values(groupedByCategory).map(category => ({
      id: category.id,
      name: category.name,
      parameters: [...category.newParams, ...category.existingParams]
    }));
  }, [parameters, newParameters]);

  const areAllConfigured = useMemo(() => {
    if (!parameters.length) return false;
    return !parameters.some((p) => p.value == null);
  }, [parameters]);

  const handleRandomize = (scope, categoryId = null, parameterId = null) => {
    setRandomizing(true);
    setTimeout(() => {
      if (scope === 'parameter' && parameterId) {
        const p = parameters.find((x) => x.id === parameterId);
        if (p) onUpdateParameterValue(p.id, randomizeParameterValue(p));
      }
      if (scope === 'category' && categoryId) {
        parameters
          .filter((x) => x.categoryId === categoryId)
          .forEach((p) =>
            onUpdateParameterValue(p.id, randomizeParameterValue(p))
          );
      }
      if (scope === 'all') {
        parameters.forEach((p) =>
          onUpdateParameterValue(p.id, randomizeParameterValue(p))
        );
      }
      setRandomizing(false);
    }, 300);
  };

  const handleGenerateClick = () => {
    // Clear any existing generation flags first
    sessionStorage.removeItem('specgen-generating');
    
    // Set new parameters
    sessionStorage.setItem('specgen-parameters', JSON.stringify(parameters));
    sessionStorage.setItem('specgen-story-year', storyYear.toString());
    sessionStorage.setItem('specgen-auto-generate', 'true');
    
    // Navigate to generating route
    navigate('/generating');
  };
  
  useEffect(() => {
    parameters
      .filter((p) => p.value == null)
      .forEach((p) =>
        onUpdateParameterValue(p.id, randomizeParameterValue(p))
      );
  }, [onUpdateParameterValue, parameters]);

  if (!parameters.length) {
    return (
      <div className="h-full flex flex-col">
        <h2 className="text-sm font-medium pt-3 mb-1 text-foreground">Selected Parameters</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-sm font-medium mb-2">No parameters selected yet.</p>
            <p className="text-xs text-muted-foreground mb-4">
              Browse the categories on the left, then add parameters from each category
              to shape your ideal future.
            </p>
            {onShowTour && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onShowTour}
                className="mx-auto flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Take a Tour
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-card p-3 pl-0 pr-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-left gap-2">
              <h2 className="text-sm font-medium text-foreground mb-1">Selected Parameters</h2>
              <Badge variant="secondary" className = "rounded-4">{parameters.length}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              This is your ideal future taking shape!
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {onShowTour && (
              <Button
                variant="link"
                size="sm"
                onClick={onShowTour}
                className="h-7 px-2 flex items-center gap-1.5 text-primary hover:text-accent"
                aria-label="Take a guided tour"
                title="Take a guided tour"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Guided Tour</span>
              </Button>
            )}
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleRandomize('all')}
              className={cn(
                "h-7 px-2 text-white shadow-md flex items-center gap-1.5",
                "hover:text-accent-foreground rounded-md transition-all duration-200",
                "hover:shadow-lg hover:brightness-110 hover:-translate-y-px animate-shimmer",
                "text-accent-foreground bg-primary/100",
                randomizing ? "animate-pulse" : ""
              )}
              aria-label="Randomize all parameters"
              title="Randomize all parameters"
            >
              <Dices className={cn("h-3.5 w-3.5", randomizing ? "animate-spin" : "")} />
              <span className="text-xs font-medium">Randomize</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveAll}
              className="h-7 w-7 text-destructive text-accent-foreground hover: text-accent"
              aria-label="Remove all parameters"
              title="Remove all parameters"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto" style={{ height: "calc(100% - 96px)" }}>
        <div className="space-y-3">
          {parametersByCategory.map((category) => (
            <div 
              key={category.id}
              className="border border-input rounded-md overflow-hidden"
            >
              <Accordion
                type="multiple"
                defaultValue={[category.id]}
                className="w-full"
              >
                <AccordionItem
                  value={category.id}
                  className="border-none"
                >
                  <AccordionTrigger className="p-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {category.parameters.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-3">
                    <div className="grid grid-cols-2 gap-4">
                      {category.parameters.map((parameter, paramIndex) => (
                        <div
                          key={parameter.id}
                          className={cn(
                            "p-4 border border-input rounded-md relative",
                            newParameters.has(parameter.id) && "animate-highlight"
                          )}
                          style={{
                            animationDelay: `${paramIndex * 100}ms`
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium">{parameter.name}</h3>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRandomize('parameter', null, parameter.id)}
                                  className="h-6 w-6 text-accent bg-0 hover:text-accent-foreground hover:bg-accent/100"
                                  aria-label={`Randomize ${parameter.name}`}
                                  title={`Randomize ${parameter.name}`}
                                >
                                  <Dices className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRemoveParameter(parameter)}
                                  className="h-6 w-6 text-accent"
                                  aria-label={`Remove ${parameter.name}`}
                                  title={`Remove ${parameter.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {parameter.description && (
                              <p className="text-xs text-muted-foreground">
                                {parameter.description}
                              </p>
                            )}

                            {/* Value input */}
                            <div className=" bg-muted/40 p-3 rounded-md">
                              <ParameterValueInput
                                parameter={parameter}
                                value={parameter.value}
                                onChange={(newVal) => onUpdateParameterValue(parameter.id, newVal)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      </div>
      
      <div className="sticky bottom-0 p-3 border-t border-input bg-card z-10 mt-auto">
        <div className="flex gap-3 items-center">
          <div className="w-2/3 flex flex-col justify-center">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Story Year: {storyYear}</span>
              <span className="text-xs text-muted-foreground">2026-2126</span>
            </div>
            <input
              type="range"
              min="2026"
              max="2126"
              value={storyYear}
              onChange={(e) => setStoryYear(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-muted rounded-md appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
          </div>
          <Button
            variant="default"
            onClick={handleGenerateClick}
            disabled={!areAllConfigured}
            className="whitespace-nowrap h-10 w-1/3 text-accent-foreground"
          >
            <Zap className="h-4 w-4 mr-2" />
            <span className="font-medium">
              {!areAllConfigured
                ? 'Configure All Parameters'
                : 'Generate Content'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectedParameters;