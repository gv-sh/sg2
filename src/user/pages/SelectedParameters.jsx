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
        switch (parameter.type) {
          case 'boolean': 
            defaultValue = false; 
            break;
          case 'range': 
            const rangeConfig = parameter.parameter_config || {};
            defaultValue = rangeConfig.default ?? rangeConfig.min ?? 0;
            break;
          case 'select': 
            const firstOption = parameter.parameter_values?.[0];
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
    switch (parameter.type) {
      case 'select':
        return (
          <Select value={currentValue || ''} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {parameter.parameter_values?.map(option => {
                // Handle both {id, label} and {label} formats
                const optionId = option.id || option.label || option;
                const optionLabel = option.label || option;
                return (
                  <SelectItem key={optionId} value={optionId}>
                    {optionLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`selected-${parameter.id}`}
              checked={currentValue || false}
              onChange={(e) => handleValueChange(e.target.checked)}
            />
            <label htmlFor={`selected-${parameter.id}`} className="text-sm">
              {currentValue ? 
                (parameter.parameter_values?.on || 'Enabled') : 
                (parameter.parameter_values?.off || 'Disabled')
              }
            </label>
          </div>
        );

      case 'range':
        const rangeConfig = parameter.parameter_config || {};
        const min = rangeConfig.min ?? 0;
        const max = rangeConfig.max ?? 100;
        const step = rangeConfig.step ?? 1;
        return (
          <Slider
            min={min}
            max={max}
            step={step}
            value={currentValue || min}
            onValueChange={(newValue) => handleValueChange(newValue)}
            className="w-full"
          />
        );

      case 'text':
        return (
          <Input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={parameter.description || "Enter text..."}
            className="w-full"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
            placeholder={parameter.description || "Enter number..."}
            className="w-full"
          />
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
    <div className="p-4 border rounded-md space-y-3">
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
      onNavigateToGenerate({ year: storyYear });
    }
  };


  if (parameters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-left">
          <h3 className="text-sm font-medium mb-1 pt-3">Selected Parameters</h3>
          <p className="text-muted-foreground text-xs border-b pb-3">
            Parameters you select will appear here.
          </p>
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium mb-1 pt-3">Selected Parameters</h3>
        <p className="text-muted-foreground text-xs border-b pb-3">
          Configure your story parameters and generate content.
        </p>
      </div>

      {/* Story Year Setting */}
      <div className="p-4 border rounded-md space-y-3">
        <h4 className="text-sm font-medium">Story Year</h4>
        <Input
          type="number"
          value={storyYear}
          onChange={(e) => setStoryYear(parseInt(e.target.value) || storyYear)}
          min={2000}
          max={3000}
          placeholder="Enter year (e.g., 2050)"
          className="w-full"
        />
      </div>

      {/* Selected Parameters */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {parameters.map(parameter => (
          <SelectedParameterCard
            key={parameter.id}
            parameter={parameter}
            onUpdate={onUpdateParameterValue}
            onRemove={onRemoveParameter}
          />
        ))}
      </div>

      {/* Generate Button */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleGenerate}
          className="w-full"
          disabled={parameters.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Generate Story
        </Button>
      </div>
    </div>
  );
};

export default SelectedParameters;