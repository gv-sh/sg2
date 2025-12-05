// src/components/layout/MainLayout.jsx
import React from 'react';
import { cn } from '../../../lib/utils';
import Header from './Header.jsx';
import GlobalFooter from '../../layout/GlobalFooter.jsx';
import { useLocation } from 'react-router-dom';

const MainLayout = ({ children, onShowTour, className }) => {
  const location = useLocation();
  
  // Check if we're on the library page or viewing a story
  const useDynamicHeight = location.pathname === '/library' || 
    (location.pathname.includes('/library/') && location.pathname.length > '/library/'.length);
  
  // Add padding when on library-related pages
  const libraryPadding = useDynamicHeight ? '' : '';
  
  return (
    <div className={cn("min-h-screen bg-background text-foreground flex flex-col", className)}>
      <Header onShowTour={onShowTour} />
      
      <main className={cn("flex-1 pt-14 w-full", useDynamicHeight ? "" : "px-6", libraryPadding)}>
        <div className={useDynamicHeight 
          ? "min-h-[calc(100vh-5rem-4rem)]" 
          : "h-[calc(100vh-3.5rem-3.25rem)] bg-background"}>
          {children}
        </div>
      </main>
      
      <GlobalFooter />
    </div>
  );
};

export default MainLayout;