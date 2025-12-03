// src/pages/Categories.jsx
import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../services/api';
import { Alert, AlertDescription } from '../../shared/components/ui/alert.tsx';
import { Folder, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';

const Categories = ({ selectedCategory, onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await fetchCategories();
        const allCategories = response.data || [];
        setCategories(allCategories);
        setError(null);
        
        // Auto-select first category if none selected
        if (allCategories.length > 0 && !selectedCategory) {
          onCategorySelect(allCategories[0]);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to load categories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [selectedCategory, onCategorySelect]);

  // Handle category selection
  const handleCategorySelect = (category) => {
    onCategorySelect(category);
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

  if (categories.length === 0) {
    return (
      <Alert>
        <AlertDescription>No categories available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-left">
        <h3 className="text-sm font-medium mb-1 pt-3">Categories</h3>
        <p className="text-muted-foreground text-xs border-b pb-3">
          Choose a category to explore parameters.
        </p>
      </div>
      
      <div className="space-y-2">
        {categories.map(category => {
          const isSelected = selectedCategory?.id === category.id;
          
          return (
            <button
              key={category.id}
              className={cn(
                "w-full p-3 text-left rounded-md border transition-colors",
                "flex items-center justify-between",
                isSelected
                  ? "bg-primary text-accent-foreground border-primary" 
                  : "hover:bg-primary/10 hover:border-primary/50"
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
                <span className="font-medium">{category.name}</span>
              </div>
              
              {/* Show parameter count badge */}
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                {category.parameter_count || 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;