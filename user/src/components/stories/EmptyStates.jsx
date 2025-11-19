// src/components/stories/EmptyStates.jsx
import React from 'react';
import { Button } from '../ui/button';
import { BookOpen, Search, PlusCircle } from 'lucide-react';

export const EmptyLibrary = ({ onCreateNew }) => {
  return (
    <div className="text-center py-20">
      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-25" />
      <h3 className="text-lg font-medium mb-2">No stories yet</h3>
      <p className="text-muted-foreground mb-6">Generate your first story to get started</p>
      <Button onClick={onCreateNew}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Create Story
      </Button>
    </div>
  );
};

export const NoSearchResults = ({ onClearFilters }) => {
  return (
    <div className="text-center py-20 border rounded-lg">
      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-25" />
      <h3 className="text-lg font-medium mb-2">No matching stories</h3>
      <p className="text-muted-foreground mb-6">
        Try changing your search or filters
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  );
};