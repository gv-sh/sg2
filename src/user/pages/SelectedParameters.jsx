// src/pages/SelectedParameters.jsx
import React, { useState } from 'react';
import { Button } from '../../shared/components/ui/button.tsx';
import { Input } from '../../shared/components/ui/input.tsx';
import { Checkbox } from '../../shared/components/ui/checkbox.tsx';
import { Slider } from '../../shared/components/ui/slider.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/components/ui/select.jsx';
import { Trash2, Sparkles, Play } from 'lucide-react';

// Individual selected parameter card - simplified
const SelectedParameterCard = ({ parameter, onUpdate, onRemove }) => {
  // Initialize value if not set
  const currentValue = parameter.value !== null && parameter.value !== undefined 
    ? parameter.value 
    : (() => {
        // Set default and update parameter
        let defaultValue;
        const parameterValues = parameter.parameter_values || parameter.values || [];
        const parameterConfig = parameter.parameter_config || parameter.config || {};
        
        switch (parameter.type) {
          case 'boolean': 
            defaultValue = false; 
            break;
          case 'range': 
            defaultValue = parameterConfig.default ?? parameterConfig.min ?? 0;
            break;
          case 'select':
          case 'radio':
            const firstOption = parameterValues[0];
            defaultValue = firstOption?.id || firstOption?.label || firstOption || '';
            break;
          case 'text': 
            defaultValue = ''; 
            break;
          case 'number':
            defaultValue = 0;
            break;
          default: 
            defaultValue = '';
        }
        onUpdate(parameter.id, defaultValue);
        return defaultValue;
      })();

  const handleValueChange = (newValue) => {
    onUpdate(parameter.id, newValue);
  };

  const renderValueInput = () => {
    // Extract parameter values and config from database format
    const parameterValues = parameter.parameter_values || parameter.values || [];
    const parameterConfig = parameter.parameter_config || parameter.config || {};
    
    switch (parameter.type) {
      case 'select':
        // Create a lookup function to find label for selected value
        const findLabelForValue = (value) => {
          const option = parameterValues.find(opt => {
            const optionId = opt.id || opt.label || opt;
            return optionId === value;
          });
          return option ? (option.label || option) : value;
        };
        
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <Select 
              value={currentValue || ''} 
              onValueChange={handleValueChange}
              findLabelForValue={findLabelForValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {parameterValues.map((option, index) => {
                  // Handle both {id, label} and {label} formats
                  const optionId = option.id || option.label || option;
                  const optionLabel = option.label || option;
                  return (
                    <SelectItem key={optionId || index} value={optionId}>
                      {optionLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`selected-${parameter.id}`}
                checked={currentValue || false}
                onChange={(e) => handleValueChange(e.target.checked)}
              />
              <label htmlFor={`selected-${parameter.id}`} className="text-sm">
                {currentValue ? 
                  (parameterValues?.on || 'Enabled') : 
                  (parameterValues?.off || 'Disabled')
                }
              </label>
            </div>
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <div className="space-y-2">
              {parameterValues.map((option, index) => {
                const optionId = option.id || option.label || option || `option-${index}`;
                const optionLabel = option.label || option;
                
                return (
                  <div key={optionId} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${parameter.id}-${optionId}`}
                      name={parameter.id}
                      value={optionId}
                      checked={currentValue === optionId}
                      onChange={() => handleValueChange(optionId)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`${parameter.id}-${optionId}`}
                      className="text-sm"
                    >
                      {optionLabel}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'range':
        const min = parameterConfig.min ?? 0;
        const max = parameterConfig.max ?? 100;
        const step = parameterConfig.step ?? 1;
        const minLabel = parameterConfig.minLabel || parameterValues?.[0]?.label;
        const maxLabel = parameterConfig.maxLabel || parameterValues?.[1]?.label;
        
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minLabel || min}</span>
              <span>{maxLabel || max}</span>
            </div>
            <Slider
              min={min}
              max={max}
              step={step}
              value={currentValue || min}
              onValueChange={(newValue) => handleValueChange(newValue)}
              className="w-full"
            />
            <div className="text-center">
              <span className="text-xs text-muted-foreground">Current: {currentValue || min}</span>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={parameter.description || "Enter text..."}
              className="w-full"
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            {parameter.description && (
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            )}
            <Input
              type="number"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
              placeholder={parameter.description || "Enter number..."}
              className="w-full"
            />
          </div>
        );

      default:
        return (
          <div className="p-3 border rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">
              Unsupported parameter type: "{parameter.type}"
            </div>
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value..."
              className="w-full"
            />
          </div>
        );
    }
  };

  return (
    <div className="p-2 border rounded-md space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{parameter.name}</h4>
        <Button
          onClick={() => onRemove(parameter.id)}
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          title="Remove parameter"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {renderValueInput()}
    </div>
  );
};

const SelectedParameters = ({ 
  parameters, 
  onRemoveParameter, 
  onUpdateParameterValue,
  onNavigateToGenerate 
}) => {
  const [storyYear, setStoryYear] = useState(() => {
    // Generate a random year between 2026 and 2126
    return Math.floor(Math.random() * (2126 - 2026 + 1)) + 2026;
  });


  const handleGenerate = () => {
    if (onNavigateToGenerate) {
      onNavigateToGenerate();
    }
  };


  if (parameters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-left">
          <h3 className="text-sm font-medium mb-3 pt-3 border-b pb-3">Selected Parameters</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground mb-3" />
          <h4 className="text-sm font-medium mb-1">No Parameters Selected</h4>
          <p className="text-xs text-muted-foreground">
            Choose parameters from the middle panel to start building your story.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium mb-3 pt-3 border-b pb-3">Selected Parameters</h3>
      </div>

      {/* Selected Parameters - scrollable area */}
      <div className="space-y-1 flex-1 overflow-y-auto mb-4">
        {parameters.map(parameter => (
          <SelectedParameterCard
            key={parameter.id}
            parameter={parameter}
            onUpdate={onUpdateParameterValue}
            onRemove={onRemoveParameter}
          />
        ))}
      </div>

      {/* Story Year Setting - anchored to bottom */}
      <div className="p-2 border rounded-md space-y-2 mt-auto mb-6 bg-background">
        <h4 className="text-sm font-medium">Story Year</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2026</span>
            <span>2126</span>
          </div>
          <Slider
            min={2026}
            max={2126}
            step={1}
            value={storyYear}
            onValueChange={(value) => setStoryYear(value)}
            className="w-full"
          />
          <div className="text-center">
            <span className="text-xs text-muted-foreground">Current: {storyYear}</span>
          </div>
        </div>
        <div className="pt-1">
          <Button
            onClick={handleGenerate}
            size="sm"
            disabled={parameters.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            <Play className="h-3 w-3 mr-1" />
            Generate
          </Button>
        </div>
      </div>

    </div>
  );
};

export default SelectedParameters;