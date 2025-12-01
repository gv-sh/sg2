import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from './navigation-menu.js';
import { Badge } from '#shared/components/ui/badge.jsx';

const routes = [
  { path: '/admin/categories', label: 'Categories' },
  { path: '/admin/parameters', label: 'Parameters' },
  { path: '/admin/content', label: 'Content' },
  { path: '/admin/generate', label: 'Generate' },
  { path: '/admin/settings', label: 'Settings' },
  { path: '/admin/database', label: 'Database' }
];

function Navbar({ serverStatus }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/admin" className="text-xl font-bold">
            Admin Dashboard
          </Link>
          <div className="ml-4">
            <Badge
              variant={serverStatus === 'online'
                ? 'default'
                : serverStatus === 'error'
                ? 'secondary'
                : 'destructive'
              }
            >
              Server: {serverStatus}
              {serverStatus !== 'online' && <span className="ml-1 text-xs">(Configure in Settings)</span>}
            </Badge>
          </div>
        </div>

        <NavigationMenu>
          <NavigationMenuList>
            {routes.map(({ path, label }) => (
              <NavigationMenuItem key={path}>
                <NavigationMenuLink 
                  as={Link} 
                  to={path} 
                  active={location.pathname === path}
                >
                  {label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}

export default Navbar;