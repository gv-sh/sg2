// src/pages/Parameters.jsx
import React, { useState, useEffect } from 'react';
import { fetchParameters } from '../services/api';
import { Alert, AlertDescription } from '../../shared/components/ui/alert.tsx';
import { CheckCircle } from "lucide-react";

// Simple parameter selection component - click to toggle
const ParameterItem = ({ parameter, onSelect, onRemove, isSelected }) => {
  const handleToggle = () => {
    if (isSelected) {
      onRemove(parameter.id);
    } else {
      // Add parameter without any value - SelectedParameters will handle value setting
      onSelect({ ...parameter, value: null });
    }
  };

  return (
    <div
      className={`relative p-2 border rounded-md transition-colors cursor-pointer ${isSelected
        ? 'bg-primary/10 border-primary text-primary'
        : 'border'
        }`}
      onClick={handleToggle}
    >
      {isSelected && (
        <span
          className="
              absolute top-2 right-2
              px-2 py-0.5
              text-[10px] font-medium
              bg-primary text-primary-foreground
              rounded-full
            "
        >
          Added
        </span>
      )}
      <h4 className="text-sm font-medium">{parameter.name}</h4>
      {parameter.description && (
        <p className="text-xs text-muted-foreground !mt-2 line-clamp-3">
          {getFirstSentence(parameter.description)}
        </p>
      )}
    </div>
  );
};

const getFirstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/[^.?!]+[.?!]/);
  return match ? match[0] : text;
};

const Parameters = ({ selectedCategory, selectedParameters, onParameterSelect, onParameterRemove }) => {
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium pt-3 pb-2">Add Parameters</h3>
        <p className="text-xs text-muted-foreground border-b !mt-1 pb-2">
          Add the parameters you want to shape your story with.
        </p>
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto">
        {parameters.map(parameter => (
          <ParameterItem
            key={parameter.id}
            parameter={parameter}
            onSelect={onParameterSelect}
            onRemove={onParameterRemove}
            isSelected={isParameterSelected(parameter.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Parameters;