// src/components/generation/GenerationControls.jsx
import React from 'react';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';

const GenerationControls = ({ 
  activeStory, 
  generatedContent, 
  onBackToLibrary, 
  storyTitle 
}) => {
  return (
    <nav className="flex mb-4 px-6 pt-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {(activeStory || generatedContent) ? (
          <>
            <li className="inline-flex items-center">
              <Button 
                variant="link" 
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={onBackToLibrary}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Story Library
              </Button>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">
                  {activeStory?.title || storyTitle || "View Story"}
                </span>
              </div>
            </li>
          </>
        ) : (
          // If we're at the library page
          <li className="inline-flex items-center">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium">Story Library</span>
            </div>
          </li>
        )}
      </ol>
    </nav>
  );
};

export default GenerationControls;