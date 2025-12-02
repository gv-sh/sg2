import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Categories from './pages/Categories.js';
import Parameters from './pages/Parameters.js';
import Content from './pages/Content.js';
import Settings from './pages/Settings.js';
import Database from './pages/Database.js';
import { Layout, Footer } from '../shared/components/admin/layout/index.js';
import Navbar from '../shared/components/ui/Navbar.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../shared/components/ui/card.tsx';
import { Button } from '../shared/components/ui/form-controls.js';
import { ToastProvider } from '../shared/contexts/ToastContext.jsx';
import config from './config.js';

function AdminApp() {
  const [serverStatus, setServerStatus] = useState('offline');

  // Use ref to hold mutable value that doesn't need re-render
  const configRef = useRef(config);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${configRef.current.API_URL}/api/system/health`);
        const data = await response.json();

        if (response.ok && data.success === true && data.data.status === 'healthy') {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };

    // Check status immediately
    checkServerStatus();
    
    // Set up interval for periodic checks
    const interval = setInterval(checkServerStatus, 30000);
    
    // Clean up interval when component unmounts
    return () => clearInterval(interval);
  }, []); // Empty dependency array

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar serverStatus={serverStatus} />
        
        <main className="flex-1 bg-background">
          <Layout>
            <Routes>
              <Route path="categories" element={<Categories />} />
              <Route path="parameters" element={<Parameters />} />
              <Route path="content" element={<Content />} />
              <Route path="settings" element={<Settings />} />
              <Route path="database" element={<Database />} />
              <Route path="/" element={
                <div className="space-y-10 py-10">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to SpecGen Admin Dashboard</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Manage your fiction and image generation parameters, content, and settings.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 space-y-0">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Manage fiction categories like Science Fiction, Fantasy, etc.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Link to="/admin/categories" className="w-full">
                          <Button variant="default" className="w-full">Manage Categories</Button>
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle>Parameters</CardTitle>
                        <CardDescription>Configure generation parameters for each category.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Link to="/admin/parameters" className="w-full">
                          <Button variant="default" className="w-full">Manage Parameters</Button>
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle>Content</CardTitle>
                        <CardDescription>View and manage generated fiction and images.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Link to="/admin/content" className="w-full">
                          <Button variant="default" className="w-full">Manage Content</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                  
                </div>
              } />
            </Routes>
          </Layout>
        </main>
        
        <Footer />
      </div>
    </ToastProvider>
  );
}

export default AdminApp;