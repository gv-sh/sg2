// src/components/stories/StoryFilters.jsx
import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, X, Calendar, SortAsc, SortDesc } from 'lucide-react';

const StoryFilters = ({ 
  searchQuery, 
  yearFilter, 
  sortOrder, 
  allYears, 
  onSearchChange, 
  onYearFilterChange, 
  onSortOrderChange, 
  onClearFilters 
}) => {
  const hasFilters = searchQuery || yearFilter;
  
  return (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search stories..."
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-9 w-full"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange({ target: { value: '' } })}
            className="absolute right-1 top-1 h-7 w-7 p-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Year filter */}
        <div className="relative">
          <select
            value={yearFilter}
            onChange={(e) => onYearFilterChange(e.target.value)}
            className="h-9 w-32 rounded-md border border-input bg-background px-3 pr-9 text-sm"
          >
            <option value="">All Years</option>
            {allYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Calendar className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" />
        </div>
        
        {/* Sort order toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === 'newest' ? 'oldest' : 'newest')}
          title={sortOrder === 'newest' ? 'Showing newest first' : 'Showing oldest first'}
        >
          {sortOrder === 'newest' ? (
            <SortDesc className="h-4 w-4 mr-1" />
          ) : (
            <SortAsc className="h-4 w-4 mr-1" />
          )}
          {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </Button>
        
        {/* Clear filters button - only show if filters are active */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default StoryFilters;