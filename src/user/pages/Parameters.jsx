// src/pages/Parameters.jsx
import React, { useState, useEffect } from 'react';
import { fetchParameters } from '../services/api';
import { Alert, AlertDescription } from '../../shared/components/ui/alert.tsx';
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
import { Plus, HelpCircle } from 'lucide-react';

// Individual parameter component with value input
const ParameterItem = ({ parameter, onSelect, isSelected }) => {
  const [value, setValue] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = () => {
    if (!isSelected) {
      // Initialize with default value based on type
      let defaultValue = null;
      if (parameter.type === 'boolean') {
        defaultValue = false;
      } else if (parameter.type === 'range') {
        defaultValue = 50; // Default to middle
      } else if (parameter.type === 'select' && parameter.parameter_values?.length > 0) {
        defaultValue = parameter.parameter_values[0].id;
      } else if (parameter.type === 'text') {
        defaultValue = '';
      }
      
      setValue(defaultValue);
      onSelect({ ...parameter, value: defaultValue });
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleValueChange = (newValue) => {
    setValue(newValue);
    onSelect({ ...parameter, value: newValue });
  };

  const renderValueInput = () => {
    if (!isSelected || !isExpanded) return null;

    switch (parameter.type) {
      case 'select':
        return (
          <div className="mt-3 space-y-2">
            <label htmlFor={`param-${parameter.id}`} className="text-xs text-muted-foreground">
              Choose an option:
            </label>
            <Select value={value || ''} onValueChange={handleValueChange}>
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
          </div>
        );

      case 'boolean':
        return (
          <div className="mt-3 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`param-${parameter.id}`}
                checked={value || false}
                onCheckedChange={handleValueChange}
              />
              <label htmlFor={`param-${parameter.id}`} className="text-xs">
                Enable this feature
              </label>
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="mt-3 space-y-2">
            <label htmlFor={`param-${parameter.id}`} className="text-xs text-muted-foreground">
              Value: {value}
            </label>
            <Slider
              id={`param-${parameter.id}`}
              min={0}
              max={100}
              step={1}
              value={[value || 50]}
              onValueChange={([newValue]) => handleValueChange(newValue)}
              className="w-full"
            />
          </div>
        );

      case 'text':
        return (
          <div className="mt-3 space-y-2">
            <label htmlFor={`param-${parameter.id}`} className="text-xs text-muted-foreground">
              Enter text:
            </label>
            <Input
              id={`param-${parameter.id}`}
              type="text"
              value={value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Type here..."
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`p-3 border rounded-md transition-colors ${
      isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-accent'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{parameter.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {parameter.description}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {parameter.description && (
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          )}
          <Button
            onClick={handleSelect}
            size="sm"
            variant={isSelected ? "secondary" : "outline"}
            className="h-7 px-3"
          >
            {isSelected ? (
              isExpanded ? "Collapse" : "Expand"
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
      
      {renderValueInput()}
    </div>
  );
};

const Parameters = ({ selectedCategory, selectedParameters, onParameterSelect }) => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch parameters when category changes
  useEffect(() => {
    const loadParameters = async () => {
      if (!selectedCategory) {
        setParameters([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetchParameters(selectedCategory.id);
        setParameters(response.data || []);
      } catch (err) {
        console.error('Error fetching parameters:', err);
        setError('Failed to load parameters. Please try again.');
        setParameters([]);
      } finally {
        setLoading(false);
      }
    };

    loadParameters();
  }, [selectedCategory]);

  // Check if parameter is selected
  const isParameterSelected = (parameterId) => {
    return selectedParameters.some(p => p.id === parameterId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/50 border-t-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <h3 className="text-sm font-medium mb-1">Add Parameters</h3>
        <p className="text-muted-foreground text-xs">
          Select a category to see available parameters.
        </p>
      </div>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <h3 className="text-sm font-medium mb-1">No Parameters</h3>
        <p className="text-muted-foreground text-xs">
          No parameters available for this category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium mb-1 pt-3">Parameters</h3>
        <p className="text-muted-foreground text-xs border-b pb-3">
          Add parameters from <strong>{selectedCategory.name}</strong> to shape your story.
        </p>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {parameters.map(parameter => (
          <ParameterItem
            key={parameter.id}
            parameter={parameter}
            onSelect={onParameterSelect}
            isSelected={isParameterSelected(parameter.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Parameters;