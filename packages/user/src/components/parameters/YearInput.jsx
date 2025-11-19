// src/components/parameters/YearInput.jsx
import React from 'react';
import { Button } from '../ui/button';
import { Calendar, Dices } from 'lucide-react';

const YearInput = ({ value, onChange }) => {
  // Default year range from 2050 to 2150
  const minYear = 2050;
  const maxYear = 2150;
  
  // Generate random year in range
  const generateRandomYear = () => {
    const randomYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    onChange(randomYear);
  };
  
  // Use current value or generate default
  const currentYear = value || minYear;
  
  // Function to validate and handle year input
  const handleYearChange = (e) => {
    const inputYear = e.target.value;
    const yearValue = parseInt(inputYear, 10);
    
    if (!isNaN(yearValue) && yearValue >= minYear && yearValue <= maxYear) {
      onChange(yearValue);
    }
  };
  
  return (
    <div className="space-y-2 p-3 bg-muted/40 rounded-md border border-input">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Story Year</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateRandomYear}
          className="h-6 px-2"
          aria-label="Randomize year"
          title="Randomize year"
        >
          <Dices className="h-3 w-3 mr-1" />
          <span className="text-xs">Random</span>
        </Button>
      </div>
      
      <div className="relative w-full max-w-[400px]">
        <input
          type="number"
          value={currentYear}
          onChange={handleYearChange}
          min={minYear}
          max={maxYear}
          placeholder="Enter year (2050-2150)"
          className="w-full h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Enter a year between {minYear} and {maxYear} for your story
        </div>
      </div>
    </div>
  );
};

export default YearInput;