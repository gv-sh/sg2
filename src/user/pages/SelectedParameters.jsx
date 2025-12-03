// src/pages/SelectedParameters.jsx
import React, { useState } from 'react';
import { Button } from '../../shared/components/ui/button.tsx';
import { Badge } from '../../shared/components/ui/badge.tsx';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../shared/components/ui/card.tsx';
import { Trash2, Sparkles, Play, Dices } from 'lucide-react';
import { cn } from '../lib/utils';
import { randomizeParameterValue } from '../utils/parameterUtils';

// Individual selected parameter card
const SelectedParameterCard = ({ parameter, onUpdate, onRemove }) => {
  // Initialize null values with appropriate defaults
  const initializeValue = () => {
    if (parameter.value !== null && parameter.value !== undefined) {
      return parameter.value;
    }
    
    // Set default based on type
    switch (parameter.type) {
      case 'boolean':
        return false;
      case 'range':
        return 50;
      case 'select':
        return parameter.parameter_values?.[0]?.id || '';
      case 'text':
        return '';
      default:
        return null;
    }
  };

  const currentValue = initializeValue();

  const handleValueChange = (newValue) => {
    onUpdate(parameter.id, newValue);
  };

  const handleRandomize = () => {
    const randomValue = randomizeParameterValue(parameter);
    handleValueChange(randomValue);
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
              {parameter.parameter_values?.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`selected-${parameter.id}`}
              checked={currentValue || false}
              onCheckedChange={handleValueChange}
            />
            <label htmlFor={`selected-${parameter.id}`} className="text-sm">
              {currentValue ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Value</label>
              <Badge variant="outline">{currentValue || 50}</Badge>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[currentValue || 50]}
              onValueChange={([newValue]) => handleValueChange(newValue)}
              className="w-full"
            />
          </div>
        );

      case 'text':
        return (
          <Input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter text..."
            className="w-full"
          />
        );

      default:
        return (
          <div className="text-xs text-muted-foreground">
            Unknown parameter type: {parameter.type}
          </div>
        );
    }
  };

  const getValueDisplay = () => {
    if (parameter.type === 'select') {
      const option = parameter.parameter_values?.find(opt => opt.id === currentValue);
      return option?.label || 'Not selected';
    } else if (parameter.type === 'boolean') {
      return currentValue ? 'Yes' : 'No';
    } else if (parameter.type === 'range') {
      return currentValue || '50';
    } else if (parameter.type === 'text') {
      return currentValue || 'Empty';
    }
    return 'Unknown';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {parameter.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {parameter.description}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              onClick={handleRandomize}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Randomize value"
            >
              <Dices className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => onRemove(parameter.id)}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Remove parameter"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Current Value</label>
            <Badge variant="secondary" className="text-xs">
              {getValueDisplay()}
            </Badge>
          </div>
          {renderValueInput()}
        </div>
      </CardContent>
    </Card>
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

  const handleRandomizeYear = () => {
    const randomYear = Math.floor(Math.random() * (2126 - 2026 + 1)) + 2026;
    setStoryYear(randomYear);
  };

  const handleGenerate = () => {
    if (onNavigateToGenerate) {
      onNavigateToGenerate({ year: storyYear });
    }
  };

  // Check if all parameters have values
  const hasIncompleteParameters = parameters.some(p => 
    p.value === null || p.value === undefined || p.value === ''
  );

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
    <div className="space-y-4">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium mb-1 pt-3">Selected Parameters</h3>
        <p className="text-muted-foreground text-xs border-b pb-3">
          Configure your story parameters and generate content.
        </p>
      </div>

      {/* Story Year Setting */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Story Year</CardTitle>
            <Button
              onClick={handleRandomizeYear}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Randomize year"
            >
              <Dices className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Year Setting</label>
              <Badge variant="secondary" className="text-xs">{storyYear}</Badge>
            </div>
            <Input
              type="number"
              value={storyYear}
              onChange={(e) => setStoryYear(parseInt(e.target.value) || storyYear)}
              min={2000}
              max={3000}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Parameters */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
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
          className={cn(
            "w-full",
            hasIncompleteParameters && "opacity-75"
          )}
          disabled={parameters.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          {hasIncompleteParameters 
            ? `Generate with ${parameters.filter(p => p.value !== null && p.value !== undefined && p.value !== '').length}/${parameters.length} parameters`
            : `Generate Story (${parameters.length} parameters)`
          }
        </Button>
        {hasIncompleteParameters && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Some parameters don't have values set. They'll use default values.
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectedParameters;