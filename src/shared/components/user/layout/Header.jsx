// src/components/layout/Header.jsx
import React from 'react';
import { Sliders, Home, Info, Library } from 'lucide-react';
import { Tooltip } from '../../ui';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';

const Header = ({ onShowTour }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Home', path: '/', icon: <Home className="h-4 w-4" /> },
    { name: 'Story Library', path: '/library', icon: <Library className="h-4 w-4" /> },
    { name: 'Create Story', path: '/parameters', icon: <Sliders className="h-4 w-4" /> },
    { name: 'About', path: '/about', icon: <Info className="h-4 w-4" /> },
  ];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6 w-full">
        {/* Logo with Tooltip */}
        <Tooltip 
          content="Stories from futures untold" 
          position="right"
        >
          <Link to="/" className="font-medium text-lg text-primary">
            Futures of Hope
          </Link>
        </Tooltip>
        
        {/* Navigation Items */}
        <nav className="flex items-center space-x-4">
            {menuItems.map((item) => (
              <Tooltip key={item.path} content={item.name} position="bottom">
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    location.pathname === item.path 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground"
                  )}
                >
                  <span className="flex items-center">
                    {item.icon}
                    <span className="ml-2 hidden sm:inline">{item.name}</span>
                  </span>
                </Link>
              </Tooltip>
            ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;