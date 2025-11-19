// src/pages/Parameters.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { fetchParameters } from '../services/api';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Frown } from 'lucide-react';


// Memoized parameter component for performance
const MemoizedParameter = memo(({ parameter, onAddParameter, isSelected }) => {
  return (
    <div className="py-2 flex items-center justify-between border-b last:border-0">
      <h3 className="text-sm truncate">{parameter.name}</h3>
      <Button
        onClick={() => !isSelected && onAddParameter(parameter)}
        variant={isSelected ? "secondary" : "link_hover"}
        size="sm"
        disabled={isSelected}
        className="min-w-[60px] h-8"
      >
        {isSelected ? "Added" : "Add"}
      </Button>
    </div>
  );
});

const Parameters = ({
  selectedCategory,
  selectedParameters,
  onParameterSelect,
  onParameterRemove
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Current selected category (assuming it's the first in the array)
  const currentCategory = selectedCategory && selectedCategory.length > 0 ? selectedCategory[0] : null;

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch parameters for selected category
  useEffect(() => {
    const fetchParametersForCategory = async () => {
      if (!currentCategory) {
        setParameters([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchParameters(currentCategory.id);
        const categoryParameters = result.data || [];

        // Add category information to parameters
        const processedParameters = categoryParameters.map(param => ({
          ...param,
          categoryId: currentCategory.id,
          categoryName: currentCategory.name
        }));

        setParameters(processedParameters);
      } catch (err) {
        console.error('Error fetching parameters:', err);
        setError('Failed to load parameters. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchParametersForCategory();
  }, [currentCategory]);

  // Filter parameters based on search query
  const filteredParameters = useMemo(() => {
    return parameters.filter(param => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const nameMatch = param.name?.toLowerCase().includes(query);
        const descMatch = param.description?.toLowerCase().includes(query);
        const typeMatch = param.type?.toLowerCase().includes(query);

        return nameMatch || descMatch || typeMatch;
      }
      return true;
    });
  }, [parameters, debouncedSearchQuery]);

  // Check if a parameter is already selected
  const isParameterSelected = (parameter) => {
    return selectedParameters.some(p => p.id === parameter.id);
  };

  // Handle adding a parameter
  const handleAddParameter = (parameter) => {
    onParameterSelect(parameter);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-4">
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

  return (
    <div className="space-y-4">
      {!currentCategory ? (
        <div className="flex flex-col items-left justify-center h-[calc(100%-5rem)]">
          <h3 className="text-sm font-medium mb-1 pt-3">Add Parameters</h3>
          <p className="text-muted-foreground text-xs">
            Shape your future. Choose what matters most to you.
          </p>
        </div>
      ) : 
      
      filteredParameters?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100%-5rem)] text-center">
          {searchQuery ? (
            <>
              <Frown className="h-6 w-6 text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium mb-1">No matching parameters</h3>
              <p className="text-muted-foreground text-xs mb-2">
                Try adjusting your search or clear the filter.
              </p>
              <Button variant="link" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium mb-1">No parameters available</h3>
              <p className="text-muted-foreground text-xs">
                Select a different category to explore parameters.
              </p>
            </>
          )}
        </div>
        
      ) : (
        <div className="flex flex-col h-full pt-3">
          {/* Sticky header section */}
          <div className="sticky top-0 z-10 bg-card pb-2">
            <div className="flex flex-col items-left">
              <h3 className="text-sm font-medium mb-1">Add Parameters</h3>
              <p className="text-muted-foreground text-xs border-b pb-3">
                Add the parameters you want to shape your story with.
              </p>
            </div>
          </div>
          
          {/* Scrollable parameters list */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {filteredParameters.map(parameter => (
              <MemoizedParameter
                key={parameter.id}
                parameter={parameter}
                onAddParameter={handleAddParameter}
                isSelected={isParameterSelected(parameter)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Parameters;