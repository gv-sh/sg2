// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Menu, X, Sliders, Home, Info, Library } from 'lucide-react';
import { ThemeToggle } from '../theme/theme-toggle';
import { Tooltip } from '../ui/tooltip';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const Header = ({ onShowTour }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const menuItems = [
    { name: 'Home', path: '/', icon: <Home className="h-4 w-4 mr-2" /> },
    { name: 'Story Library', path: '/library', icon: <Library className="h-4 w-4 mr-2" /> },
    { name: 'Create Story', path: '/parameters', icon: <Sliders className="h-4 w-4 mr-2" /> },
    { name: 'About', path: '/about', icon: <Info className="h-4 w-4 mr-2" /> },
  ];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center w-full">
          {/* Logo with Tooltip */}
          <Tooltip 
            content="Stories from futures untold" 
            position="right"
          >
            <Link to="/" className="font-medium text-lg text-primary ">
              Futures of Hope
            </Link>
          </Tooltip>
          
          <div className="ml-auto flex items-center">
            <ThemeToggle className="mr-4" />
            
            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Slide-out Menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 top-14 z-40 bg-transparent"
          onClick={closeMenu}
        >
          <div 
            className={cn(
              "absolute top-0 right-0 w-64 h-auto max-h-[calc(100vh-4rem)] overflow-auto",
              "bg-card border rounded-b-lg shadow-lg p-2",
              "transform transition-transform duration-300 ease-in-out",
              "origin-top-right"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center w-full p-2 rounded-md text-sm",
                    location.pathname === item.path 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;