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
              <SelectTrigger className="w-full accent-primary">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {parameterValues.map((option, index) => {
                  // Handle both {id, label} and {label} formats
                  const optionId = option.label || option.id || option;
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
            <div className="grid xl:grid-cols-2 grid-cols-1 gap-2">
              {parameterValues.map((option, index) => {
                const optionId = option.label || option.id || option || `option-${index}`;
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
                      className="h-4 w-4 accent-primary"
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
            <Slider
              min={min}
              max={max}
              step={step}
              value={currentValue || min}
              onValueChange={(newValue) => handleValueChange(newValue)}
              className="w-full pt-2 accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minLabel || min}</span>
              <span className="text-sm text-primary">{currentValue || min}</span>
              <span>{maxLabel || max}</span>
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
              className="w-full accent-primary"
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
  onNavigateToGenerate,
  onShowTour,
}) => {
  const [storyYear, setStoryYear] = useState(() => {
    // Generate a random year between 2025 and 2100
    return Math.floor(Math.random() * (2100 - 2025 + 1)) + 2025;
  });


  const handleGenerate = () => {
    if (onNavigateToGenerate) {
      onNavigateToGenerate(storyYear);
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
          <h4 className="text-sm font-medium mb-2">No Parameters Selected Yet</h4>
          <p className="text-xs !mt-1 text-muted-foreground">
            Browse the categories on the left, then add parameters <br />
            from each category to shape your ideal future.
          </p>
          <Button
            onClick={onShowTour}
            className="m-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-4">
            Take a Tour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      <div className="flex flex-col">
        <h3 className="text-sm font-medium pt-3 pb-2">
          Selected Parameters
        </h3>

        <div className="flex items-center justify-between pb-3 mb-3 border-b">
          <p className="text-xs text-muted-foreground">
            This is your ideal future taking shape!
          </p>

          <a
            onClick={onShowTour}
            className="text-xs italic text-primary hover:underline cursor-pointer"
          >
            Feeling a bit lost? Take the guided tour.
          </a>
        </div>
      </div>

      {/* Selected Parameters - scrollable area */}
      <div className="grid 2xl:grid-cols-3 grid-cols-2 flex-1 overflow-y-auto mb-4 gap-4 items-stretch">
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
      <div className="p-2 border-t rounded-md mt-auto mb-6 bg-background/10 flex justify-center">
        <div className="flex items-center gap-4 w-3/4 mt-2">
          {/* Slider + min/max under it */}
          <div className="flex-1">
            <Slider
              min={2025}
              max={2100}
              step={1}
              value={storyYear}
              onValueChange={(value) => setStoryYear(value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>2025</span>
              <span>2100</span>
            </div>
          </div>

          {/* Label + current year (stacked) */}
          <div className="flex flex-col items-center ml-4">
            <span className="text-xl text-primary font-semibold">{storyYear}</span>
            <span className="text-xs font-medium">Story Year</span>
          </div>

          {/* Button */}
          <Button
            onClick={handleGenerate}
            size="sm"
            disabled={parameters.length === 0}
            className="w-1/4 bg-primary hover:bg-primary/90 text-primary-foreground ml-4"
            data-tour="generate-button"
          >
            <Play className="h-3 w-3 mr-1" />
            Generate Story
          </Button>
        </div>
      </div>



    </div>
  );
};

export default SelectedParameters;