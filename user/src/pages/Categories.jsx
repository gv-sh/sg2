// src/pages/Categories.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchCategories, fetchParameters } from '../services/api';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Folder, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';

const Categories = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parameterCounts, setParameterCounts] = useState({});
  const [filteredCategories, setFilteredCategories] = useState([]);

  // Fetch categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await fetchCategories();
        
        // Filter categories that should be shown
        const visibleCategories = (response.data || [])
          .filter(category => category.visibility === 'Show');
          
        setCategories(visibleCategories);
        setError(null);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to load categories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Fetch parameter counts for each category
  useEffect(() => {
    const fetchParameterCounts = async () => {
      if (!categories.length) return;
      
      const counts = {};
      const categoriesWithParameters = [];
      
      // For each category, fetch its parameters and count them
      for (const category of categories) {
        try {
          const result = await fetchParameters(category.id);
          const count = (result.data || []).length;
          counts[category.id] = count;
          
          // Only include categories with at least one parameter
          if (count > 0) {
            categoriesWithParameters.push(category);
          }
        } catch (err) {
          console.error(`Error fetching parameters for ${category.id}:`, err);
          counts[category.id] = 0;
        }
      }
      
      setParameterCounts(counts);
      setFilteredCategories(categoriesWithParameters);
    };
    
    fetchParameterCounts();
  }, [categories]);

  // Handle category selection
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    
    if (onCategorySelect && typeof onCategorySelect === 'function') {
      onCategorySelect([category]);
    }
  }, [onCategorySelect]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/100 border-t-primary"></div>
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

  if (filteredCategories.length === 0) {
    return (
      <Alert>
        <AlertDescription>No categories with parameters available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1 pt-3">Select Category</h2>
        <p className="text-muted-foreground text-xs">
            What kind of world do you want to build?
          </p>
      </div>
      
      <div className="flex-grow overflow-auto">
        <div className="space-y-1">
          {/* Only map over categories that have parameters */}
          {filteredCategories.map((category) => {
            const isSelected = selectedCategory?.id === category.id;
            const paramCount = parameterCounts[category.id] || 0;
            
            return (
              <button
                key={category.id}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm rounded-md",
                  isSelected 
                    ? "bg-primary text-accent-foreground" 
                    : "hover:bg-primary/100 hover:text-accent-foreground"
                )}
                onClick={() => handleCategorySelect(category)}
                title={category.description || 'No description available'}
              >
                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <FolderOpen className="h-4 w-4" />
                  ) : (
                    <Folder className="h-4 w-4" />
                  )}
                  <span>{category.name}</span>
                </div>
                
                {/* Show parameter count badge */}
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                  {paramCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;