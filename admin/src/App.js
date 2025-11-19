import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Categories from './pages/Categories';
import Parameters from './pages/Parameters';
import Content from './pages/Content';
import Settings from './pages/Settings';
import Database from './pages/Database';
import Generate from './pages/Generate';
import { Layout, Footer } from './components/layout';
import Navbar from './components/ui/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Button } from './components/ui/form-controls';
import config from './config';

function App() {
  const [serverStatus, setServerStatus] = useState('offline');

  // Use ref to hold mutable value that doesn't need re-render
  const configRef = useRef(config);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${configRef.current.API_URL}/api/health/ping`);
        const data = await response.json();

        if (response.ok && data.message === 'pong') {
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
    <Router>
      <div className="flex min-h-screen flex-col">
        <Navbar serverStatus={serverStatus} />
        
        <main className="flex-1 bg-background">
          <Layout>
            <Routes>
              <Route path="/categories" element={<Categories />} />
              <Route path="/parameters" element={<Parameters />} />
              <Route path="/content" element={<Content />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/database" element={<Database />} />
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
                        <Link to="/categories" className="w-full">
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
                        <Link to="/parameters" className="w-full">
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
                        <Link to="/content" className="w-full">
                          <Button variant="default" className="w-full">Manage Content</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mx-auto max-w-md">
                    <Card className="hover:shadow-md transition-shadow border-primary/30">
                      <CardHeader>
                        <CardTitle>Generate New Content</CardTitle>
                        <CardDescription>Create new fiction, images or combined content.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Link to="/generate" className="w-full">
                          <Button variant="default" className="w-full">Generate Content</Button>
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
    </Router>
  );
}

export default App;