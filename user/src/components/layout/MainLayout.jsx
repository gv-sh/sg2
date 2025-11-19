// src/components/layout/MainLayout.jsx
import React from 'react';
import { cn } from '../../lib/utils';
import Header from './Header';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const MainLayout = ({ children, onShowTour, className }) => {
  const location = useLocation();
  
  // Check if we're on the library page or viewing a story
  const useDynamicHeight = location.pathname === '/library' || 
    (location.pathname.includes('/library/') && location.pathname.length > '/library/'.length);
  
  // Add padding when on library-related pages
  const libraryPadding = useDynamicHeight ? 'px-6' : '';
  
  return (
    <div className={cn("min-h-screen bg-background text-foreground flex flex-col", className)}>
      <Header onShowTour={onShowTour} />
      
      <main className={cn("flex-1 pt-14 container", libraryPadding)}>
        <div className={useDynamicHeight 
          ? "min-h-[calc(100vh-theme(spacing.20)-theme(spacing.16))]" 
          : "h-[calc(100vh-theme(spacing.14)-theme(spacing.13))] bg-background"}>
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MainLayout;