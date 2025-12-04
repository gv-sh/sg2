import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from './navigation-menu.js';

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
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/admin" className="text-xl font-bold">
            FOH Behind the Scenes
          </Link>
        </div>

        <div className="flex items-center">
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
      </div>
    </header>
  );
}

export default Navbar;