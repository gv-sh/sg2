import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

const routes = [
  { path: '/admin/categories', label: 'Categories' },
  { path: '/admin/parameters', label: 'Parameters' },
  { path: '/admin/content', label: 'Content' },
  { path: '/admin/settings', label: 'Settings' },
  { path: '/admin/database', label: 'Database' }
];

function Navbar() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6 w-full">
        <Link to="/admin" className="font-medium text-lg text-primary">
          FOH Behind the Scenes
        </Link>
        
        <nav className="flex items-center space-x-4">
          {routes.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                location.pathname === path 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;